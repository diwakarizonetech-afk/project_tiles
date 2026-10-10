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
    op.add_column(
        "tile_designs",
        sa.Column("orientation", sa.String(length=10), server_default="Landscape", nullable=False),
    )
    op.create_check_constraint(
        "ck_tile_designs_orientation",
        "tile_designs",
        "orientation IN ('Landscape', 'Portrait')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_tile_designs_orientation", "tile_designs", type_="check")
    op.drop_column("tile_designs", "orientation")
