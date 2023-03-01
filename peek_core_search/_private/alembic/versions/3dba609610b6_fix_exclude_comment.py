"""fix exclude comment

Peek Plugin Database Migration Script

Revision ID: 3dba609610b6
Revises: e51cdf9b7d4c
Create Date: 2023-03-01 19:20:30.746630

"""

# revision identifiers, used by Alembic.
revision = '3dba609610b6'
down_revision = 'e51cdf9b7d4c'
branch_labels = None
depends_on = None

import sqlalchemy as sa
from alembic import op


def upgrade():
    op.drop_column("ExcludeSearchString", "comment", schema="core_search")

    op.add_column(
        "ExcludeSearchString",
        sa.Column("comment", sa.String(), nullable=True),
        schema="core_search",
    )


def downgrade():
    op.drop_column("ExcludeSearchString", "comment", schema="core_search")

    op.add_column(
        "ExcludeSearchString",
        sa.Column("comment", sa.Integer(), nullable=True),
        schema="core_search",
    )
