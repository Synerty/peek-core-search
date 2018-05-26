from vortex.Tuple import addTupleType, TupleField
from vortex.TupleAction import TupleActionABC

from peek_plugin_search._private.PluginNames import searchTuplePrefix


@addTupleType
class AddIntValueActionTuple(TupleActionABC):
    __tupleType__ = searchTuplePrefix + "AddIntValueActionTuple"

    propertyId = TupleField()
    offset = TupleField()
