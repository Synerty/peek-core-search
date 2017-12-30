from vortex.Tuple import addTupleType, TupleField
from vortex.TupleAction import TupleActionABC

from peek_plugin_unified_search._private.PluginNames import unifiedSearchTuplePrefix


@addTupleType
class StringCapToggleActionTuple(TupleActionABC):
    __tupleType__ = unifiedSearchTuplePrefix + "StringCapToggleActionTuple"

    excludedKwId = TupleField()
