from vortex.handler.TupleDataObservableHandler import TupleDataObservableHandler

from peek_plugin_search._private.PluginNames import searchFilt
from peek_plugin_search._private.PluginNames import searchObservableName

from .tuple_providers.PropertyTupleProvider import PropertyTupleProvider
from peek_plugin_search._private.storage.SearchPropertyTuple import SearchPropertyTuple


def makeTupleDataObservableHandler(ormSessionCreator):
    """" Make Tuple Data Observable Handler

    This method creates the observable object, registers the tuple providers and then
    returns it.

    :param ormSessionCreator: A function that returns a SQLAlchemy session when called

    :return: An instance of :code:`TupleDataObservableHandler`

    """
    tupleObservable = TupleDataObservableHandler(
                observableName=searchObservableName,
                additionalFilt=searchFilt)

    # Register TupleProviders here
    tupleObservable.addTupleProvider(SearchPropertyTuple.tupleName(),
                                     PropertyTupleProvider(ormSessionCreator))
    return tupleObservable
