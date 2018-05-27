import logging

from sqlalchemy import Column, LargeBinary
from sqlalchemy import Integer, String
from sqlalchemy.sql.schema import Index

from peek_plugin_search._private.PluginNames import searchTuplePrefix
from vortex.Tuple import Tuple, addTupleType
from .DeclarativeBase import DeclarativeBase

logger = logging.getLogger(__name__)


@addTupleType
class SearchObjectChunk(Tuple, DeclarativeBase):
    __tablename__ = 'SearchObjectChunk'
    __tupleType__ = searchTuplePrefix + 'SearchObjectChunkTable'

    id = Column(Integer, primary_key=True, autoincrement=True)

    chunkKey = Column(String, primary_key=True)
    encodedData = Column(LargeBinary, nullable=False)
    encodedHash = Column(String, nullable=False)
    lastUpdate = Column(String, nullable=False)

    __table_args__ = (
        Index("idx_ObjectChunk_chunkKey", chunkKey, unique=True),
    )
