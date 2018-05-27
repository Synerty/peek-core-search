from datetime import datetime

from peek_plugin_search._private.PluginNames import searchTuplePrefix
from vortex.Tuple import Tuple, addTupleType, TupleField


@addTupleType
class EncodedSearchIndexChunkTuple(Tuple):
    """ Search Result Detail Tuple

    This tuple represents the details of a search result.
    """
    __tupleType__ = searchTuplePrefix + 'EncodedSearchIndexChunkTuple'

    #:  The name of the detail
    chunkKey: str = TupleField()

    #:  The value of the detail
    lastUpdate: datetime = TupleField()

    #:  The encoded payload containing the :code:`SearchIndexChunk`
    encodedPayload: bytes = TupleField()
