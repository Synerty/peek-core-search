import json
import logging
from collections import defaultdict
from typing import Union, List, Optional, Dict

from twisted.internet.defer import Deferred

from peek_core_search._private.client.controller.SearchIndexCacheController import \
    SearchIndexCacheController
from peek_core_search._private.client.controller.SearchObjectCacheController import \
    SearchObjectCacheController
from peek_core_search._private.storage.EncodedSearchIndexChunk import \
    EncodedSearchIndexChunk
from peek_core_search._private.storage.EncodedSearchObjectChunk import \
    EncodedSearchObjectChunk
from peek_core_search._private.storage.SearchObjectTypeTuple import \
    SearchObjectTypeTuple
from peek_core_search._private.tuples.search_object.SearchResultObjectRouteTuple import \
    SearchResultObjectRouteTuple
from peek_core_search._private.tuples.search_object.SearchResultObjectTuple import \
    SearchResultObjectTuple
from peek_core_search._private.worker.tasks._CalcChunkKey import makeSearchIndexChunkKey, \
    makeSearchObjectChunkKey
from vortex.DeferUtil import deferToThreadWrapWithLogger
from vortex.Payload import Payload
from vortex.TupleSelector import TupleSelector
from vortex.handler.TupleDataObservableHandler import TuplesProviderABC

logger = logging.getLogger(__name__)


class ClientSearchObjectResultTupleProvider(TuplesProviderABC):
    def __init__(self, searchIndexCacheHandler: SearchIndexCacheController,
                 searchObjectCacheHandler: SearchObjectCacheController):
        self._searchIndexCacheHandler = searchIndexCacheHandler
        self._searchObjectCacheHandler = searchObjectCacheHandler

    @deferToThreadWrapWithLogger(logger)
    def makeVortexMsg(self, filt: dict,
                      tupleSelector: TupleSelector) -> Union[Deferred, bytes]:
        propertyName: Optional[str] = tupleSelector.selector["propertyName"]
        objectTypeId: Optional[int] = tupleSelector.selector["objectTypeId"]
        keywords: List[str] = tupleSelector.selector["keywords"]

        # GET THE OBJECT IDS FROM KEYWORD
        keysByChunkKey = defaultdict(list)
        for keyword in keywords:
            keysByChunkKey[makeSearchIndexChunkKey(keyword)].append(keyword)

        foundObjectIdCounts: Dict[int, int] = defaultdict(lambda: 0)
        for chunkKey, subKeys in keysByChunkKey.items():
            encodedChunk = self._searchIndexCacheHandler.searchIndex(chunkKey)
            if encodedChunk:
                for objId in self._getObjectIds(encodedChunk, propertyName, subKeys):
                    foundObjectIdCounts[objId] += 1

        # Return all the object IDs that have the most keyword matches
        foundObjectIds: List[int] = []
        maxCount = len(keywords)

        for objectId, maxObjectNum in foundObjectIdCounts.items():
            if maxObjectNum == maxCount:
                foundObjectIds.append(objectId)

        # LIMIT TO 20
        foundObjectIds = foundObjectIds[:20]

        # GET OBJECTS
        foundObjects = self._searchObjectCacheHandler \
            .getObjectsBlocking(objectTypeId, foundObjectIds)

        # Create the vortex message
        return Payload(filt, tuples=foundObjects).makePayloadEnvelope().toVortexMsg()

    def _getObjectIds(self, chunk: EncodedSearchIndexChunk,
                      propertyName: Optional[str],
                      keywords: List[str]) -> List[int]:

        chunkData = Payload().fromEncodedPayload(chunk.encodedData).tuples

        indexByKeyword = {item[0]: item for item in chunkData}
        foundObjectIds: List[int] = []

        for keyword in keywords:
            if keyword not in indexByKeyword:
                logger.warning(
                    "Search keyword %s is missing from index, chunkKey %s",
                    keyword, chunk.chunkKey
                )
                continue

            keywordIndex = indexByKeyword[keyword]

            # If the property is set, then make sure it matches
            if propertyName is not None and keywordIndex[1] != propertyName:
                continue

            # This is stored as a string, so we don't have to construct
            # so much data when deserialising the chunk
            foundObjectIds += json.loads(keywordIndex[2])

        return foundObjectIds
