import json
import logging
from typing import Union, List, Optional

from twisted.internet.defer import Deferred, inlineCallbacks
from vortex.Payload import Payload
from vortex.TupleSelector import TupleSelector
from vortex.handler.TupleDataObservableHandler import TuplesProviderABC

from peek_core_search._private.client.controller.FastKeywordController import \
    FastKeywordController
from peek_core_search._private.client.controller.SearchObjectCacheController import \
    SearchObjectCacheController
from peek_core_search._private.storage.EncodedSearchIndexChunk import \
    EncodedSearchIndexChunk

logger = logging.getLogger(__name__)


class ClientSearchObjectResultTupleProvider(TuplesProviderABC):
    def __init__(self, searchObjectCacheHandler: SearchObjectCacheController,
                 fastKeywordController: FastKeywordController):
        self._fastKeywordController = fastKeywordController
        self._searchObjectCacheHandler = searchObjectCacheHandler

    @inlineCallbacks
    def makeVortexMsg(self, filt: dict,
                      tupleSelector: TupleSelector) -> Union[Deferred, bytes]:
        propertyName: Optional[str] = tupleSelector.selector["propertyName"]
        objectTypeId: Optional[int] = tupleSelector.selector["objectTypeId"]
        keywordsString: str = tupleSelector.selector["keywordsString"]

        foundObjectIds = yield self._fastKeywordController \
            .getObjectIdsForSearchString(searchString=keywordsString,
                                         propertyName=propertyName)

        # GET OBJECTS
        foundObjects = yield self._searchObjectCacheHandler \
            .getObjects(objectTypeId, foundObjectIds)

        # Create the vortex message
        payloadEnvelope = yield Payload(filt, tuples=foundObjects) \
            .makePayloadEnvelopeDefer()
        return (yield payloadEnvelope.toVortexMsgDefer())

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
