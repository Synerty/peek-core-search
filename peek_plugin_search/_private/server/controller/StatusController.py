import logging

from twisted.internet.defer import Deferred

from peek_plugin_search._private.tuples.DiagramLoaderStatusTuple import \
    DiagramLoaderStatusTuple
from vortex.TupleAction import TupleActionABC
from vortex.TupleSelector import TupleSelector
from vortex.handler.TupleActionProcessor import TupleActionProcessorDelegateABC
from vortex.handler.TupleDataObservableHandler import TupleDataObservableHandler

logger = logging.getLogger(__name__)


class StatusController(TupleActionProcessorDelegateABC):
    def __init__(self):
        self._status = DiagramLoaderStatusTuple()
        self._tupleObservable = None

    def setTupleObservable(self, tupleObserver: TupleDataObservableHandler):
        self._tupleObserver = tupleObserver

    def shutdown(self):
        self._tupleObserver = None

    def processTupleAction(self, tupleAction: TupleActionABC) -> Deferred:
        # if isinstance(tupleAction, AddIntValueActionTuple):
        #     return self._processAddIntValue(tupleAction)

        raise NotImplementedError(tupleAction.tupleName())

    @property
    def status(self):
        return self._status

    # ---------------
    # Display Compiler Methods

    def setDisplayCompilerStatus(self, state: bool, queueSize: int):
        self._status.displayCompilerQueueStatus = state
        self._status.displayCompilerQueueSize = queueSize
        self._notify()

    def addToDisplayCompilerTotal(self, delta: int):
        self._status.displayCompilerProcessedTotal += delta
        self._notify()

    def setDisplayCompilerError(self, error: str):
        self._status.displayCompilerLastError = error
        self._notify()

    # ---------------
    # Grid Compiler Methods

    def setGridCompilerStatus(self, state: bool, queueSize: int):
        self._status.gridCompilerQueueStatus = state
        self._status.gridCompilerQueueSize = queueSize
        self._notify()

    def addToGridCompilerTotal(self, delta: int):
        self._status.gridCompilerQueueProcessedTotal += delta
        self._notify()

    def setGridCompilerError(self, error: str):
        self._status.gridCompilerQueueLastError = error
        self._notify()

    # ---------------
    # Disp Key Index Compiler Methods

    def setLocationIndexCompilerStatus(self, state: bool, queueSize: int):
        self._status.locationIndexCompilerQueueStatus = state
        self._status.locationIndexCompilerQueueSize = queueSize
        self._notify()

    def addToLocationIndexCompilerTotal(self, delta: int):
        self._status.locationIndexCompilerQueueProcessedTotal += delta
        self._notify()

    def setLocationIndexCompilerError(self, error: str):
        self._status.locationIndexCompilerQueueLastError = error
        self._notify()

    # ---------------
    # Notify Methods

    def _notify(self):
        self._tupleObserver.notifyOfTupleUpdate(
            TupleSelector(DiagramLoaderStatusTuple.tupleType(), {})
        )
