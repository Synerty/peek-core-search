import logging
from typing import Union

from twisted.internet.defer import Deferred
from vortex.DeferUtil import deferToThreadWrapWithLogger
from vortex.Payload import Payload
from vortex.TupleSelector import TupleSelector
from vortex.handler.TupleDataObservableHandler import TuplesProviderABC

from peek_core_search._private.storage.ExcludeSearchStringTable import (
    ExcludeSearchStringTable,
)
from peek_core_search._private.tuples.ExcludeSearchStringsTuple import (
    ExcludeSearchStringsTuple,
)

logger = logging.getLogger(__name__)


class ExcludeSearchStringsTupleProvider(TuplesProviderABC):
    def __init__(self, ormSessionCreator):
        self._ormSessionCreator = ormSessionCreator

    @deferToThreadWrapWithLogger(logger)
    def makeVortexMsg(
        self, filt: dict, tupleSelector: TupleSelector
    ) -> Union[Deferred, bytes]:
        logger.critical("ExcludeSearchStringsTupleProvider")

        session = self._ormSessionCreator()
        try:
            excludedSearchTerms = [
                o.term.lower()
                for o in session.query(ExcludeSearchStringTable.term).all()
            ]

            tuple_ = ExcludeSearchStringsTuple()
            tuple_.excludedSearchTerms = excludedSearchTerms

            # Create the vortex message
            return (
                Payload(filt, tuples=[tuple_])
                .makePayloadEnvelope()
                .toVortexMsg()
            )

        finally:
            session.close()
