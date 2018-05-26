from typing import List

from twisted.internet.defer import Deferred

from peek_plugin_search._private.server.controller.MainController import MainController
from peek_plugin_search.server.SearchApiABC import SearchApiABC
from peek_plugin_search.tuples.ImportSearchObjectTuple import ImportSearchObjectTuple


class SearchApi(SearchApiABC):

    def __init__(self, mainController: MainController):
        self._mainController = mainController

    def shutdown(self):
        pass

    def importSearchObjects(self,
                            searchObjects: List[ImportSearchObjectTuple]) -> Deferred:
        pass

    def removeSearchObjects(self, importGroupHashes: List[str]) -> Deferred:
        pass