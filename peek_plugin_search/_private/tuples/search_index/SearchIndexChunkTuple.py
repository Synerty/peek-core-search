import logging
from typing import Dict

from peek_plugin_search._private.PluginNames import searchTuplePrefix
from vortex.Tuple import Tuple, addTupleType, TupleField

logger = logging.getLogger(__name__)


@addTupleType
class SearchIndexChunkTuple(Tuple):
    __tupleType__ = searchTuplePrefix + 'SearchIndexChunkTuple'

    #:  This is dict of keywords and objectIds str
    # the dict value format is:
    # {
    #    searchPropertyName: [ objectId, objectId, objectId, ... ]
    # }
    # where searchPropertyName = name, type, *
    objectIdsJsonBykeyword: Dict[str, str] = TupleField()
