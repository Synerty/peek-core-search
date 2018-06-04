import logging
from typing import Union

from twisted.internet.defer import Deferred

from peek_plugin_search._private.storage.SearchPropertyTuple import SearchPropertyTuple
from vortex.DeferUtil import deferToThreadWrapWithLogger
from vortex.Payload import Payload
from vortex.TupleSelector import TupleSelector
from vortex.handler.TupleDataObservableHandler import TuplesProviderABC

logger = logging.getLogger(__name__)


class SearchPropertyTupleProvider(TuplesProviderABC):
    def __init__(self, ormSessionCreator):
        self._ormSessionCreator = ormSessionCreator

    @deferToThreadWrapWithLogger(logger)
    def makeVortexMsg(self, filt: dict,
                      tupleSelector: TupleSelector) -> Union[Deferred, bytes]:

        session = self._ormSessionCreator()
        try:
            tasks = session.query(SearchPropertyTuple).all()

            # Create the vortex message
            return Payload(filt, tuples=tasks).makePayloadEnvelope().toVortexMsg()

        finally:
            session.close()
