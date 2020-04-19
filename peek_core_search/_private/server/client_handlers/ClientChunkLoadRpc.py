import logging
from typing import List

from peek_abstract_chunked_index.private.server.client_handlers.ChunkedIndexChunkLoadRpcABC import \
    ChunkedIndexChunkLoadRpcABC
from peek_plugin_base.PeekVortexUtil import peekServerName, peekClientName
from peek_plugin_base.storage.DbConnection import DbSessionCreator
from peek_core_search._private.PluginNames import searchFilt
from peek_core_search._private.storage.EncodedSearchIndexChunk import \
    EncodedSearchIndexChunk
from peek_core_search._private.storage.EncodedSearchObjectChunk import \
    EncodedSearchObjectChunk
from vortex.rpc.RPC import vortexRPC

logger = logging.getLogger(__name__)


class ClientChunkLoadRpc(ChunkedIndexChunkLoadRpcABC):

    def makeHandlers(self):
        """ Make Handlers

        In this method we start all the RPC handlers
        start() returns an instance of it's self so we can simply yield the result
        of the start method.

        """

        yield self.loadSearchIndexChunks.start(funcSelf=self)
        yield self.loadSearchObjectChunks.start(funcSelf=self)
        logger.debug("RPCs started")

    # -------------
    @vortexRPC(peekServerName, acceptOnlyFromVortex=peekClientName, timeoutSeconds=60,
               additionalFilt=searchFilt, deferToThread=True)
    def loadSearchIndexChunks(self, offset: int, count: int
                              ) -> List[EncodedSearchIndexChunk]:
        """ Update Page Loader Status

        Tell the server of the latest status of the loader

        """
        return self.ckiInitialLoadChunksBlocking(offset, count, EncodedSearchIndexChunk)

    # -------------
    @vortexRPC(peekServerName, acceptOnlyFromVortex=peekClientName, timeoutSeconds=60,
               additionalFilt=searchFilt, deferToThread=True)
    def loadSearchObjectChunks(self, offset: int, count: int
                               ) -> List[EncodedSearchObjectChunk]:
        """ Update Page Loader Status

        Tell the server of the latest status of the loader

        """
        return self.ckiInitialLoadChunksBlocking(offset, count, EncodedSearchObjectChunk)

