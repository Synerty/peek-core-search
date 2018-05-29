from peek_plugin_search._private.PluginNames import searchTuplePrefix
from vortex.Tuple import addTupleType, TupleField, Tuple


@addTupleType
class AdminStatusTuple(Tuple):
    __tupleType__ = searchTuplePrefix + "AdminStatusTuple"

    searchIndexCompilerQueueStatus: bool = TupleField(False)
    searchIndexCompilerQueueSize: int = TupleField(0)
    searchIndexCompilerQueueProcessedTotal: int = TupleField(0)
    searchIndexCompilerQueueLastError: str = TupleField()


    objectIndexCompilerQueueStatus: bool = TupleField(False)
    objectIndexCompilerQueueSize: int = TupleField(0)
    objectIndexCompilerQueueProcessedTotal: int = TupleField(0)
    objectIndexCompilerQueueLastError: str = TupleField()
