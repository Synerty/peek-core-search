import logging
from collections import defaultdict
from typing import List

from twisted.internet.defer import DeferredList, inlineCallbacks, Deferred

from peek_plugin_search._private.PluginNames import searchFilt
from peek_plugin_search._private.client.controller.SearchIndexCacheController import \
    SearchIndexCacheController
from peek_plugin_search._private.tuples.LocationIndexUpdateDateTuple import \
    LocationIndexUpdateDateTuple, DeviceLocationIndexT
from vortex.DeferUtil import vortexLogFailure
from vortex.Payload import Payload
from vortex.PayloadEndpoint import PayloadEndpoint
from vortex.PayloadEnvelope import PayloadEnvelope
from vortex.VortexABC import SendVortexMsgResponseCallable
from vortex.VortexFactory import VortexFactory

logger = logging.getLogger(__name__)

clientLocationIndexWatchUpdateFromDeviceFilt = {
    'key': "clientLocationIndexWatchUpdateFromDevice"
}
clientLocationIndexWatchUpdateFromDeviceFilt.update(searchFilt)


# ModelSet HANDLER
class SearchIndexCacheHandler(object):
    def __init__(self, locationIndexCacheController: SearchIndexCacheController,
                 clientId: str):
        """ App LocationIndex Handler

        This class handles the custom needs of the desktop/mobile apps observing locationIndexs.

        """
        self._cacheController = locationIndexCacheController
        self._clientId = clientId

        self._epObserve = PayloadEndpoint(
            clientLocationIndexWatchUpdateFromDeviceFilt, self._processObserve
        )

        self._observedModelSetKeyByVortexUuid = {}
        self._observedVortexUuidsByModelSetKey = defaultdict(list)

    def shutdown(self):
        self._epObserve.shutdown()
        self._epObserve = None

    # ---------------
    # Filter out offline vortexes

    def _filterOutOfflineVortexes(self):
        # TODO, Change this to observe offline vortexes
        # This depends on the VortexFactory offline observable implementation.
        # Which is incomplete at this point :-|

        vortexUuids = set(VortexFactory.getRemoteVortexUuids())
        vortexUuidsToRemove = set(
            self._observedModelSetKeyByVortexUuid) - vortexUuids

        if not vortexUuidsToRemove:
            return

        for vortexUuid in vortexUuidsToRemove:
            del self._observedModelSetKeyByVortexUuid[vortexUuid]

        self._rebuildStructs()

    # ---------------
    # Process update from the server

    def notifyOfLocationIndexUpdate(self, locationIndexKeys: List[str]):
        """ Notify of LocationIndex Updates

        This method is called by the client.LocationIndexCacheController when it receives updates
        from the server.

        """
        self._filterOutOfflineVortexes()

        payloadsByVortexUuid = defaultdict(Payload)

        for locationIndexKey in locationIndexKeys:

            locationIndexTuple = self._cacheController.locationIndex(locationIndexKey)
            vortexUuids = self._observedVortexUuidsByModelSetKey.get(
                locationIndexTuple.modelSetKey, [])

            # Queue up the required client notifications
            for vortexUuid in vortexUuids:
                logger.debug("Sending unsolicited locationIndex %s to vortex %s",
                             locationIndexKey, vortexUuid)
                payloadsByVortexUuid[vortexUuid].tuples.append(locationIndexTuple)

        # Send the updates to the clients
        dl = []
        for vortexUuid, payload in list(payloadsByVortexUuid.items()):
            payload.filt = clientLocationIndexWatchUpdateFromDeviceFilt

            # Serliase in thread, and then send.
            d = payload.makePayloadEnvelopeDefer()
            d.addCallback(lambda payloadEnvelope:payloadEnvelope.toVortexMsgDefer())
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

        updateDatesTuples: LocationIndexUpdateDateTuple = payload.tuples[0]

        self._observedModelSetKeyByVortexUuid[vortexUuid] = payload.filt["modelSetKey"]
        self._rebuildStructs()

        yield self._replyToObserve(payload.filt,
                                   updateDatesTuples.indexBucketUpdateDates,
                                   sendResponse)

    def _rebuildStructs(self) -> None:
        """ Rebuild Structs

        Rebuild the reverse index of uuids by locationIndex key.

        :returns: None
        """
        # Rebuild the other reverse lookup
        newDict = defaultdict(list)

        for vortexUuid, modelSetKey in self._observedModelSetKeyByVortexUuid.items():
            newDict[modelSetKey].append(vortexUuid)

        self._observedVortexUuidsByModelSetKey = newDict

    # ---------------
    # Reply to device observe

    @inlineCallbacks
    def _replyToObserve(self, filt,
                        lastUpdateByLocationIndexKey: DeviceLocationIndexT,
                        sendResponse: SendVortexMsgResponseCallable) -> None:
        """ Reply to Observe

        The client has told us that it's observing a new set of locationIndexs, and the lastUpdate
        it has for each of those locationIndexs. We will send them the locationIndexs that are out of date
        or missing.

        :param filt: The payload filter to respond to.
        :param lastUpdateByLocationIndexKey: The dict of locationIndexKey:lastUpdate
        :param sendResponse: The callable provided by the Vortex (handy)
        :returns: None

        """

        modelSetKey = filt["modelSetKey"]

        locationIndexTuplesToSend = []
        locationIndexKeys = self._cacheController.locationIndexKeys(modelSetKey)

        def sendChunk(locationIndexTuplesToSend):
            if not locationIndexTuplesToSend:
                return

            payload = Payload(filt=filt, tuples=locationIndexTuplesToSend)
            d: Deferred = payload.makePayloadEnvelopeDefer()
            d.addCallback(lambda payloadEnvelope: payloadEnvelope.toVortexMsgDefer())
            d.addCallback(sendResponse)
            d.addErrback(vortexLogFailure, logger, consumeError=True)

        # Check and send any updates
        for locationIndexKey in locationIndexKeys:
            lastUpdate = lastUpdateByLocationIndexKey.get(locationIndexKey)

            # NOTE: lastUpdate can be null.
            encodedLocationIndexTuple = self._cacheController.locationIndex(
                locationIndexKey)
            if not encodedLocationIndexTuple:
                logger.debug("LocationIndex %s is not in the cache" % locationIndexKey)
                continue

            # We are king, If it's it's not our version, it's the wrong version ;-)
            logger.debug("%s, %s,  %s",
                         encodedLocationIndexTuple.lastUpdate == lastUpdate,
                         encodedLocationIndexTuple.lastUpdate, lastUpdate)

            if encodedLocationIndexTuple.lastUpdate == lastUpdate:
                logger.debug("LocationIndex %s matches the cache" % locationIndexKey)
                continue

            locationIndexTuplesToSend.append(encodedLocationIndexTuple)
            logger.debug("Sending locationIndex %s from the cache" % locationIndexKey)

            if len(locationIndexTuplesToSend) == 20:
                sendChunk(locationIndexTuplesToSend)
                locationIndexTuplesToSend = []

        if locationIndexTuplesToSend:
            sendChunk(locationIndexTuplesToSend)

        # Tell the client the initial load is complete.
        finishedFilt = {'finished': True}
        finishedFilt.update(filt)
        vortexMsg = yield PayloadEnvelope(filt=finishedFilt).toVortexMsgDefer()
        yield sendResponse(vortexMsg)
