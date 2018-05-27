import logging

from sqlalchemy import Column, LargeBinary
from sqlalchemy import Integer, String
from sqlalchemy.sql.schema import Index

from peek_plugin_search._private.PluginNames import searchTuplePrefix
from vortex.Tuple import Tuple, addTupleType
from .DeclarativeBase import DeclarativeBase

logger = logging.getLogger(__name__)


@addTupleType
class SearchIndexChunk(Tuple, DeclarativeBase):
    __tablename__ = 'SearchIndexChunk'
    __tupleType__ = searchTuplePrefix + 'SearchIndexChunkTable'

    id = Column(Integer, primary_key=True, autoincrement=True)

    chunkKey = Column(String, primary_key=True)
    encodedData = Column(LargeBinary, nullable=False)
    encodedHash = Column(String, nullable=False)
    lastUpdate = Column(String, nullable=False)

    __table_args__ = (
        Index("idx_SearchChunk_chunkKey", chunkKey, unique=True),
    )
