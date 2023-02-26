from vortex.handler.TupleDataObservableHandler import TupleDataObservableHandler
from .EditSearchObjectTypeHandler import makeSearchObjectTypeHandler
from .EditSearchPropertyHandler import makeSearchPropertyHandler
from .ExcludeSearchStringTableHandler import makeExcludeSearchStringTableHandler
from .SettingPropertyHandler import makeSettingPropertyHandler


def makeAdminBackendHandlers(
    tupleObservable: TupleDataObservableHandler, dbSessionCreator
):
    yield makeExcludeSearchStringTableHandler(tupleObservable, dbSessionCreator)
    yield makeSearchPropertyHandler(tupleObservable, dbSessionCreator)
    yield makeSearchObjectTypeHandler(tupleObservable, dbSessionCreator)

    yield makeSettingPropertyHandler(dbSessionCreator)
