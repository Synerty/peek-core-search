import logging
from collections import defaultdict
from typing import Dict, List, Optional

import ujson
from twisted.internet.defer import inlineCallbacks
from vortex.DeferUtil import deferToThreadWrapWithLogger
from vortex.Payload import Payload

from peek_core_search._private.PluginNames import searchFilt
from peek_core_search._private.server.client_handlers.ClientChunkLoadRpc import \
    ClientChunkLoadRpc
from peek_core_search._private.storage.EncodedSearchObjectChunk import \
    EncodedSearchObjectChunk
from vortex.PayloadEndpoint import PayloadEndpoint
from vortex.PayloadEnvelope import PayloadEnvelope

from peek_core_search._private.storage.SearchObjectTypeTuple import SearchObjectTypeTuple
from peek_core_search._private.tuples.search_object.SearchResultObjectRouteTuple import \
    SearchResultObjectRouteTuple
from peek_core_search._private.tuples.search_object.SearchResultObjectTuple import \
    SearchResultObjectTuple
from peek_core_search._private.worker.tasks._CalcChunkKey import makeSearchObjectChunkKey

logger = logging.getLogger(__name__)

clientSearchObjectUpdateFromServerFilt = dict(key="clientSearchObjectUpdateFromServer")
clientSearchObjectUpdateFromServerFilt.update(searchFilt)


class SearchObjectCacheController:
    """ SearchObject Cache Controller

    The SearchObject cache controller stores all the chunks in memory,
    allowing fast access from the mobile and desktop devices.

    """

    LOAD_CHUNK = 32

    def __init__(self, clientId: str):
        self._clientId = clientId
        self._webAppHandler = None

        #: This stores the cache of searchObject data for the clients
        self._cache: Dict[int, EncodedSearchObjectChunk] = {}

        self._endpoint = PayloadEndpoint(clientSearchObjectUpdateFromServerFilt,
                                         self._processSearchObjectPayload)

    def setSearchObjectCacheHandler(self, handler):
        self._webAppHandler = handler

    @inlineCallbacks
    def start(self):
        yield self.reloadCache()

    def shutdown(self):
        self._tupleObservable = None

        self._endpoint.shutdown()
        self._endpoint = None

        self._cache = {}

    @inlineCallbacks
    def reloadCache(self):
        self._cache = {}

        offset = 0
        while True:
            logger.info(
                "Loading SearchObjectChunk %s to %s" % (offset, offset + self.LOAD_CHUNK))
            encodedChunkTuples: List[EncodedSearchObjectChunk] = (
                yield ClientChunkLoadRpc.loadSearchObjectChunks(offset, self.LOAD_CHUNK)
            )

            if not encodedChunkTuples:
                break

            self._loadSearchObjectIntoCache(encodedChunkTuples)

            offset += self.LOAD_CHUNK

    @inlineCallbacks
    def _processSearchObjectPayload(self, payloadEnvelope: PayloadEnvelope, **kwargs):
        paylod = yield payloadEnvelope.decodePayloadDefer()
        searchObjectTuples: List[EncodedSearchObjectChunk] = paylod.tuples
        self._loadSearchObjectIntoCache(searchObjectTuples)

    def _loadSearchObjectIntoCache(self,
                                   encodedChunkTuples: List[EncodedSearchObjectChunk]):
        chunkKeysUpdated: List[str] = []

        for t in encodedChunkTuples:

            if (not t.chunkKey in self._cache or
                    self._cache[t.chunkKey].lastUpdate != t.lastUpdate):
                self._cache[t.chunkKey] = t
                chunkKeysUpdated.append(t.chunkKey)

        logger.debug("Received searchObject updates from server, %s", chunkKeysUpdated)

        self._webAppHandler.notifyOfSearchObjectUpdate(chunkKeysUpdated)

    def searchObject(self, chunkKey) -> EncodedSearchObjectChunk:
        return self._cache.get(chunkKey)

    def searchObjectKeys(self) -> List[int]:
        return list(self._cache)

    @deferToThreadWrapWithLogger(logger)
    def getObjects(self, objectTypeId: Optional[int],
                   objectIds: List[int]) -> List[SearchResultObjectTuple]:
        return self.getObjectsBlocking(objectTypeId, objectIds)

    def getObjectsBlocking(self, objectTypeId: Optional[int],
                           objectIds: List[int]) -> List[SearchResultObjectTuple]:

        objectIdsByChunkKey = defaultdict(list)
        for objectId in objectIds:
            objectIdsByChunkKey[makeSearchObjectChunkKey(objectId)].append(objectId)

        foundObjects: List[SearchResultObjectTuple] = []
        for chunkKey, subObjectIds in objectIdsByChunkKey.items():
            foundObjects += self._getObjectsForChunkBlocking(
                chunkKey, objectTypeId, subObjectIds
            )

        return foundObjects

    def _getObjectsForChunkBlocking(self, chunkKey: str,
                                    objectTypeId: Optional[int],
                                    objectIds: List[int]
                                    ) -> List[SearchResultObjectTuple]:

        chunk = self.searchObject(chunkKey)
        if not chunk:
            return []

        objectPropsByIdStr = Payload().fromEncodedPayload(chunk.encodedData).tuples[0]
        objectPropsById = ujson.loads(objectPropsByIdStr)

        foundObjects: List[SearchResultObjectTuple] = []

        for objectId in objectIds:
            if str(objectId) not in objectPropsById:
                logger.warning(
                    "Search object id %s is missing from index, chunkKey %s",
                    objectId, chunkKey
                )
                continue

            # Reconstruct the data
            objectProps: {} = ujson.loads(objectPropsById[str(objectId)])

            # Get out the object type
            thisObjectTypeId = objectProps['_otid_']
            del objectProps['_otid_']

            # If the property is set, then make sure it matches
            if objectTypeId is not None and objectTypeId != thisObjectTypeId:
                continue

            # Get out the routes
            routes: List[List[str]] = objectProps['_r_']
            del objectProps['_r_']

            # Get out the key
            objectKey: str = objectProps['key']
            del objectProps['key']

            # Create the new object
            newObject = SearchResultObjectTuple()
            foundObjects.append(newObject)

            newObject.id = objectId
            newObject.key = objectKey
            newObject.objectType = SearchObjectTypeTuple(id=thisObjectTypeId)
            newObject.properties = objectProps

            for route in routes:
                newRoute = SearchResultObjectRouteTuple()
                newObject.routes.append(newRoute)

                newRoute.title = route[0]
                newRoute.path = route[1]

        return foundObjects
