from typing import List

from vortex.Tuple import Tuple, addTupleType, TupleField

from peek_plugin_unified_search._private.PluginNames import unifiedSearchTuplePrefix


@addTupleType
class SearchResultDetailTuple(Tuple):
    """ Search Result Detail Tuple

    This tuple represents the details of a search result.
    """
    __tupleType__ = unifiedSearchTuplePrefix + 'SearchResultDetailTuple'

    #:  The name of the detail
    name: str = TupleField()

    #:  The value of the detail
    value: str = TupleField()
