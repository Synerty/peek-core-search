import logging
from collections import defaultdict
from typing import Dict, List

from twisted.internet.defer import inlineCallbacks

from peek_plugin_search._private.PluginNames import searchFilt
from peek_plugin_search._private.server.client_handlers.ClientChunkLoadRpc import \
    ClientChunkLoadRpc
from peek_plugin_search._private.tuples.EncodedSearchIndexChunkTuple import \
    EncodedSearchIndexChunkTuple
from vortex.PayloadEndpoint import PayloadEndpoint
from vortex.PayloadEnvelope import PayloadEnvelope

logger = logging.getLogger(__name__)

clientSearchIndexUpdateFromServerFilt = dict(key="clientSearchIndexUpdateFromServer")
clientSearchIndexUpdateFromServerFilt.update(searchFilt)


class SearchIndexCacheController:
    """ SearchIndex Cache Controller

    The SearchIndex cache controller stores all the chunks in memory,
    allowing fast access from the mobile and desktop devices.

    """

    LOAD_CHUNK = 50

    def __init__(self, clientId: str):
        self._clientId = clientId
        self._webAppHandler = None

        #: This stores the cache of locationIndex data for the clients
        self._cache: Dict[str, EncodedSearchIndexChunkTuple] = {}

        self._endpoint = PayloadEndpoint(clientSearchIndexUpdateFromServerFilt,
                                         self._processSearchIndexPayload)

    def setSearchIndexCacheHandler(self, handler):
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
                "Loading SearchIndexChunk %s to %s" % (offset, offset + self.LOAD_CHUNK))
            encodedChunkTuples: List[EncodedSearchIndexChunkTuple] = (
                yield ClientChunkLoadRpc.loadSearchIndexChunks(offset, self.LOAD_CHUNK)
            )

            if not encodedChunkTuples:
                break

            self._loadSearchIndexIntoCache(encodedChunkTuples)

            offset += self.LOAD_CHUNK

    @inlineCallbacks
    def _processSearchIndexPayload(self, payloadEnvelope: PayloadEnvelope, **kwargs):
        paylod = yield payloadEnvelope.decodePayloadDefer()
        locationIndexTuples: List[EncodedSearchIndexChunkTuple] = paylod.tuples
        self._loadSearchIndexIntoCache(locationIndexTuples)

    def _loadSearchIndexIntoCache(self,
                                  encodedChunkTuples: List[EncodedSearchIndexChunkTuple]):
        chunkKeysUpdated: List[str] = []

        for t in encodedChunkTuples:

            if (not t.chunkKey in self._cache or
                    self._cache[t.chunkKey].lastUpdate != t.lastUpdate):
                self._cache[t.chunkKey] = t
                chunkKeysUpdated.append(t.chunkKey)

        logger.debug("Received locationIndex updates from server, %s", chunkKeysUpdated)

        self._webAppHandler.notifyOfSearchIndexUpdate(chunkKeysUpdated)

    def locationIndex(self, chunkKey) -> EncodedSearchIndexChunkTuple:
        return self._cache.get(chunkKey)

    def locationIndexKeys(self) -> List[str]:
        return list(self._cache)
