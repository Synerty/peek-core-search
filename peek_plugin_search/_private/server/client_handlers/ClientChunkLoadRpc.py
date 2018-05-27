import logging
from typing import List

from peek_plugin_base.PeekVortexUtil import peekServerName, peekClientName
from peek_plugin_base.storage.DbConnection import DbSessionCreator
from peek_plugin_search._private.PluginNames import searchFilt
from peek_plugin_search._private.storage.SearchIndexChunk import SearchIndexChunk
from peek_plugin_search._private.storage.SearchObjectChunk import SearchObjectChunk
from peek_plugin_search._private.tuples.EncodedSearchIndexChunkTuple import \
    EncodedSearchIndexChunkTuple
from peek_plugin_search._private.tuples.EncodedSearchObjectChunkTuple import \
    EncodedSearchObjectChunkTuple
from vortex.Payload import Payload
from vortex.rpc.RPC import vortexRPC

logger = logging.getLogger(__name__)


class ClientChunkLoadRpc:
    def __init__(self, dbSessionCreator: DbSessionCreator):
        self._dbSessionCreator = dbSessionCreator

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
                              ) -> List[EncodedSearchIndexChunkTuple]:
        """ Update Page Loader Status

        Tell the server of the latest status of the loader

        """
        session = self._dbSessionCreator()
        try:
            chunks = (session
                      .query(SearchIndexChunk)
                      .order_by(SearchIndexChunk.id)
                      .offset(offset)
                      .limit(count)
                      .yield_per(count))

            results: List[EncodedSearchIndexChunkTuple] = []

            for chunk in chunks:
                results.append(
                    EncodedSearchIndexChunkTuple(
                        chunkKey=chunk.chunkKey,
                        lastUpdate=chunk.lastUpdate,
                        encodedPayload=Payload(tuples=[chunk]).toEncodedPayload()
                    )
                )

            return results

        finally:
            session.close()

    # -------------
    @vortexRPC(peekServerName, acceptOnlyFromVortex=peekClientName, timeoutSeconds=60,
               additionalFilt=searchFilt, deferToThread=True)
    def loadSearchObjectChunks(self, offset: int, count: int
                               ) -> List[EncodedSearchObjectChunkTuple]:
        """ Update Page Loader Status

        Tell the server of the latest status of the loader

        """
        session = self._dbSessionCreator()
        try:
            chunks = (session
                      .query(SearchObjectChunk)
                      .order_by(SearchObjectChunk.id)
                      .offset(offset)
                      .limit(count)
                      .yield_per(count))

            results: List[EncodedSearchObjectChunkTuple] = []

            for chunk in chunks:
                results.append(
                    EncodedSearchObjectChunkTuple(
                        chunkKey=chunk.chunkKey,
                        lastUpdate=chunk.lastUpdate,
                        encodedPayload=Payload(tuples=[chunk]).toEncodedPayload()
                    )
                )

            return results

        finally:
            session.close()
