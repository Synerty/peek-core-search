"""add full exclude terms

Peek Plugin Database Migration Script

Revision ID: 79609b0e25a5
Revises: 3dba609610b6
Create Date: 2023-03-01 23:21:19.427518

"""

# revision identifiers, used by Alembic.
revision = "79609b0e25a5"
down_revision = "3dba609610b6"
branch_labels = None
depends_on = None

import sqlalchemy as sa
from alembic import op


def upgrade():
    op.add_column(
        "ExcludeSearchString",
        sa.Column("partial", sa.Boolean(), nullable=True),
        schema="core_search",
    )

    op.add_column(
        "ExcludeSearchString",
        sa.Column("full", sa.Boolean(), nullable=True),
        schema="core_search",
    )


def downgrade():
    op.drop_column("ExcludeSearchString", "partial", schema="core_search")
    op.drop_column("ExcludeSearchString", "full", schema="core_search")
