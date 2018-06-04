import json
import logging
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

        objectsToIndex, objectIdByKey, chunkKeysForQueue = _insertOrUpdateObjects(
            newSearchObjects)

        _insertObjectRoutes(
            newSearchObjects, objectIdByKey, chunkKeysForQueue
        )

        reindexSearchObject(objectsToIndex)

    except Exception as e:
        logger.info("Retrying import search objects, %s", e)
        raise  # self.retry(exc=e, countdown=3)


def _insertOrUpdateObjects(newSearchObjects: List[ImportSearchObjectTuple]) -> Tuple[
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
        searchPropertiesSet = set()

        objectKeys = [o.key for o in newSearchObjects]
        chunkKeysForQueue = set()

        # Query existing objects
        results = list(conn.execute(select(
            columns=[searchObjectTable.c.id, searchObjectTable.c.key,
                     searchObjectTable.c.chunkKey, searchObjectTable.c.detailJson],
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

        # Work out which objects have been updated or need inserting
        for importObject in newSearchObjects:

            existingObject = foundObjectByKey.get(importObject.key)

            propsWithKey = dict(key=importObject.key)

            if importObject.properties:
                propsWithKey.update(importObject.properties)

                if existingObject and existingObject.detailJson:
                    existingProps = json.loads(existingObject.detailJson)
                    propsWithKey.update(existingProps)

                propsStr = json.dumps(propsWithKey, sort_keys=True)

            else:
                propsStr = None

            if existingObject:
                searchIndexUpdateNeeded = propsStr and existingObject.detailJson != propsStr
                if searchIndexUpdateNeeded:
                    propUpdates.append(dict(b_id=existingObject.id, b_propsStr=propsStr))

            else:
                searchIndexUpdateNeeded = True
                id_ = next(newIdGen)
                existingObject = SearchObject(
                    id=id_,
                    key=importObject.key,
                    detailJson=propsStr,
                    chunkKey=makeChunkKeyFromInt(id_)
                )
                inserts.append(existingObject.tupleToSqlaBulkInsertDict())

            if searchIndexUpdateNeeded:
                searchPropertiesSet.update(importObject.properties)

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
                    .values(detailJson=bindparam('b_propsStr'))
            )
            conn.execute(stmt, propUpdates)

        # Update Properties
        _checkOrInsertSearchProperties(conn, searchPropertiesSet)

        if inserts or propUpdates:
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


def _checkOrInsertSearchProperties(conn, newPropertyNames: Set[str]) -> None:
    """ Check Or Insert Search Properties

    Make sure the search properties exist.

    """
    searchPropertyTable = SearchPropertyTuple.__table__

    # Load the search properties
    results = list(conn.execute(select(
        columns=[searchPropertyTable.c.name]
    )))

    newPropertyNames -= set([o.name for o in results])

    if not newPropertyNames:
        return

    conn.execute(
        searchPropertyTable.insert(),
        [dict(name=v, title=v) for v in newPropertyNames]
    )


def _insertObjectRoutes(newSearchObjects: List[ImportSearchObjectTuple],
                        objectIdByKey: Dict[str, int],
                        chunkKeysForQueue: Set[str]):
    """ Insert Object Routes

    1) Drop all routes with matching importGroupHash

    2) Insert the new routes

    :param newSearchObjects:
    :param objectIdByKey:
    :return:
    """

    searchObjectRoute = SearchObjectRoute.__table__
    objectQueueTable = SearchObjectCompilerQueue.__table__

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

        if chunkKeysForQueue:
            conn.execute(
                objectQueueTable.insert(),
                [dict(chunkKey=v) for v in chunkKeysForQueue]
            )

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
