from vortex.handler.TupleDataObservableProxyHandler import TupleDataObservableProxyHandler


def makeClientTupleDataObservableHandler(
        tupleObservable: TupleDataObservableProxyHandler):
    """" Make CLIENT Tuple Data Observable Handler

    This method creates the observable object, registers the tuple providers and then
    returns it.

    :param tupleObservable: The tuple observable proxy
    :return: An instance of :code:`TupleDataObservableHandler`

    """


    # tupleObservable.addTupleProvider(ModelCoordSet.tupleName(),
    #                                  ClientCoordSetTupleProvider(coordSetCacheController))
