"""add exclude terms

Peek Plugin Database Migration Script

Revision ID: e51cdf9b7d4c
Revises: 62059f03f89f
Create Date: 2023-02-25 19:47:54.955783

"""

# revision identifiers, used by Alembic.
revision = "e51cdf9b7d4c"
down_revision = "62059f03f89f"
branch_labels = None
depends_on = None

import sqlalchemy as sa
from alembic import op


def upgrade():
    op.create_table(
        "ExcludeSearchString",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("term", sa.String(), nullable=False),
        sa.Column("comment", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        schema="core_search",
    )


def downgrade():
    op.drop_table("ExcludeSearchString", schema="core_search")
