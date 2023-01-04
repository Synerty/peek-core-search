import logging

from vortex.Tuple import Tuple
from vortex.rpc.RPC import vortexRPC

from peek_abstract_chunked_index.private.server.client_handlers.ACIChunkLoadRpcABC import (
    ACIChunkLoadRpcABC,
)
from peek_core_search._private.PluginNames import searchFilt
from peek_core_search._private.storage.EncodedSearchIndexChunk import (
    EncodedSearchIndexChunk,
)
from peek_core_search._private.storage.EncodedSearchObjectChunk import (
    EncodedSearchObjectChunk,
)
from peek_core_search._private.tuples.search_index.SearchIndexUpdateDateTuple import (
    SearchIndexUpdateDateTuple,
)
from peek_core_search._private.tuples.search_object.SearchObjectUpdateDateTuple import (
    SearchObjectUpdateDateTuple,
)
from peek_plugin_base.PeekVortexUtil import peekBackendNames
from peek_plugin_base.PeekVortexUtil import peekServerName

logger = logging.getLogger(__name__)


class ClientChunkLoadRpc(ACIChunkLoadRpcABC):
    def makeHandlers(self):
        """Make Handlers

        In this method we start all the RPC handlers
        start() returns an instance of it's self so we can simply yield the result
        of the start method.

        """

        yield self.loadSearchIndexChunks.start(funcSelf=self)
        yield self.loadSearchIndexDelta.start(funcSelf=self)
        yield self.loadSearchObjectChunks.start(funcSelf=self)
        yield self.loadSearchObjectDelta.start(funcSelf=self)
        logger.debug("RPCs started")

    # -------------
    @vortexRPC(
        peekServerName,
        acceptOnlyFromVortex=peekBackendNames,
        timeoutSeconds=120,
        additionalFilt=searchFilt,
        deferToThread=True,
    )
    def loadSearchIndexDelta(self, indexEncodedPayload: bytes) -> bytes:
        return self.ckiChunkIndexDeltaBlocking(
            indexEncodedPayload,
            EncodedSearchIndexChunk,
            SearchIndexUpdateDateTuple,
        )

    # -------------
    @vortexRPC(
        peekServerName,
        acceptOnlyFromVortex=peekBackendNames,
        timeoutSeconds=120,
        additionalFilt=searchFilt,
        deferToThread=True,
    )
    def loadSearchIndexChunks(self, chunkKeys: list[str]) -> list[Tuple]:
        return self.ckiInitialLoadChunksPayloadBlocking(
            chunkKeys, EncodedSearchIndexChunk
        )

    # -------------
    @vortexRPC(
        peekServerName,
        acceptOnlyFromVortex=peekBackendNames,
        timeoutSeconds=120,
        additionalFilt=searchFilt,
        deferToThread=True,
    )
    def loadSearchObjectDelta(self, indexEncodedPayload: bytes) -> bytes:
        return self.ckiChunkIndexDeltaBlocking(
            indexEncodedPayload,
            EncodedSearchObjectChunk,
            SearchObjectUpdateDateTuple,
        )

    # -------------
    @vortexRPC(
        peekServerName,
        acceptOnlyFromVortex=peekBackendNames,
        timeoutSeconds=120,
        additionalFilt=searchFilt,
        deferToThread=True,
    )
    def loadSearchObjectChunks(self, chunkKeys: list[str]) -> list[Tuple]:
        return self.ckiInitialLoadChunksPayloadBlocking(
            chunkKeys, EncodedSearchObjectChunk
        )
