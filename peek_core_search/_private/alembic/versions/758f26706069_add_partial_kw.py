"""add partial kw

Peek Plugin Database Migration Script

Revision ID: 758f26706069
Revises: 0736e757d1ec
Create Date: 2020-06-01 12:35:51.862282

"""

# revision identifiers, used by Alembic.
revision = "758f26706069"
down_revision = "0736e757d1ec"
branch_labels = None
depends_on = None

import sqlalchemy as sa
from alembic import op


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column(
        "SearchObject",
        "propertiesJson",
        new_column_name="fullKwPropertiesJson",
        schema="core_search",
    )

    op.add_column(
        "SearchObject",
        sa.Column("partialKwPropertiesJson", sa.String(), nullable=True),
        schema="core_search",
    )
    # ### end Alembic commands ###


def downgrade():
    op.alter_column(
        "SearchObject",
        "fullKwPropertiesJson",
        new_column_name="propertiesJson",
        schema="core_search",
    )

    op.drop_column("SearchObject", "partialKwPropertiesJson", schema="core_search")
