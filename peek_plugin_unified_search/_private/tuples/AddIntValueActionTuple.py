from vortex.Tuple import addTupleType, TupleField
from vortex.TupleAction import TupleActionABC

from peek_plugin_unified_search._private.PluginNames import unifiedSearchTuplePrefix


@addTupleType
class AddIntValueActionTuple(TupleActionABC):
    __tupleType__ = unifiedSearchTuplePrefix + "AddIntValueActionTuple"

    excludedKwId = TupleField()
    offset = TupleField()
