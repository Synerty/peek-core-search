import logging
from typing import Dict
from typing import List

from twisted.internet.defer import inlineCallbacks

from peek_abstract_chunked_index.private.client.handlers.ACICacheHandlerABC import (
    ACICacheHandlerABC,
)
from peek_abstract_chunked_index.private.tuples.ACIUpdateDateTupleABC import (
    ACIUpdateDateTupleABC,
)
from peek_core_search._private.PluginNames import searchFilt
from peek_core_search._private.client.controller.SearchIndexCacheController import (
    SearchIndexCacheController,
)
from peek_core_search._private.client.controller.SearchIndexCacheController import (
    clientSearchIndexUpdateFromServerFilt,
)
from peek_core_search._private.tuples.search_index.SearchIndexUpdateDateTuple import (
    SearchIndexUpdateDateTuple,
)

logger = logging.getLogger(__name__)

clientSearchIndexWatchUpdateFromDeviceFilt = {
    "key": "clientSearchIndexWatchUpdateFromDevice"
}
clientSearchIndexWatchUpdateFromDeviceFilt.update(searchFilt)


# ModelSet HANDLER
class SearchIndexCacheHandler(ACICacheHandlerABC):
    _UpdateDateTuple: ACIUpdateDateTupleABC = SearchIndexUpdateDateTuple
    _updateFromDeviceFilt: Dict = clientSearchIndexWatchUpdateFromDeviceFilt
    _updateFromLogicFilt: Dict = clientSearchIndexUpdateFromServerFilt
    _logger: logging.Logger = logger

    @inlineCallbacks
    def notifyOfUpdate(self, chunkKeys: List[str]):
        assert isinstance(
            self._cacheController, SearchIndexCacheController
        ), "We expected SearchIndexCacheController"
        yield self._cacheController.notifyFastIndexOfChunkKeysUpdated(chunkKeys)
        yield ACICacheHandlerABC.notifyOfUpdate(self, chunkKeys)
