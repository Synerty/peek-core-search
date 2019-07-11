import logging
from typing import Dict, List

from twisted.internet.defer import inlineCallbacks
from vortex.PayloadEndpoint import PayloadEndpoint
from vortex.PayloadEnvelope import PayloadEnvelope

from peek_core_search._private.PluginNames import searchFilt
from peek_core_search._private.server.client_handlers.ClientChunkLoadRpc import \
    ClientChunkLoadRpc
from peek_core_search._private.storage.EncodedSearchIndexChunk import \
    EncodedSearchIndexChunk

logger = logging.getLogger(__name__)

clientSearchIndexUpdateFromServerFilt = dict(key="clientSearchIndexUpdateFromServer")
clientSearchIndexUpdateFromServerFilt.update(searchFilt)


class SearchIndexCacheController:
    """ SearchIndex Cache Controller

    The SearchIndex cache controller stores all the chunks in memory,
    allowing fast access from the mobile and desktop devices.

    """

    LOAD_CHUNK = 32

    def __init__(self, clientId: str):
        self._clientId = clientId
        self._webAppHandler = None
        self._fastKeywordController = None

        #: This stores the cache of searchIndex data for the clients
        self._cache: Dict[int, EncodedSearchIndexChunk] = {}

        self._endpoint = PayloadEndpoint(clientSearchIndexUpdateFromServerFilt,
                                         self._processSearchIndexPayload)

    def setSearchIndexCacheHandler(self, handler):
        self._webAppHandler = handler

    def setFastKeywordController(self, fastKeywordController):
        self._fastKeywordController = fastKeywordController

    @inlineCallbacks
    def start(self):
        yield self.reloadCache()

    def shutdown(self):
        self._webAppHandler = None
        self._fastKeywordController = None
        self._endpoint.shutdown()
        self._endpoint = None

        self._cache = {}

    @inlineCallbacks
    def reloadCache(self):
        self._cache = {}

        offset = 0
        while True:
            logger.info(
                "Loading SearchIndexChunk %s to %s" % (offset, offset + self.LOAD_CHUNK))
            encodedChunkTuples: List[EncodedSearchIndexChunk] = (
                yield ClientChunkLoadRpc.loadSearchIndexChunks(offset, self.LOAD_CHUNK)
            )

            if not encodedChunkTuples:
                break

            self._loadSearchIndexIntoCache(encodedChunkTuples)

            offset += self.LOAD_CHUNK

    @inlineCallbacks
    def _processSearchIndexPayload(self, payloadEnvelope: PayloadEnvelope, **kwargs):
        paylod = yield payloadEnvelope.decodePayloadDefer()
        searchIndexTuples: List[EncodedSearchIndexChunk] = paylod.tuples
        self._loadSearchIndexIntoCache(searchIndexTuples)

    def _loadSearchIndexIntoCache(self,
                                  encodedChunkTuples: List[EncodedSearchIndexChunk]):
        chunkKeysUpdated: List[str] = []

        for t in encodedChunkTuples:

            if (not t.chunkKey in self._cache or
                    self._cache[t.chunkKey].lastUpdate != t.lastUpdate):
                self._cache[t.chunkKey] = t
                chunkKeysUpdated.append(t.chunkKey)

        logger.debug("Received searchIndex updates from server, %s", chunkKeysUpdated)

        self._webAppHandler.notifyOfSearchIndexUpdate(chunkKeysUpdated)
        self._fastKeywordController.notifyOfSearchIndexUpdate(chunkKeysUpdated)

    def searchIndex(self, chunkKey) -> EncodedSearchIndexChunk:
        return self._cache.get(chunkKey)

    def searchIndexKeys(self) -> List[int]:
        return list(self._cache)
