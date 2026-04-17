"""add target environment metadata fields

Revision ID: l6m7n8o9p0q1
Revises: k5l6m7n8o9p0
Create Date: 2026-04-17
"""
from alembic import op
import sqlalchemy as sa

revision = 'l6m7n8o9p0q1'
down_revision = 'k5l6m7n8o9p0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('targets', sa.Column('environment_type', sa.String(length=32), nullable=True, server_default='lab'))
    op.add_column('targets', sa.Column('compliance_tags', sa.JSON(), nullable=True))
    op.add_column('targets', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('targets', sa.Column('last_scanned_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('targets', 'last_scanned_at')
    op.drop_column('targets', 'notes')
    op.drop_column('targets', 'compliance_tags')
    op.drop_column('targets', 'environment_type')
