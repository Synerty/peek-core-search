import logging
from typing import Dict

from peek_abstract_chunked_index.private.server.client_handlers.ChunkedIndexChunkUpdateHandlerABC import \
    ChunkedIndexChunkUpdateHandlerABC
from peek_abstract_chunked_index.private.tuples.ChunkedIndexEncodedChunkTupleABC import \
    ChunkedIndexEncodedChunkTupleABC
from peek_core_search._private.client.controller.SearchIndexCacheController import \
    clientSearchIndexUpdateFromServerFilt
from peek_core_search._private.storage.EncodedSearchIndexChunk import \
    EncodedSearchIndexChunk

logger = logging.getLogger(__name__)


class ClientSearchIndexChunkUpdateHandler(ChunkedIndexChunkUpdateHandlerABC):
    _ChunkedTuple: ChunkedIndexEncodedChunkTupleABC = EncodedSearchIndexChunk
    _updateFromServerFilt: Dict = clientSearchIndexUpdateFromServerFilt
    _logger: logging.Logger = logger
