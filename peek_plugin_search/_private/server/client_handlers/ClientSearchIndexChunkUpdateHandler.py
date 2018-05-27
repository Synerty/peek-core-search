import logging
from typing import List, Dict, Optional

from sqlalchemy import select
from twisted.internet.defer import Deferred

from peek_plugin_base.PeekVortexUtil import peekClientName
from peek_plugin_search._private.client.controller.SearchIndexCacheController import \
    clientSearchIndexUpdateFromServerFilt
from peek_plugin_search._private.storage.SearchIndexChunk import SearchIndexChunk
from peek_plugin_search._private.tuples.EncodedSearchIndexChunkTuple import \
    EncodedSearchIndexChunkTuple
from vortex.DeferUtil import vortexLogFailure, deferToThreadWrapWithLogger
from vortex.Payload import Payload
from vortex.VortexFactory import VortexFactory, NoVortexException

logger = logging.getLogger(__name__)


class ClientSearchIndexChunkUpdateHandler:
    """ Client Index Update Controller

    This controller handles sending updates the the client.

    It uses lower level Vortex API

    It does the following a broadcast to all clients:

    1) Sends grid updates to the clients

    2) Sends Lookup updates to the clients

    """

    def __init__(self, dbSessionCreator):
        self._dbSessionCreator = dbSessionCreator

    def shutdown(self):
        pass

    def sendChunks(self, chunkKeys: List[str]) -> None:
        """ Send Location Indexes

        Send grid updates to the client services

        :param chunkKeys: A list of location index buckets that have been updated
        :returns: Nothing
        """

        if not chunkKeys:
            return

        def send(vortexMsg: bytes):
            if vortexMsg:
                VortexFactory.sendVortexMsg(
                    vortexMsg, destVortexName=peekClientName
                )

        d: Deferred = self._serialiseLocationIndexes(chunkKeys)
        d.addCallback(send)
        d.addErrback(self._sendErrback, chunkKeys)

    def _sendErrback(self, failure, indexBucket):

        if failure.check(NoVortexException):
            logger.debug(
                "No clients are online to send the grid to, %s", indexBucket)
            return

        vortexLogFailure(failure, logger)

    @deferToThreadWrapWithLogger(logger)
    def _serialiseLocationIndexes(self, chunkKeys: List[str]) -> Optional[bytes]:

        table = SearchIndexChunk.__table__

        session = self._dbSessionCreator()
        try:
            resultSet = session.execute(
                select([table])
                    .where(table.c.chunkKey.in_(chunkKeys))
            )

            results: List[EncodedSearchIndexChunkTuple] = []
            for row in resultSet:
                chunk = SearchIndexChunk(**row)
                
                results.append(
                    EncodedSearchIndexChunkTuple(
                        chunkKey=chunk.chunkKey,
                        lastUpdate=chunk.lastUpdate,
                        encodedPayload=Payload(tuples=[chunk]).toEncodedPayload()
                    )
                )

            if not results:
                return None

            return (
                Payload(filt=clientSearchIndexUpdateFromServerFilt, tuples=results)
                    .makePayloadEnvelope().toVortexMsg()
            )

        finally:
            session.close()
