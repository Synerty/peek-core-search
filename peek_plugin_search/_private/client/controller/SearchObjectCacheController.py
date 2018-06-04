import logging
from collections import defaultdict
from typing import Dict, List

from twisted.internet.defer import inlineCallbacks

from peek_plugin_search._private.PluginNames import searchFilt
from peek_plugin_search._private.server.client_handlers.ClientChunkLoadRpc import \
    ClientChunkLoadRpc
from peek_plugin_search._private.storage.EncodedSearchObjectChunk import \
    EncodedSearchObjectChunk
from vortex.PayloadEndpoint import PayloadEndpoint
from vortex.PayloadEnvelope import PayloadEnvelope

logger = logging.getLogger(__name__)

clientSearchObjectUpdateFromServerFilt = dict(key="clientSearchObjectUpdateFromServer")
clientSearchObjectUpdateFromServerFilt.update(searchFilt)


class SearchObjectCacheController:
    """ SearchObject Cache Controller

    The SearchObject cache controller stores all the chunks in memory,
    allowing fast access from the mobile and desktop devices.

    """

    LOAD_CHUNK = 50

    def __init__(self, clientId: str):
        self._clientId = clientId
        self._webAppHandler = None

        #: This stores the cache of locationObject data for the clients
        self._cache: Dict[str, EncodedSearchObjectChunk] = {}

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
        self._locationKeysByModelSet = defaultdict(set)

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
        locationObjectTuples: List[EncodedSearchObjectChunk] = paylod.tuples
        self._loadSearchObjectIntoCache(locationObjectTuples)

    def _loadSearchObjectIntoCache(self,
                                  encodedChunkTuples: List[EncodedSearchObjectChunk]):
        chunkKeysUpdated: List[str] = []

        for t in encodedChunkTuples:

            if (not t.chunkKey in self._cache or
                    self._cache[t.chunkKey].lastUpdate != t.lastUpdate):
                self._cache[t.chunkKey] = t
                chunkKeysUpdated.append(t.chunkKey)

        logger.debug("Received locationObject updates from server, %s", chunkKeysUpdated)

        self._webAppHandler.notifyOfSearchObjectUpdate(chunkKeysUpdated)

    def searchObject(self, chunkKey) -> EncodedSearchObjectChunk:
        return self._cache.get(chunkKey)

    def searchObjectKeys(self) -> List[str]:
        return list(self._cache)
