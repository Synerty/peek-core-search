from typing import List, Dict

from peek_core_search._private.PluginNames import searchTuplePrefix
from peek_core_search.tuples.ImportSearchObjectRouteTuple import (
    ImportSearchObjectRouteTuple,
)
from vortex.Tuple import Tuple, addTupleType, TupleField


@addTupleType
class ImportSearchObjectTuple(Tuple):
    """Import Search Object

    This tuple is used by other plugins to load objects into the search index.

    """

    __tupleType__ = searchTuplePrefix + "ImportSearchObjectTuple"

    #:  The unique key for this object
    # This key will be indexed as a full keyword, do not include the key in the keywords
    key: str = TupleField()

    #:  The type of this object
    objectType: str = TupleField()

    #:  Full Keywords
    # The keywords to index that allows the user to search by partial keywords
    # The key of the property will match of create a new "SearchProperty"
    fullKeywords: Dict[str, str] = TupleField({})

    #:  Partial Keywords
    # The keywords to index that allows the user to search by partial keywords
    # The key of the property will match of create a new "SearchProperty"
    partialKeywords: Dict[str, str] = TupleField({})

    #:  The color
    routes: List[ImportSearchObjectRouteTuple] = TupleField([])

    def __repr__(self):
        s = ""
        s += f"key={self.key}\n"
        s += f"objectType={self.objectType}\n"

        for key, value in sorted(self.fullKeywords.items(), key=lambda i: i[0]):
            s += f"fullKw.{key}={value}\n"

        for key, value in sorted(
            self.partialKeywords.items(), key=lambda i: i[0]
        ):
            s += f"partialKw.{key}={value}\n"

        for route in sorted(
            self.routes, key=lambda i: i.routeTitle + i.routePath
        ):
            s += f"route.{route.routeTitle}={route.routePath}\n"

        return s
