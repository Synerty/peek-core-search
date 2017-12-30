from vortex.handler.TupleActionProcessor import TupleActionProcessor

from peek_plugin_unified_search._private.PluginNames import unifiedSearchFilt
from peek_plugin_unified_search._private.PluginNames import unifiedSearchActionProcessorName
from .controller.MainController import MainController


def makeTupleActionProcessorHandler(mainController: MainController):
    processor = TupleActionProcessor(
        tupleActionProcessorName=unifiedSearchActionProcessorName,
        additionalFilt=unifiedSearchFilt,
        defaultDelegate=mainController)
    return processor
