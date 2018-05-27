"""initial tables

Peek Plugin Database Migration Script

Revision ID: fb19bea990c1
Revises: 
Create Date: 2018-05-26 16:35:28.093710

"""

# revision identifiers, used by Alembic.
revision = 'fb19bea990c1'
down_revision = None
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa
import geoalchemy2


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('ObjectChunk',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('chunkKey', sa.String(), nullable=False),
    sa.Column('encodedData', sa.LargeBinary(), nullable=False),
    sa.Column('encodedHash', sa.String(), nullable=False),
    sa.Column('lastUpdate', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id', 'chunkKey'),
    schema='pl_search'
    )
    op.create_index('idx_ObjectChunk_chunkKey', 'ObjectChunk', ['chunkKey'], unique=True, schema='pl_search')
    op.create_table('SearchChunk',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('chunkKey', sa.String(), nullable=False),
    sa.Column('encodedData', sa.LargeBinary(), nullable=False),
    sa.Column('encodedHash', sa.String(), nullable=False),
    sa.Column('lastUpdate', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id', 'chunkKey'),
    schema='pl_search'
    )
    op.create_index('idx_SearchChunk_chunkKey', 'SearchChunk', ['chunkKey'], unique=True, schema='pl_search')
    op.create_table('SearchIndexCompilerQueue',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('chunkKey', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id', 'chunkKey'),
    schema='pl_search'
    )
    op.create_table('SearchObject',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('key', sa.String(), nullable=False),
    sa.Column('chunkKey', sa.String(), nullable=False),
    sa.Column('detailJson', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    schema='pl_search'
    )
    op.create_index('idx_SearchObject_chunkKey', 'SearchObject', ['chunkKey'], unique=False, schema='pl_search')
    op.create_index('idx_SearchObject_keyWord', 'SearchObject', ['key'], unique=True, schema='pl_search')
    op.create_table('SearchObjectCompilerQueue',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('chunkKey', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id', 'chunkKey'),
    schema='pl_search'
    )
    op.create_table('SearchPropertyTuple',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    schema='pl_search'
    )
    op.create_table('Setting',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    schema='pl_search'
    )
    op.create_table('SearchIndex',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('keyWord', sa.String(), nullable=False),
    sa.Column('searchChunkKey', sa.String(), nullable=False),
    sa.Column('objectId', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['objectId'], ['pl_search.SearchObject.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    schema='pl_search'
    )
    op.create_index('idx_SearchIndex_quick_query', 'SearchIndex', ['keyWord', 'objectId', 'searchChunkKey'], unique=True, schema='pl_search')
    op.create_table('SearchObjectRoute',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('objectId', sa.Integer(), nullable=False),
    sa.Column('importGroupHash', sa.String(), nullable=False),
    sa.Column('routeTitle', sa.String(), nullable=False),
    sa.Column('routePath', sa.String(), nullable=False),
    sa.ForeignKeyConstraint(['objectId'], ['pl_search.SearchObject.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    schema='pl_search'
    )
    op.create_index('idx_ObjectRoute_objectId', 'SearchObjectRoute', ['objectId'], unique=False, schema='pl_search')
    op.create_index('idx_ObjectRoute_routeTitle_importGroupHash', 'SearchObjectRoute', ['importGroupHash'], unique=True, schema='pl_search')
    op.create_index('idx_ObjectRoute_routeTitle_objectId', 'SearchObjectRoute', ['routeTitle', 'objectId'], unique=True, schema='pl_search')
    op.create_table('SettingProperty',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('settingId', sa.Integer(), nullable=False),
    sa.Column('key', sa.String(length=50), nullable=False),
    sa.Column('type', sa.String(length=16), nullable=True),
    sa.Column('int_value', sa.Integer(), nullable=True),
    sa.Column('char_value', sa.String(), nullable=True),
    sa.Column('boolean_value', sa.Boolean(), nullable=True),
    sa.ForeignKeyConstraint(['settingId'], ['pl_search.Setting.id'], ),
    sa.PrimaryKeyConstraint('id'),
    schema='pl_search'
    )
    op.create_index('idx_SettingProperty_settingId', 'SettingProperty', ['settingId'], unique=False, schema='pl_search')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index('idx_SettingProperty_settingId', table_name='SettingProperty', schema='pl_search')
    op.drop_table('SettingProperty', schema='pl_search')
    op.drop_index('idx_ObjectRoute_routeTitle_objectId', table_name='SearchObjectRoute', schema='pl_search')
    op.drop_index('idx_ObjectRoute_routeTitle_importGroupHash', table_name='SearchObjectRoute', schema='pl_search')
    op.drop_index('idx_ObjectRoute_objectId', table_name='SearchObjectRoute', schema='pl_search')
    op.drop_table('SearchObjectRoute', schema='pl_search')
    op.drop_index('idx_SearchIndex_quick_query', table_name='SearchIndex', schema='pl_search')
    op.drop_table('SearchIndex', schema='pl_search')
    op.drop_table('Setting', schema='pl_search')
    op.drop_table('SearchPropertyTuple', schema='pl_search')
    op.drop_table('SearchObjectCompilerQueue', schema='pl_search')
    op.drop_index('idx_SearchObject_keyWord', table_name='SearchObject', schema='pl_search')
    op.drop_index('idx_SearchObject_chunkKey', table_name='SearchObject', schema='pl_search')
    op.drop_table('SearchObject', schema='pl_search')
    op.drop_table('SearchIndexCompilerQueue', schema='pl_search')
    op.drop_index('idx_SearchChunk_chunkKey', table_name='SearchChunk', schema='pl_search')
    op.drop_table('SearchChunk', schema='pl_search')
    op.drop_index('idx_ObjectChunk_chunkKey', table_name='ObjectChunk', schema='pl_search')
    op.drop_table('ObjectChunk', schema='pl_search')
    # ### end Alembic commands ###