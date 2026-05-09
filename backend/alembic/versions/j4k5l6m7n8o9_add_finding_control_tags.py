"""add control_tags column to findings

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa

revision = 'j4k5l6m7n8o9'
down_revision = 'i3j4k5l6m7n8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('findings', sa.Column('control_tags', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('findings', 'control_tags')
