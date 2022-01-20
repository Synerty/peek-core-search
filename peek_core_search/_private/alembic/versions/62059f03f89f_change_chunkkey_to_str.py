"""change chunkKey to str

Peek Plugin Database Migration Script

Revision ID: 62059f03f89f
Revises: 758f26706069
Create Date: 2022-01-19 22:35:35.594735

"""

# revision identifiers, used by Alembic.
revision = "62059f03f89f"
down_revision = "758f26706069"
branch_labels = None
depends_on = None

import sqlalchemy as sa
from alembic import op


def upgrade():
    tables = (
        "EncodedSearchIndexChunk",
        "SearchObjectCompilerQueue",
        "SearchIndex",
        "EncodedSearchObjectChunk",
        "SearchIndexCompilerQueue",
        "SearchObject",
    )

    for table in tables:
        op.alter_column(
            table,
            "chunkKey",
            type_=sa.String(),
            schema="core_search",
        )


def downgrade():
    raise NotImplementedError()
