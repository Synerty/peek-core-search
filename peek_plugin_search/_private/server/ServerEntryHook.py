import logging

from celery import Celery

from peek_plugin_base.server.PluginServerEntryHookABC import PluginServerEntryHookABC
from peek_plugin_base.server.PluginServerStorageEntryHookABC import \
    PluginServerStorageEntryHookABC
from peek_plugin_base.server.PluginServerWorkerEntryHookABC import \
    PluginServerWorkerEntryHookABC
from peek_plugin_search._private.server.api.SearchApi import SearchApi
from peek_plugin_search._private.server.controller.SearchObjectImportController import \
    SearchObjectImportController
from peek_plugin_search._private.storage import DeclarativeBase
from peek_plugin_search._private.storage.DeclarativeBase import loadStorageTuples
from peek_plugin_search._private.tuples import loadPrivateTuples
from peek_plugin_search.tuples import loadPublicTuples
from peek_plugin_search.tuples.ImportSearchObjectRouteTuple import \
    ImportSearchObjectRouteTuple
from peek_plugin_search.tuples.ImportSearchObjectTuple import ImportSearchObjectTuple
from vortex.DeferUtil import vortexLogFailure
from vortex.Payload import Payload
from .TupleActionProcessor import makeTupleActionProcessorHandler
from .TupleDataObservable import makeTupleDataObservableHandler
from .admin_backend import makeAdminBackendHandlers
from .controller.MainController import MainController

logger = logging.getLogger(__name__)


class ServerEntryHook(PluginServerEntryHookABC,
                      PluginServerStorageEntryHookABC,
                      PluginServerWorkerEntryHookABC):
    def __init__(self, *args, **kwargs):
        """" Constructor """
        # Call the base classes constructor
        PluginServerEntryHookABC.__init__(self, *args, **kwargs)

        #: Loaded Objects, This is a list of all objects created when we start
        self._loadedObjects = []

        self._api = None

    def load(self) -> None:
        """ Load

        This will be called when the plugin is loaded, just after the db is migrated.
        Place any custom initialiastion steps here.

        """
        loadStorageTuples()
        loadPrivateTuples()
        loadPublicTuples()
        logger.debug("Loaded")

    @property
    def dbMetadata(self):
        return DeclarativeBase.metadata

    def start(self):
        """ Start

        This will be called when the plugin is loaded, just after the db is migrated.
        Place any custom initialiastion steps here.

        """

        # ----------------
        # Tuple Observable

        tupleObservable = makeTupleDataObservableHandler(self.dbSessionCreator)
        self._loadedObjects.append(tupleObservable)

        # ----------------
        # Admin Handler
        self._loadedObjects.extend(
            makeAdminBackendHandlers(tupleObservable, self.dbSessionCreator)
        )

        # ----------------
        # Main Controller
        mainController = MainController(
            dbSessionCreator=self.dbSessionCreator,
            tupleObservable=tupleObservable)

        self._loadedObjects.append(mainController)

        # ----------------
        # Import Controller
        searchObjectImportController = SearchObjectImportController()
        self._loadedObjects.append(searchObjectImportController)

        # ----------------
        # Setup the Action Processor
        self._loadedObjects.append(makeTupleActionProcessorHandler(mainController))

        # ----------------
        # Setup the APIs
        # Initialise the API object that will be shared with other plugins
        self._api = SearchApi(searchObjectImportController)
        self._loadedObjects.append(self._api)

        # ----------------
        # API test

        searchObjects = []

        so1 = ImportSearchObjectTuple(
            key="so1key",
            properties={
                "name": "134 Ocean Parade, Circuit breaker 1",
                "alias": "SO1ALIAS"
            }
        )
        so1.routes.append(ImportSearchObjectRouteTuple(
            importGroupHash="importHash1",
            routeTitle="SO1 Route1",
            routePath="/route/for/so1"
        ))
        so1.routes.append(ImportSearchObjectRouteTuple(
            importGroupHash="importHash2",
            routeTitle="SO1 Route2",
            routePath="/route/for/so2"
        ))
        searchObjects.append(so1)

        so2 = ImportSearchObjectTuple(
            key="so2key",
            properties={
                "name": "69 Sheep Farmers Rd Sub TX",
                "alias": "SO2ALIAS"
            }
        )
        so2.routes.append(ImportSearchObjectRouteTuple(
            importGroupHash="importHash1",
            routeTitle="SO2 Route1",
            routePath="/route/for/so2/r2"
        ))
        so2.routes.append(ImportSearchObjectRouteTuple(
            importGroupHash="importHash2",
            routeTitle="SO2 Route2",
            routePath="/route/for/so2/r2"
        ))
        searchObjects.append(so2)

        d = Payload(tuples=searchObjects).toEncodedPayloadDefer()
        d.addCallback(self._api.importSearchObjects)
        d.addErrback(vortexLogFailure, logger, consumeError=True)

        logger.debug("Started")

    def stop(self):
        """ Stop

        This method is called by the platform to tell the peek app to shutdown and stop
        everything it's doing
        """
        # Shutdown and dereference all objects we constructed when we started
        while self._loadedObjects:
            self._loadedObjects.pop().shutdown()

        self._api = None

        logger.debug("Stopped")

    def unload(self):
        """Unload

        This method is called after stop is called, to unload any last resources
        before the PLUGIN is unlinked from the platform

        """
        logger.debug("Unloaded")

    @property
    def publishedServerApi(self) -> object:
        """ Published Server API
    
        :return  class that implements the API that can be used by other Plugins on this
        platform service.
        """
        return self._api

    ###### Implement PluginServerWorkerEntryHookABC

    @property
    def celeryApp(self) -> Celery:
        from peek_plugin_search._private.worker.CeleryApp import celeryApp
        return celeryApp
