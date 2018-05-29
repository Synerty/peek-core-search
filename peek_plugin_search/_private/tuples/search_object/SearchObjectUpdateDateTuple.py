from typing import Dict

from peek_plugin_search._private.PluginNames import searchTuplePrefix
from vortex.Tuple import addTupleType, TupleField, Tuple


@addTupleType
class SearchObjectUpdateDateTuple(Tuple):
    """ Search Object Update Date Tuple

    This tuple represents the state of the chunks in the cache.
    Each chunkKey has a lastUpdateDate as a string, this is used for offline caching
    all the chunks.
    """
    __tupleType__ = searchTuplePrefix + "SearchObjectUpdateDateTuple"

    initialLoadComplete: bool = TupleField()
    updateDateByChunkKey: Dict[str, str] = TupleField({})
