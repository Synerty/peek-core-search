from sqlalchemy import Column, Index, Boolean
from sqlalchemy import Integer, String

from peek_core_search._private.PluginNames import searchTuplePrefix
from peek_core_search._private.storage.DeclarativeBase import DeclarativeBase
from vortex.Tuple import Tuple, addTupleType


@addTupleType
class ExcludeSearchStringTable(Tuple, DeclarativeBase):
    __tupleType__ = searchTuplePrefix + "ExcludeSearchStringTable"
    __tablename__ = "ExcludeSearchString"

    id = Column(Integer, primary_key=True, autoincrement=True)
    term = Column(String, nullable=False)
    partial = Column(Boolean, nullable=True)
    full = Column(Boolean, nullable=True)
    comment = Column(String, nullable=True)
