from sqlalchemy import Column
from sqlalchemy import Integer, String
from vortex.Tuple import Tuple, addTupleType

from peek_plugin_unified_search._private.PluginNames import unifiedSearchTuplePrefix
from peek_plugin_unified_search._private.storage.DeclarativeBase import DeclarativeBase


@addTupleType
class ExcludedKwTuple(Tuple, DeclarativeBase):
    __tupleType__ = unifiedSearchTuplePrefix + 'ExcludedKwTuple'
    __tablename__ = 'ExcludedKwTuple'

    id = Column(Integer, primary_key=True, autoincrement=True)
    string1 = Column(String(50))
    int1 = Column(Integer)