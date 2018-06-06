from sqlalchemy import Column
from sqlalchemy import Integer, String
from vortex.Tuple import Tuple, addTupleType

from peek_plugin_search._private.PluginNames import searchTuplePrefix
from peek_plugin_search._private.storage.DeclarativeBase import DeclarativeBase


@addTupleType
class SearchObjectTypeTuple(Tuple, DeclarativeBase):
    __tupleType__ = searchTuplePrefix + 'SearchObjectTypeTuple'
    __tablename__ = 'SearchObjectType'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    title = Column(String, nullable=False)
