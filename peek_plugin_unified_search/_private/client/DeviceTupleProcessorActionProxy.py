from peek_plugin_base.PeekVortexUtil import peekServerName
from peek_plugin_unified_search._private.PluginNames import unifiedSearchFilt
from peek_plugin_unified_search._private.PluginNames import unifiedSearchActionProcessorName
from vortex.handler.TupleActionProcessorProxy import TupleActionProcessorProxy


def makeTupleActionProcessorProxy():
    return TupleActionProcessorProxy(
                tupleActionProcessorName=unifiedSearchActionProcessorName,
                proxyToVortexName=peekServerName,
                additionalFilt=unifiedSearchFilt)
