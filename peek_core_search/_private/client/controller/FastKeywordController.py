""" Fast Graph DB

This module stores a memory resident model of a graph network.

"""
import logging
from collections import defaultdict
from datetime import datetime
from typing import Optional, List, Dict, Tuple

import pytz
import ujson
from twisted.internet.defer import inlineCallbacks, Deferred
from vortex.DeferUtil import deferToThreadWrapWithLogger
from vortex.Payload import Payload
from vortex.TupleAction import TupleActionABC
from vortex.handler.TupleActionProcessor import TupleActionProcessorDelegateABC

from peek_core_search._private.client.controller.SearchIndexCacheController import \
    SearchIndexCacheController
from peek_core_search._private.client.controller.SearchObjectCacheController import \
    SearchObjectCacheController
from peek_core_search._private.storage.EncodedSearchIndexChunk import \
    EncodedSearchIndexChunk
from peek_core_search._private.tuples.KeywordAutoCompleteTupleAction import \
    KeywordAutoCompleteTupleAction
from peek_core_search._private.worker.tasks.ImportSearchIndexTask import _splitKeywords

logger = logging.getLogger(__name__)


class FastKeywordController(TupleActionProcessorDelegateABC):
    def __init__(self, objectCacheController: SearchObjectCacheController,
                 indexCacheController: SearchIndexCacheController):
        self._objectCacheController = objectCacheController
        self._indexCacheController = indexCacheController
        self._keywordsByPropertyKeyByChunkKey: Dict[str, Dict[str, List[str]]] = \
            defaultdict(lambda: defaultdict(list))

    def shutdown(self):
        self._objectCacheController = None
        self._indexCacheController = None
        self._keywordsByPropertyKeyByChunkKey = {}

    @inlineCallbacks
    def processTupleAction(self, tupleAction: TupleActionABC) -> Deferred:
        assert isinstance(tupleAction, KeywordAutoCompleteTupleAction), \
            "Tuple is not a KeywordAutoCompleteTupleAction"

        startTime = datetime.now(pytz.utc)

        objectIds = yield self.getObjectIdsForSearchString(
            tupleAction.searchString, tupleAction.propertyKey
        )

        results = yield self._objectCacheController.getObjects(
            tupleAction.objectTypeId, objectIds
        )

        logger.debug("Completed search for |%s|, returning %s objects, in %s",
                     tupleAction.searchString,
                     len(results), (datetime.now(pytz.utc) - startTime))

        return results

    @deferToThreadWrapWithLogger(logger)
    def getObjectIdsForSearchString(self, searchString: str,
                                    argPropertyKey: Optional[str]) -> Deferred:
        """ Get ObjectIds For Search String

        :rtype List[int]

        """
        splitKws = _splitKeywords(searchString)
        if not splitKws:
            return []

        results = [[] for _ in splitKws]

        for chunkData in self._keywordsByPropertyKeyByChunkKey.values():
            for (propertyKey, keyword), objectIdStr in chunkData.items():
                if argPropertyKey is not None and argPropertyKey != propertyKey:
                    continue

                for index, partialKw in enumerate(splitKws):
                    if partialKw in keyword:
                        results[index] += ujson.loads(objectIdStr)

        objectIdsUnion = set(results[0])
        for objectIds in results[1:]:
            objectIdsUnion &= set(objectIds)

        return list(objectIdsUnion)[:50]

    @inlineCallbacks
    def notifyOfSearchIndexUpdate(self, chunkKeys: List[str]):
        """ Notify of Segment Updates

        This method is called by the client.SearchIndexCacheController when it receives
         updates from the server.

        """
        for chunkKey in chunkKeys:
            encodedChunkTuple = self._indexCacheController.searchIndex(chunkKey)
            yield self._unpackKeywordsFromChunk(encodedChunkTuple)

    @deferToThreadWrapWithLogger(logger)
    def _unpackKeywordsFromChunk(self, chunk: EncodedSearchIndexChunk) -> None:

        chunkDataTuples = Payload().fromEncodedPayload(chunk.encodedData).tuples

        chunkData: Dict[Tuple[str, str], str] = {}

        for data in chunkDataTuples:
            keyword = data[EncodedSearchIndexChunk.ENCODED_DATA_KEYWORD_NUM]
            propertyName = data[EncodedSearchIndexChunk.ENCODED_DATA_PROPERTY_MAME_NUM]
            objectIdsJson = data[
                EncodedSearchIndexChunk.ENCODED_DATA_OBJECT_IDS_JSON_INDEX]
            chunkData[(propertyName, keyword)] = objectIdsJson

        self._keywordsByPropertyKeyByChunkKey[chunk.chunkKey] = chunkData
