"""persist uploaded wall tile orientation

Revision ID: 20261009_0005
Revises: 20260925_0004
"""
from alembic import op
import sqlalchemy as sa

revision = "20261009_0005"
down_revision = "20260925_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("tile_designs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("orientation", sa.String(length=10), server_default="Landscape", nullable=False)
        )
        batch_op.create_check_constraint(
            "ck_tile_designs_orientation",
            "orientation IN ('Landscape', 'Portrait')",
        )


def downgrade() -> None:
    with op.batch_alter_table("tile_designs", schema=None) as batch_op:
        batch_op.drop_constraint("ck_tile_designs_orientation", type_="check")
        batch_op.drop_column("orientation")
