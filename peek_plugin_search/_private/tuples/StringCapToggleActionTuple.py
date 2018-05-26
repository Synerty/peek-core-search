from vortex.Tuple import addTupleType, TupleField
from vortex.TupleAction import TupleActionABC

from peek_plugin_search._private.PluginNames import searchTuplePrefix


@addTupleType
class StringCapToggleActionTuple(TupleActionABC):
    __tupleType__ = searchTuplePrefix + "StringCapToggleActionTuple"

    propertyId = TupleField()
