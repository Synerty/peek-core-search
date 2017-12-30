from vortex.handler.TupleDataObservableHandler import TupleDataObservableHandler

from peek_plugin_unified_search._private.PluginNames import unifiedSearchFilt
from peek_plugin_unified_search._private.PluginNames import unifiedSearchObservableName

from .tuple_providers.ExcludedKwTupleProvider import ExcludedKwTupleProvider
from peek_plugin_unified_search._private.storage.ExcludedKwTuple import ExcludedKwTuple


def makeTupleDataObservableHandler(ormSessionCreator):
    """" Make Tuple Data Observable Handler

    This method creates the observable object, registers the tuple providers and then
    returns it.

    :param ormSessionCreator: A function that returns a SQLAlchemy session when called

    :return: An instance of :code:`TupleDataObservableHandler`

    """
    tupleObservable = TupleDataObservableHandler(
                observableName=unifiedSearchObservableName,
                additionalFilt=unifiedSearchFilt)

    # Register TupleProviders here
    tupleObservable.addTupleProvider(ExcludedKwTuple.tupleName(),
                                     ExcludedKwTupleProvider(ormSessionCreator))
    return tupleObservable
