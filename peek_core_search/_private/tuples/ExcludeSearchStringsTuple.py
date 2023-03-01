from vortex.Tuple import Tuple
from vortex.Tuple import TupleField
from vortex.Tuple import addTupleType

from peek_core_search._private.PluginNames import searchTuplePrefix


@addTupleType
class ExcludeSearchStringsTuple(Tuple):
    __tupleType__ = searchTuplePrefix + "ExcludeSearchStringsTuple"

    excludedPartialSearchTerms: list[str] = TupleField([])
    excludedFullSearchTerms: list[str] = TupleField([])
