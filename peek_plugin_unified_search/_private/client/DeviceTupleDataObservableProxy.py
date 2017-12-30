from peek_plugin_base.PeekVortexUtil import peekServerName
from peek_plugin_unified_search._private.PluginNames import unifiedSearchFilt
from peek_plugin_unified_search._private.PluginNames import unifiedSearchObservableName
from vortex.handler.TupleDataObservableProxyHandler import TupleDataObservableProxyHandler


def makeDeviceTupleDataObservableProxy():
    return TupleDataObservableProxyHandler(observableName=unifiedSearchObservableName,
                                           proxyToVortexName=peekServerName,
                                           additionalFilt=unifiedSearchFilt)
