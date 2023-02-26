import logging
from typing import Any

from twisted.internet.defer import inlineCallbacks
from txhttputil.site.FileUnderlayResource import FileUnderlayResource
from vortex.handler.TupleDataObservableProxyHandler import (
    TupleDataObservableProxyHandler,
)
from vortex.handler.TupleDataObserverClient import TupleDataObserverClient

from peek_core_search._private.PluginNames import searchFilt
from peek_core_search._private.PluginNames import searchObservableName
from peek_core_search._private.client.DeviceTupleProcessorActionProxy import (
    makeTupleActionProcessorProxy,
)
from peek_core_search._private.client.TupleDataObservable import (
    makeClientTupleDataObservableHandler,
)
from peek_core_search._private.client.controller.FastKeywordController import (
    FastKeywordController,
)
from peek_core_search._private.client.controller.SearchIndexCacheController import (
    SearchIndexCacheController,
)
from peek_core_search._private.client.controller.SearchObjectCacheController import (
    SearchObjectCacheController,
)
from peek_core_search._private.client.handlers.SearchIndexCacheHandler import (
    SearchIndexCacheHandler,
)
from peek_core_search._private.client.handlers.SearchObjectCacheHandler import (
    SearchObjectCacheHandler,
)
from peek_core_search._private.storage.DeclarativeBase import loadStorageTuples
from peek_core_search._private.tuples import loadPrivateTuples
from peek_core_search.tuples import loadPublicTuples
from peek_plugin_base.PeekVortexUtil import peekServerName
from peek_plugin_base.client.PluginClientEntryHookABC import (
    PluginClientEntryHookABC,
)

logger = logging.getLogger(__name__)


class ClientEntryHook(PluginClientEntryHookABC):
    def __init__(self, *args, **kwargs):
        """ " Constructor"""
        # Call the base classes constructor
        PluginClientEntryHookABC.__init__(self, *args, **kwargs)

        #: Loaded Objects, This is a list of all objects created when we start
        self._loadedObjects = []

    @classmethod
    def setupStaticWebResources(cls, platformApi: Any):
        from peek_plugin_base.client.PeekClientPlatformHookABC import (
            PeekClientPlatformHookABC,
        )

        assert isinstance(
            platformApi, PeekClientPlatformHookABC
        ), "We received the wrong platform API"

        from peek_abstract_chunked_index.private.client.controller.ACICacheControllerABC import (
            ACICacheControllerABC,
        )

        relativeDir = ACICacheControllerABC.appDownloadPluginDirRelativeDir()
        dirPath = platformApi.fileStorageDirectory / relativeDir
        dirPath.mkdir(exist_ok=True, parents=True)

        resource = FileUnderlayResource()
        resource.addFileSystemRoot(dirPath)

        platformApi.addFieldResource(relativeDir.encode(), resource)
        platformApi.addOfficeResource(relativeDir.encode(), resource)

    def load(self) -> None:
        """Load

        This will be called when the plugin is loaded, just after the db is migrated.
        Place any custom initialiastion steps here.

        """

        loadStorageTuples()

        loadPrivateTuples()
        loadPublicTuples()

        logger.debug("Loaded")

    @inlineCallbacks
    def start(self):
        """Load

        This will be called when the plugin is loaded, just after the db is migrated.
        Place any custom initialiastion steps here.

        """
        # ----------------

        # Provide the devices access to the servers observable
        tupleDataObservableProxyHandler = TupleDataObservableProxyHandler(
            observableName=searchObservableName,
            proxyToVortexName=peekServerName,
            additionalFilt=searchFilt,
            observerName="Proxy to devices",
        )
        self._loadedObjects.append(tupleDataObservableProxyHandler)

        # ----------------
        #: This is an observer for us (the client) to use to observe data
        # from the server
        serverTupleObserver = TupleDataObserverClient(
            observableName=searchObservableName,
            destVortexName=peekServerName,
            additionalFilt=searchFilt,
            observerName="Data for client",
        )
        self._loadedObjects.append(serverTupleObserver)

        # ----------------
        # Search Index Cache Controller

        searchIndexCacheController = SearchIndexCacheController(
            self.platform.serviceId, self.platform.fileStorageDirectory
        )
        self._loadedObjects.append(searchIndexCacheController)

        # This is the custom handler for the client
        searchIndexCacheHandler = SearchIndexCacheHandler(
            cacheController=searchIndexCacheController,
            clientId=self.platform.serviceId,
        )
        self._loadedObjects.append(searchIndexCacheHandler)

        searchIndexCacheController.setCacheHandler(searchIndexCacheHandler)

        # ----------------
        # Search Object Cache Controller

        searchObjectCacheController = SearchObjectCacheController(
            self.platform.serviceId, self.platform.fileStorageDirectory
        )
        self._loadedObjects.append(searchObjectCacheController)

        # This is the custom handler for the client
        searchObjectCacheHandler = SearchObjectCacheHandler(
            cacheController=searchObjectCacheController,
            clientId=self.platform.serviceId,
        )
        self._loadedObjects.append(searchObjectCacheHandler)

        searchObjectCacheController.setCacheHandler(searchObjectCacheHandler)

        # ----------------
        # Fast Keyword Controller

        fastKeywordController = FastKeywordController(
            searchObjectCacheController,
            searchIndexCacheController,
            serverTupleObserver,
        )
        self._loadedObjects.append(fastKeywordController)

        searchIndexCacheController.setFastKeywordController(
            fastKeywordController
        )

        # ----------------
        # Proxy actions back to the server, we don't process them at all
        tupleActionHandler = makeTupleActionProcessorProxy(
            fastKeywordController
        )
        self._loadedObjects.append(tupleActionHandler)

        # ----------------
        # Create the Tuple Observer
        makeClientTupleDataObservableHandler(
            tupleDataObservableProxyHandler,
            searchIndexCacheController,
            searchObjectCacheController,
        )

        # ----------------
        yield searchIndexCacheHandler.start()
        yield searchIndexCacheController.start()

        yield searchObjectCacheHandler.start()
        yield searchObjectCacheController.start()

        logger.debug("Started")

    def stop(self):
        """Stop

        This method is called by the platform to tell the peek app to shutdown and stop
        everything it's doing
        """
        # Shutdown and dereference all objects we constructed when we started
        while self._loadedObjects:
            self._loadedObjects.pop().shutdown()

        logger.debug("Stopped")

    def unload(self):
        """Unload

        This method is called after stop is called, to unload any last resources
        before the PLUGIN is unlinked from the platform

        """
        logger.debug("Unloaded")
