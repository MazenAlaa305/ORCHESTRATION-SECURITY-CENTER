"""runtime config table

Revision ID: k5l6m7n8o9p0
Revises: j4k5l6m7n8o9
Create Date: 2026-04-17
"""
from alembic import op
import sqlalchemy as sa

revision = 'k5l6m7n8o9p0'
down_revision = 'j4k5l6m7n8o9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'runtime_config',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('key', sa.String(length=64), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('updated_by', sa.String(length=36), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key', name='uq_runtime_config_key'),
    )
    op.create_index(op.f('ix_runtime_config_key'), 'runtime_config', ['key'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_runtime_config_key'), table_name='runtime_config')
    op.drop_table('runtime_config')
