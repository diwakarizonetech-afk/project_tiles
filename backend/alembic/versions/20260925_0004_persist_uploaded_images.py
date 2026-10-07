"""persist customer tile images in PostgreSQL

Revision ID: 20260925_0004
Revises: 20260925_0003
"""
from alembic import op
import sqlalchemy as sa

revision = "20260925_0004"
down_revision = "20260925_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tile_designs", sa.Column("image_data", sa.LargeBinary(), nullable=True))
    op.add_column("tile_designs", sa.Column("image_content_type", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("tile_designs", "image_content_type")
    op.drop_column("tile_designs", "image_data")
