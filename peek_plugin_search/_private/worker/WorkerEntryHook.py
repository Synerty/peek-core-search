import logging

from peek_plugin_base.worker.PluginWorkerEntryHookABC import PluginWorkerEntryHookABC
from peek_plugin_search._private.worker.tasks import SearchIndexChunkCompilerTask, \
    ImportSearchObjectTask, SearchObjectChunkCompilerTask

logger = logging.getLogger(__name__)


class WorkerEntryHook(PluginWorkerEntryHookABC):
    def load(self):
        logger.debug("loaded")

    def start(self):
        logger.debug("started")

    def stop(self):
        logger.debug("stopped")

    def unload(self):
        logger.debug("unloaded")

    @property
    def celeryAppIncludes(self):
        return [SearchIndexChunkCompilerTask.__name__,
                SearchObjectChunkCompilerTask.__name__,
                ImportSearchObjectTask.__name__]

    @property
    def celeryApp(self):
        from .CeleryApp import celeryApp
        return celeryApp
