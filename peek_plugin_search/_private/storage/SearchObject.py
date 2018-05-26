import logging

from peek_plugin_search._private.PluginNames import searchTuplePrefix
from sqlalchemy import Column
from sqlalchemy import Integer, String
from sqlalchemy.sql.schema import Index

from vortex.Tuple import Tuple, addTupleType
from .DeclarativeBase import DeclarativeBase

logger = logging.getLogger(__name__)



@addTupleType
class SearchObject(Tuple, DeclarativeBase):
    __tablename__ = 'SearchObject'
    __tupleType__ = searchTuplePrefix + 'SearchObjectTable'

    id = Column(Integer, primary_key=True, autoincrement=True)

    key = Column(String, nullable=False)

    chunkKey = Column(String, nullable=False)

    detailJson = Column(String, nullable=False)


    __table_args__ = (
        Index("idx_SearchObject_keyWord", key, unique=True),
        Index("idx_SearchObject_chunkKey", chunkKey, unique=False),
    )
