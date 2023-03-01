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
        session = self._ormSessionCreator()
        try:
            partials = []
            fulls = []
            for exclude in session.query(ExcludeSearchStringTable):
                if exclude.partial:
                    partials.append(exclude.term)

                if exclude.full:
                    fulls.append(exclude.term)

            tuple_ = ExcludeSearchStringsTuple()
            tuple_.excludedPartialSearchTerms = partials
            tuple_.excludedFullSearchTerms = fulls

            # Create the vortex message
            return (
                Payload(filt, tuples=[tuple_])
                .makePayloadEnvelope()
                .toVortexMsg()
            )

        finally:
            session.close()
