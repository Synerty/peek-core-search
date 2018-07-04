"""Increased chunk size

Peek Plugin Database Migration Script

Revision ID: c18d0a2ab678
Revises: 2c6cad1f280e
Create Date: 2018-07-04 21:56:28.319589

"""

# revision identifiers, used by Alembic.
from sqlalchemy import MetaData, Integer, String, Column
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from peek_plugin_search._private.worker.tasks._CalcChunkKey import \
    makeSearchIndexChunkKey, makeSearchObjectChunkKey

revision = 'c18d0a2ab678'
down_revision = '2c6cad1f280e'
branch_labels = None
depends_on = None

from alembic import op

__DeclarativeBase = declarative_base(metadata=MetaData(schema="pl_search"))


class __SearchIndex(__DeclarativeBase):
    __tablename__ = 'SearchIndex'

    id = Column(Integer, primary_key=True, autoincrement=True)

    chunkKey = Column(Integer, nullable=False)
    keyword = Column(String, nullable=False)


class __SearchObject(__DeclarativeBase):
    __tablename__ = 'SearchObject'

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String, nullable=False)
    chunkKey = Column(Integer, nullable=False)


def upgrade():
    bind = op.get_bind()
    session = sessionmaker()(bind=bind)

    for item in session.query(__SearchIndex):
        item.chunkKey = makeSearchIndexChunkKey(item.keyword)

    session.commit()

    for item in session.query(__SearchObject):
        item.chunkKey = makeSearchObjectChunkKey(item.key)

    session.commit()

    session.close()

    op.execute(' TRUNCATE TABLE pl_search."EncodedSearchIndexChunk" ')
    op.execute(' TRUNCATE TABLE pl_search."SearchIndexCompilerQueue" ')

    op.execute('''INSERT INTO pl_search."SearchIndexCompilerQueue"
                            ("chunkKey")
                            SELECT DISTINCT "chunkKey"
                            FROM pl_search."SearchIndex"
                         ''')

    op.execute(' TRUNCATE TABLE pl_search."EncodedSearchObjectChunk" ')
    op.execute(' TRUNCATE TABLE pl_search."SearchObjectCompilerQueue" ')

    op.execute('''INSERT INTO pl_search."SearchObjectCompilerQueue"
                            ("chunkKey")
                            SELECT DISTINCT "chunkKey"
                            FROM pl_search."SearchObject"
                         ''')


def downgrade():
    raise NotImplementedError("Downgrade not implemented")
