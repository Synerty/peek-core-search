import logging

from vortex.TupleSelector import TupleSelector
from vortex.handler.TupleDataObservableHandler import TupleDataObservableHandler
from vortex.sqla_orm.OrmCrudHandler import OrmCrudHandler
from vortex.sqla_orm.OrmCrudHandler import OrmCrudHandlerExtension

from peek_core_search._private.PluginNames import searchFilt
from peek_core_search._private.storage.ExcludeSearchStringTable import (
    ExcludeSearchStringTable,
)
from peek_core_search._private.tuples.ExcludeSearchStringsTuple import (
    ExcludeSearchStringsTuple,
)

logger = logging.getLogger(__name__)

# This dict matches the definition in the Admin angular app.
filtKey = {"key": "admin.Edit.ExcludeSearchStringTableHandler"}
filtKey.update(searchFilt)


# This is the CRUD hander
class __CrudHandler(OrmCrudHandler):
    pass


class __ExtUpdateObservable(OrmCrudHandlerExtension):
    """Update Observable ORM Crud Extension

    This extension is called after events that will alter data,
    it then notifies the observer.

    """

    def __init__(self, tupleDataObserver: TupleDataObservableHandler):
        self._tupleDataObserver = tupleDataObserver

    def _tellObserver(self, tuple_, tuples, session, payloadFilt):
        self._tupleDataObserver.notifyOfTupleUpdate(
            TupleSelector(ExcludeSearchStringsTuple.tupleName(), {})
        )
        return True

    afterUpdateCommit = _tellObserver
    afterDeleteCommit = _tellObserver


# This method creates an instance of the handler class.
def makeExcludeSearchStringTableHandler(tupleObservable, dbSessionCreator):
    handler = __CrudHandler(
        dbSessionCreator, ExcludeSearchStringTable, filtKey, retreiveAll=True
    )

    logger.debug("Started")
    handler.addExtension(
        ExcludeSearchStringTable, __ExtUpdateObservable(tupleObservable)
    )
    return handler
