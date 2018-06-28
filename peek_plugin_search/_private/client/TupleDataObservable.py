from peek_plugin_search._private.client.controller.SearchIndexCacheController import \
    SearchIndexCacheController
from peek_plugin_search._private.client.controller.SearchObjectCacheController import \
    SearchObjectCacheController
from peek_plugin_search._private.client.tuple_providers.ClientSearchObjectResultTupleProvider import \
    ClientSearchObjectResultTupleProvider
from peek_plugin_search._private.tuples.search_object.SearchResultObjectTuple import \
    SearchResultObjectTuple
from vortex.handler.TupleDataObservableProxyHandler import TupleDataObservableProxyHandler


def makeClientTupleDataObservableHandler(
        tupleObservable: TupleDataObservableProxyHandler,
        searchIndexCacheHandler: SearchIndexCacheController,
        searchObjectCacheHandler: SearchObjectCacheController):
    """" Make CLIENT Tuple Data Observable Handler

    This method creates the observable object, registers the tuple providers and then
    returns it.

    :param tupleObservable: The tuple observable proxy
    :param searchIndexCacheHandler: The search index cache handler
    :param searchObjectCacheHandler: The search object cache handler
    :return: An instance of :code:`TupleDataObservableHandler`

    """

    tupleObservable.addTupleProvider(
        SearchResultObjectTuple.tupleName(),
        ClientSearchObjectResultTupleProvider(searchIndexCacheHandler,
                                              searchObjectCacheHandler)
    )
