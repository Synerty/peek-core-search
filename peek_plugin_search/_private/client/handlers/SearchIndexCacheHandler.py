import logging
from collections import defaultdict
from typing import List, Dict

from peek_plugin_search._private.tuples.search_index.SearchIndexUpdateDateTuple import \
    SearchIndexUpdateDateTuple
from twisted.internet.defer import DeferredList, inlineCallbacks, Deferred
from vortex.DeferUtil import vortexLogFailure
from vortex.Payload import Payload
from vortex.PayloadEndpoint import PayloadEndpoint
from vortex.PayloadEnvelope import PayloadEnvelope
from vortex.VortexABC import SendVortexMsgResponseCallable
from vortex.VortexFactory import VortexFactory

from peek_plugin_search._private.PluginNames import searchFilt
from peek_plugin_search._private.client.controller.SearchIndexCacheController import \
    SearchIndexCacheController

logger = logging.getLogger(__name__)

clientSearchIndexWatchUpdateFromDeviceFilt = {
    'key': "clientSearchIndexWatchUpdateFromDevice"
}
clientSearchIndexWatchUpdateFromDeviceFilt.update(searchFilt)


# ModelSet HANDLER
class SearchIndexCacheHandler(object):
    def __init__(self, cacheController: SearchIndexCacheController,
                 clientId: str):
        """ App SearchIndex Handler

        This class handles the custom needs of the desktop/mobile apps observing searchIndexs.

        """
        self._cacheController = cacheController
        self._clientId = clientId

        self._epObserve = PayloadEndpoint(
            clientSearchIndexWatchUpdateFromDeviceFilt, self._processObserve
        )

        self._uuidsObserving = set()

    def shutdown(self):
        self._epObserve.shutdown()
        self._epObserve = None

    # ---------------
    # Process update from the server

    def notifyOfSearchIndexUpdate(self, chunkKeys: List[str]):
        """ Notify of SearchIndex Updates

        This method is called by the client.SearchIndexCacheController when it receives updates
        from the server.

        """
        vortexUuids = set(VortexFactory.getRemoteVortexUuids()) & self._uuidsObserving
        self._uuidsObserving = vortexUuids

        payloadsByVortexUuid = defaultdict(Payload)

        for chunkKey in chunkKeys:
            encodedSearchIndexChunk = self._cacheController.searchIndex(chunkKey)

            # Queue up the required client notifications
            for vortexUuid in vortexUuids:
                logger.debug("Sending unsolicited searchIndex %s to vortex %s",
                             chunkKey, vortexUuid)
                payloadsByVortexUuid[vortexUuid].tuples.append(encodedSearchIndexChunk)

        # Send the updates to the clients
        dl = []
        for vortexUuid, payload in list(payloadsByVortexUuid.items()):
            payload.filt = clientSearchIndexWatchUpdateFromDeviceFilt

            # Serialise in thread, and then send.
            d = payload.makePayloadEnvelopeDefer()
            d.addCallback(lambda payloadEnvelope: payloadEnvelope.toVortexMsgDefer())
            d.addCallback(VortexFactory.sendVortexMsg, destVortexUuid=vortexUuid)
            dl.append(d)

        # Log the errors, otherwise we don't care about them
        dl = DeferredList(dl, fireOnOneErrback=True)
        dl.addErrback(vortexLogFailure, logger, consumeError=True)

    # ---------------
    # Process observes from the devices
    @inlineCallbacks
    def _processObserve(self, payloadEnvelope: PayloadEnvelope,
                        vortexUuid: str,
                        sendResponse: SendVortexMsgResponseCallable,
                        **kwargs):

        payload = yield payloadEnvelope.decodePayloadDefer()

        updateDatesTuples: SearchIndexUpdateDateTuple = payload.tuples[0]

        self._uuidsObserving.add(vortexUuid)

        yield self._replyToObserve(payload.filt,
                                   updateDatesTuples.indexBucketUpdateDates,
                                   sendResponse)

    # ---------------
    # Reply to device observe

    @inlineCallbacks
    def _replyToObserve(self, filt,
                        lastUpdateBySearchIndexKey: Dict[str, str],
                        sendResponse: SendVortexMsgResponseCallable) -> None:
        """ Reply to Observe

        The client has told us that it's observing a new set of searchIndexs, and the lastUpdate
        it has for each of those searchIndexs. We will send them the searchIndexs that are out of date
        or missing.

        :param filt: The payload filter to respond to.
        :param lastUpdateBySearchIndexKey: The dict of searchIndexKey:lastUpdate
        :param sendResponse: The callable provided by the Vortex (handy)
        :returns: None

        """

        searchIndexTuplesToSend = []
        searchIndexKeys = self._cacheController.searchIndexKeys()

        def sendChunk(searchIndexTuplesToSend):
            if not searchIndexTuplesToSend:
                return

            payload = Payload(filt=filt, tuples=searchIndexTuplesToSend)
            d: Deferred = payload.makePayloadEnvelopeDefer()
            d.addCallback(lambda payloadEnvelope: payloadEnvelope.toVortexMsgDefer())
            d.addCallback(sendResponse)
            d.addErrback(vortexLogFailure, logger, consumeError=True)

        # Check and send any updates
        for searchIndexKey in searchIndexKeys:
            lastUpdate = lastUpdateBySearchIndexKey.get(searchIndexKey)

            # NOTE: lastUpdate can be null.
            encodedSearchIndexTuple = self._cacheController.searchIndex(searchIndexKey)
            if not encodedSearchIndexTuple:
                logger.debug("SearchIndex %s is not in the cache" % searchIndexKey)
                continue

            # We are king, If it's it's not our version, it's the wrong version ;-)
            logger.debug("%s, %s,  %s",
                         encodedSearchIndexTuple.lastUpdate == lastUpdate,
                         encodedSearchIndexTuple.lastUpdate, lastUpdate)

            if encodedSearchIndexTuple.lastUpdate == lastUpdate:
                logger.debug("SearchIndex %s matches the cache" % searchIndexKey)
                continue

            searchIndexTuplesToSend.append(encodedSearchIndexTuple)
            logger.debug("Sending searchIndex %s from the cache" % searchIndexKey)

            if len(searchIndexTuplesToSend) == 200:
                sendChunk(searchIndexTuplesToSend)
                searchIndexTuplesToSend = []

        if searchIndexTuplesToSend:
            sendChunk(searchIndexTuplesToSend)

        # Tell the client the initial load is complete.
        finishedFilt = {'finished': True}
        finishedFilt.update(filt)
        vortexMsg = yield PayloadEnvelope(filt=finishedFilt).toVortexMsgDefer()
        yield sendResponse(vortexMsg)