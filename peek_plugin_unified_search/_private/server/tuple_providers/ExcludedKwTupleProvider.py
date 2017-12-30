from txhttputil.util.DeferUtil import deferToThreadWrap
from typing import Union

from twisted.internet.defer import Deferred

from vortex.Payload import Payload
from vortex.TupleSelector import TupleSelector
from vortex.handler.TupleDataObservableHandler import TuplesProviderABC

from peek_plugin_unified_search._private.storage.ExcludedKwTuple import ExcludedKwTuple


class ExcludedKwTupleProvider(TuplesProviderABC):
    def __init__(self, ormSessionCreator):
        self._ormSessionCreator = ormSessionCreator

    @deferToThreadWrap
    def makeVortexMsg(self, filt: dict,
                      tupleSelector: TupleSelector) -> Union[Deferred, bytes]:
        # Potential filters can be placed here.
        # val1 = tupleSelector.selector["val1"]

        session = self._ormSessionCreator()
        try:
            tasks = (session.query(ExcludedKwTuple)
                # Potentially filter the results
                # .filter(ExcludedKwTuple.val1 == val1)
                .all()
            )

            # Create the vortex message
            return Payload(filt, tuples=tasks).toVortexMsg()

        finally:
            session.close()
