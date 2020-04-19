import logging
from typing import Dict

from peek_abstract_chunked_index.private.server.client_handlers.ChunkedIndexChunkUpdateHandlerABC import \
    ChunkedIndexChunkUpdateHandlerABC
from peek_abstract_chunked_index.private.tuples.ChunkedIndexEncodedChunkTupleABC import \
    ChunkedIndexEncodedChunkTupleABC
from peek_core_search._private.client.controller.SearchObjectCacheController import \
    clientSearchObjectUpdateFromServerFilt
from peek_core_search._private.storage.EncodedSearchObjectChunk import \
    EncodedSearchObjectChunk

logger = logging.getLogger(__name__)


class ClientSearchObjectChunkUpdateHandler(ChunkedIndexChunkUpdateHandlerABC):
    _ChunkedTuple: ChunkedIndexEncodedChunkTupleABC = EncodedSearchObjectChunk
    _updateFromServerFilt: Dict = clientSearchObjectUpdateFromServerFilt
    _logger: logging.Logger = logger
