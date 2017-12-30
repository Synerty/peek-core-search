from typing import List

from vortex.Tuple import Tuple, addTupleType, TupleField

from peek_plugin_unified_search._private.PluginNames import unifiedSearchTuplePrefix
from .SearchResultDetailTuple import SearchResultDetailTuple


@addTupleType
class SearchResultOpenHandlerTuple(Tuple):
    """ Search Result Tuple

    This tuple represents a search result
    """
    __tupleType__ = unifiedSearchTuplePrefix + 'SearchResultTuple'

    #:  The key of a registered open handler
    key: str = TupleField()

    #:  The name of the open handler
    name: str = TupleField()

    #:  The description of the open handlers action type
    title: str = TupleField()
