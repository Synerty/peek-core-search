import logging
from collections import defaultdict
from typing import Dict, List

from twisted.internet.defer import inlineCallbacks, Deferred

from peek_plugin_search._private.PluginNames import searchFilt
from peek_plugin_search._private.server.client_handlers.ClientSearchChunkLoaderRpc import ClientSearchChunkLoaderRpc
from peek_plugin_search._private.tuples.EncodedLocationIndexTuple import \
    EncodedLocationIndexTuple
from peek_plugin_search._private.tuples.LocationIndexTuple import LocationIndexTuple
from vortex.DeferUtil import vortexLogFailure
from vortex.Payload import Payload
from vortex.PayloadEndpoint import PayloadEndpoint
from vortex.PayloadEnvelope import PayloadEnvelope

logger = logging.getLogger(__name__)

clientLocationIndexUpdateFromServerFilt = dict(key="clientLocationIndexUpdateFromServer")
clientLocationIndexUpdateFromServerFilt.update(searchFilt)


class LocationIndexCacheController:
    """ Disp Key Cache Controller

    The locationIndex cache controller stores all the locationIndexs in memory, allowing fast access from
    the mobile and desktop devices.

    """

    #: This stores the cache of locationIndex data for the clients
    _cache: Dict[str, EncodedLocationIndexTuple] = None

    LOAD_CHUNK = 50

    def __init__(self, clientId: str):
        self._clientId = clientId
        self._cacheHandler = None
        self._cache = {}
        self._locationKeysByModelSet = defaultdict(set)

        self._endpoint = PayloadEndpoint(clientLocationIndexUpdateFromServerFilt,
                                         self._processLocationIndexPayload)

    def setLocationIndexCacheHandler(self, locationIndexCacheHandler):
        self._cacheHandler = locationIndexCacheHandler

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
        self._locationKeysByModelSet = defaultdict(set)

        offset = 0
        while True:
            logger.info("Loading LocationIndex %s to %s" % (offset, offset + self.LOAD_CHUNK))
            locationIndexTuples = yield ClientSearchChunkLoaderRpc.loadLocationIndexes(offset, self.LOAD_CHUNK)
            if not locationIndexTuples:
                break

            updatedTuples = []
            for locationIndexTuple in locationIndexTuples:
                if locationIndexTuple.indexBucket in self._cache:
                    lastUpdate = self._cache[locationIndexTuple.indexBucket].lastUpdate
                    if lastUpdate == locationIndexTuple.lastUpdate:
                        continue
                updatedTuples.append(locationIndexTuple)

            if updatedTuples:
                self._loadLocationIndexIntoCache(updatedTuples)

            offset += self.LOAD_CHUNK

    def _processCoordSetPayload(self, payload: Payload, **kwargs):
        d: Deferred = self.reloadCache()
        d.addErrback(vortexLogFailure, logger, consumeError=True)

    @inlineCallbacks
    def _processLocationIndexPayload(self, payloadEnvelope: PayloadEnvelope, **kwargs):
        paylod = yield payloadEnvelope.decodePayloadDefer()
        locationIndexTuples: List[LocationIndexTuple] = paylod.tuples
        self._loadLocationIndexIntoCache(locationIndexTuples)

    def _loadLocationIndexIntoCache(self, locationIndexTuples: List[LocationIndexTuple]):
        indexBucketsUpdated: List[str] = []

        for t in locationIndexTuples:
            self._locationKeysByModelSet[t.modelSetKey].add(t.indexBucket)

            if (not t.indexBucket in self._cache or
                        self._cache[t.indexBucket].lastUpdate != t.lastUpdate):
                self._cache[t.indexBucket] = t
                indexBucketsUpdated.append(t.indexBucket)

        logger.debug("Received locationIndex updates from server, %s", indexBucketsUpdated)

        self._cacheHandler.notifyOfLocationIndexUpdate(indexBucketsUpdated)

    def locationIndex(self, indexBucket) -> LocationIndexTuple:
        return self._cache.get(indexBucket)

    def locationIndexKeys(self, modelSetKey) -> List[str]:
        return list(self._locationKeysByModelSet[modelSetKey])
