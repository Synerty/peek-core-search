"""added show to prop

Peek Plugin Database Migration Script

Revision ID: 36aeb6eaea5c
Revises: c18d0a2ab678
Create Date: 2019-07-30 21:10:50.837891

"""

# revision identifiers, used by Alembic.
revision = "36aeb6eaea5c"
down_revision = "c18d0a2ab678"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa
import geoalchemy2


def upgrade():
    # ###
    op.add_column(
        "SearchProperty",
        sa.Column("showInHeader", sa.Boolean(), server_default="0", nullable=True),
        schema="core_search",
    )

    op.execute(""" UPDATE "core_search"."SearchProperty" SET "showInHeader" = false """)

    op.alter_column(
        "SearchProperty",
        "showInHeader",
        type_=sa.Boolean(),
        nullable=False,
        schema="core_search",
    )

    # ###
    op.add_column(
        "SearchProperty",
        sa.Column("showOnResult", sa.Boolean(), server_default="1", nullable=True),
        schema="core_search",
    )

    op.execute(""" UPDATE "core_search"."SearchProperty" SET "showOnResult" = true """)

    op.alter_column(
        "SearchProperty",
        "showOnResult",
        type_=sa.Boolean(),
        nullable=False,
        schema="core_search",
    )


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column("SearchProperty", "showOnResult", schema="core_search")
    op.drop_column("SearchProperty", "showInHeader", schema="core_search")
    # ### end Alembic commands ###
