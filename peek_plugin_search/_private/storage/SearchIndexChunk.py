import logging

from sqlalchemy import Column
from sqlalchemy import Integer, String
from sqlalchemy.sql.schema import Index

from peek_plugin_base.storage.TypeDecorators import PeekLargeBinary
from peek_plugin_search._private.PluginNames import searchTuplePrefix
from vortex.Tuple import Tuple, addTupleType
from .DeclarativeBase import DeclarativeBase

logger = logging.getLogger(__name__)


@addTupleType
class SearchChunk(Tuple, DeclarativeBase):
    __tablename__ = 'SearchChunk'
    __tupleType__ = searchTuplePrefix + 'SearchChunkTable'

    id = Column(Integer, primary_key=True, autoincrement=True)

    chunkKey = Column(String, primary_key=True)
    encodedData = Column(PeekLargeBinary, nullable=False)
    encodedHash = Column(String, nullable=False)
    lastUpdate = Column(String, nullable=False)

    __table_args__ = (
        Index("idx_SearchChunk_chunkKey", chunkKey, unique=True),
    )
