import json
import logging
from collections import defaultdict
from datetime import datetime
from typing import List, Dict, Tuple, Set

import pytz
from sqlalchemy import select, bindparam
from txcelery.defer import DeferrableTask

from peek_plugin_base.worker import CeleryDbConn
from peek_plugin_search._private.storage.SearchObject import SearchObject
from peek_plugin_search._private.storage.SearchObjectCompilerQueue import \
    SearchObjectCompilerQueue
from peek_plugin_search._private.storage.SearchObjectRoute import SearchObjectRoute
from peek_plugin_search._private.storage.SearchObjectTypeTuple import \
    SearchObjectTypeTuple
from peek_plugin_search._private.storage.SearchPropertyTuple import SearchPropertyTuple
from peek_plugin_search._private.worker.CeleryApp import celeryApp
from peek_plugin_search._private.worker.tasks.ImportSearchIndexTask import \
    ObjectToIndexTuple, reindexSearchObject
from peek_plugin_search._private.worker.tasks._CalcChunkKey import makeChunkKeyFromInt
from peek_plugin_search.tuples.ImportSearchObjectTuple import ImportSearchObjectTuple
from vortex.Payload import Payload

logger = logging.getLogger(__name__)


# We need to insert the into the following tables:
# SearchObject - or update it's details if required
# SearchIndex - The index of the keywords for the object
# SearchObjectRoute - delete old importGroupHash
# SearchObjectRoute - insert the new routes


@DeferrableTask
@celeryApp.task(bind=True)
def removeSearchObjectTask(self, importGroupHashes: List[str]) -> None:
    pass


@DeferrableTask
@celeryApp.task(bind=True)
def importSearchObjectTask(self, searchObjectsEncodedPayload: bytes) -> None:
    try:
        newSearchObjects: List[ImportSearchObjectTuple] = (
            Payload().fromEncodedPayload(searchObjectsEncodedPayload).tuples
        )

        objectTypeIdsByName = _prepareLookups(newSearchObjects)

        objectsToIndex, objectIdByKey, chunkKeysForQueue = _insertOrUpdateObjects(
            newSearchObjects, objectTypeIdsByName
        )

        _insertObjectRoutes(newSearchObjects, objectIdByKey)

        _packObjectJson(newSearchObjects, chunkKeysForQueue)

        reindexSearchObject(objectsToIndex)

    except Exception as e:
        logger.info("Retrying import search objects, %s", e)
        raise  # self.retry(exc=e, countdown=3)


def _prepareLookups(newSearchObjects: List[ImportSearchObjectTuple]) -> Dict[str, int]:
    """ Check Or Insert Search Properties

    Make sure the search properties exist.

    """

    dbSession = CeleryDbConn.getDbSession()

    startTime = datetime.now(pytz.utc)

    try:

        objectTypeNames = set()
        propertyNames = set()

        for o in newSearchObjects:
            if not o.objectType:
                o.objectType = 'None'
            objectTypeNames.add(o.objectType)

            if o.properties:
                propertyNames.update(o.properties)

        # Prepare Properties
        dbProps = dbSession.query(SearchPropertyTuple).all()
        propertyNames -= set([o.name for o in dbProps])

        if propertyNames:
            for newPropName in propertyNames:
                dbSession.add(SearchPropertyTuple(name=newPropName, title=newPropName))

            dbSession.commit()

        del dbProps
        del propertyNames

        # Prepare Object Types
        dbObjectTypes = dbSession.query(SearchObjectTypeTuple).all()
        objectTypeNames -= set([o.name for o in dbObjectTypes])

        if not objectTypeNames:
            objectTypeIdsByName = {o.name: o.id for o in dbObjectTypes}

        else:
            for newPropName in objectTypeNames:
                dbSession.add(SearchObjectTypeTuple(name=newPropName, title=newPropName))

            dbSession.commit()

            dbObjectTypes = dbSession.query(SearchObjectTypeTuple).all()
            objectTypeIdsByName = {o.name: o.id for o in dbObjectTypes}

        logger.debug("Prepared lookups in %s", (datetime.now(pytz.utc) - startTime))

        return objectTypeIdsByName

    except Exception as e:
        dbSession.rollback()
        raise

    finally:
        dbSession.close()


def _insertOrUpdateObjects(newSearchObjects: List[ImportSearchObjectTuple],
                           objectTypeIdsByName: Dict[str, int]) -> Tuple[
    List[ObjectToIndexTuple], Dict[str, int], Set[str]]:
    """ Insert or Update Objects

    1) Find objects and update them
    2) Insert object if the are missing

    """

    searchObjectTable = SearchObject.__table__

    startTime = datetime.now(pytz.utc)

    engine = CeleryDbConn.getDbEngine()
    conn = engine.connect()
    transaction = conn.begin()

    try:
        objectsToIndex: List[ObjectToIndexTuple] = []
        objectIdByKey: Dict[str, int] = {}

        objectKeys = [o.key for o in newSearchObjects]
        chunkKeysForQueue = set()

        # Query existing objects
        results = list(conn.execute(select(
            columns=[searchObjectTable.c.id, searchObjectTable.c.key,
                     searchObjectTable.c.chunkKey, searchObjectTable.c.propertiesJson],
            whereclause=searchObjectTable.c.key.in_(objectKeys)
        )))

        foundObjectByKey = {o.key: o for o in results}
        del results

        # Get the IDs that we need
        newIdGen = CeleryDbConn.prefetchDeclarativeIds(
            SearchObject, len(newSearchObjects) - len(foundObjectByKey)
        )

        # Create state arrays
        inserts = []
        propUpdates = []
        objectTypeUpdates = []

        # Work out which objects have been updated or need inserting
        for importObject in newSearchObjects:

            existingObject = foundObjectByKey.get(importObject.key)
            importObjectTypeId = objectTypeIdsByName[importObject.objectType]

            propsWithKey = dict(key=importObject.key)

            if importObject.properties:
                propsWithKey.update(importObject.properties)

                if existingObject and existingObject.propertiesJson:
                    propsWithKey.update(json.loads(existingObject.propertiesJson))

                propsStr = json.dumps(propsWithKey, sort_keys=True)

            else:
                propsStr = None

            # Work out if we need to update the object type
            if importObject.objectType != 'None' and existingObject:
                objectTypeUpdates.append(
                    dict(b_id=existingObject.id, b_typeId=importObjectTypeId)
                )

            # Work out if we need to update the existing object or create one
            if existingObject:
                searchIndexUpdateNeeded = propsStr and existingObject.propertiesJson != propsStr
                if searchIndexUpdateNeeded:
                    propUpdates.append(dict(b_id=existingObject.id, b_propsStr=propsStr))

            else:
                searchIndexUpdateNeeded = True
                id_ = next(newIdGen)
                existingObject = SearchObject(
                    id=id_,
                    key=importObject.key,
                    objectTypeId=importObjectTypeId,
                    propertiesJson=propsStr,
                    chunkKey=makeChunkKeyFromInt(id_)
                )
                inserts.append(existingObject.tupleToSqlaBulkInsertDict())

            if searchIndexUpdateNeeded:
                objectsToIndex.append(ObjectToIndexTuple(
                    id=existingObject.id,
                    key=existingObject.key,
                    props=propsWithKey
                ))

            objectIdByKey[existingObject.key] = existingObject.id
            chunkKeysForQueue.add(existingObject.chunkKey)

        # Insert the Search Objects
        if inserts:
            conn.execute(searchObjectTable.insert(), inserts)

        if propUpdates:
            stmt = (
                searchObjectTable.update()
                    .where(searchObjectTable.c.id == bindparam('b_id'))
                    .values(propertiesJson=bindparam('b_propsStr'))
            )
            conn.execute(stmt, propUpdates)

        if objectTypeUpdates:
            stmt = (
                searchObjectTable.update()
                    .where(searchObjectTable.c.id == bindparam('b_id'))
                    .values(objectTypeId=bindparam('b_typeId'))
            )
            conn.execute(stmt, objectTypeUpdates)

        if inserts or propUpdates or objectTypeUpdates:
            transaction.commit()
        else:
            transaction.rollback()

        logger.debug("Inserted %s updated %s ObjectToIndexTuple in %s",
                     len(inserts), len(propUpdates),
                     (datetime.now(pytz.utc) - startTime))

        return objectsToIndex, objectIdByKey, chunkKeysForQueue

    except Exception as e:
        transaction.rollback()
        raise


    finally:
        conn.close()


def _insertObjectRoutes(newSearchObjects: List[ImportSearchObjectTuple],
                        objectIdByKey: Dict[str, int]):
    """ Insert Object Routes

    1) Drop all routes with matching importGroupHash

    2) Insert the new routes

    :param newSearchObjects:
    :param objectIdByKey:
    :return:
    """

    searchObjectRoute = SearchObjectRoute.__table__

    startTime = datetime.now(pytz.utc)

    engine = CeleryDbConn.getDbEngine()
    conn = engine.connect()
    transaction = conn.begin()

    try:
        importHashSet = set()
        inserts = []

        for importObject in newSearchObjects:
            for importRoute in importObject.routes:
                importHashSet.add(importRoute.importGroupHash)
                inserts.append(dict(
                    objectId=objectIdByKey[importObject.key],
                    importGroupHash=importRoute.importGroupHash,
                    routeTitle=importRoute.routeTitle,
                    routePath=importRoute.routePath
                ))

        if importHashSet:
            conn.execute(
                searchObjectRoute
                    .delete()
                    .where(searchObjectRoute.c.importGroupHash.in_(list(importHashSet)))
            )

        # Insert the Search Object routes
        if inserts:
            conn.execute(searchObjectRoute.insert(), inserts)

        if importHashSet or inserts:
            transaction.commit()
        else:
            transaction.rollback()

        logger.debug("Inserted %s SearchObjectRoute in %s",
                     len(inserts),
                     (datetime.now(pytz.utc) - startTime))

    except Exception as e:
        transaction.rollback()
        raise


    finally:
        conn.close()


def _packObjectJson(newSearchObjects: List[ImportSearchObjectTuple],
                    chunkKeysForQueue: Set[str]):
    """ Pack Object Json

    1) Create JSON and update object.

    Doing this takes longer to bulk load, but quicker to make incremental changes

    :param newSearchObjects:
    :param chunkKeysForQueue:
    :return:
    """

    searchObjectTable = SearchObject.__table__
    objectQueueTable = SearchObjectCompilerQueue.__table__
    dbSession = CeleryDbConn.getDbSession()

    startTime = datetime.now(pytz.utc)

    try:

        indexQry = (
            dbSession.query(SearchObject.id, SearchObject.propertiesJson,
                            SearchObject.objectTypeId,
                            SearchObjectRoute.routeTitle, SearchObjectRoute.routePath)
                .join(SearchObjectRoute, SearchObject.id == SearchObjectRoute.objectId)
                .filter(SearchObject.chunkKey.in_([o.key for o in newSearchObjects]))
                .filter(SearchObject.propertiesJson != None)
                .filter(SearchObjectRoute.routePath != None)
                .order_by(SearchObject.id, SearchObjectRoute.routeTitle)
                .yield_per(1000)
                .all()
        )

        # I chose a simple name for this one.
        qryDict = defaultdict(list)

        for item in indexQry:
            (
                qryDict[(item.id, item.propertiesJson, item.objectTypeId)]
                    .append([item.routeTitle, item.routePath])
            )

        packedJsonUpdates = []

        # Sort each bucket by the key
        for (id_, propertiesJson, objectTypeId), routes in qryDict.items():
            props = json.loads(propertiesJson)
            props['_r_'] = routes
            props['_otid_'] = objectTypeId
            packedJson = json.dumps(props, sort_keys=True)
            packedJsonUpdates.append(dict(b_id=id_, b_packedJson=packedJson))

        if packedJsonUpdates:
            stmt = (
                searchObjectTable.update()
                    .where(searchObjectTable.c.id == bindparam('b_id'))
                    .values(packedJson=bindparam('b_packedJson'))
            )
            dbSession.execute(stmt, packedJsonUpdates)

        if chunkKeysForQueue:
            dbSession.execute(
                objectQueueTable.insert(),
                [dict(chunkKey=v) for v in chunkKeysForQueue]
            )

        if packedJsonUpdates or chunkKeysForQueue:
            dbSession.commit()
        else:
            dbSession.rollback()

        logger.debug("Packed JSON for %s SearchObjects",
                     len(newSearchObjects),
                     (datetime.now(pytz.utc) - startTime))

    except Exception as e:
        dbSession.rollback()
        raise


    finally:
        dbSession.close()
