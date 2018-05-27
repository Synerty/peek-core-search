import logging

from peek_plugin_search._private.PluginNames import searchTuplePrefix
from sqlalchemy import Column
from sqlalchemy import Integer, String
from sqlalchemy.sql.schema import Index, ForeignKey

from vortex.Tuple import Tuple, addTupleType
from .DeclarativeBase import DeclarativeBase

logger = logging.getLogger(__name__)



@addTupleType
class SearchIndex(Tuple, DeclarativeBase):
    __tablename__ = 'SearchIndex'
    __tupleType__ = searchTuplePrefix + 'SearchIndexTable'

    id = Column(Integer, primary_key=True, autoincrement=True)

    keyWord = Column(String, nullable=False)
    searchChunkKey = Column(String, nullable=False)

    #:  The object that this routs is for
    objectId = Column(Integer,
                      ForeignKey('SearchObject.id', ondelete='CASCADE'),
                      nullable=False)

    __table_args__ = (
        Index("idx_SearchIndex_quick_query", keyWord, objectId, searchChunkKey, unique=True),
    )