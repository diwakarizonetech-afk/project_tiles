"""create tile designs table"""
from alembic import op
import sqlalchemy as sa

revision = '20260922_0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table('tile_designs', sa.Column('code', sa.String(length=25), nullable=False), sa.Column('name', sa.String(length=120), nullable=False), sa.Column('family', sa.String(length=30), nullable=False), sa.Column('finish', sa.String(length=60), nullable=False), sa.Column('surface', sa.String(length=10), nullable=False), sa.Column('image_path', sa.Text(), nullable=False), sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False), sa.PrimaryKeyConstraint('code'))

def downgrade() -> None:
    op.drop_table('tile_designs')
