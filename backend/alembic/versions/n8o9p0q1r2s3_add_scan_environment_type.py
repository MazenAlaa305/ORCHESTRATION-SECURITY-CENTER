"""add environment_type to scans table

Revision ID: n8o9p0q1r2s3
Revises: m7n8o9p0q1r2
Create Date: 2026-04-30
"""
from alembic import op
import sqlalchemy as sa

revision = 'n8o9p0q1r2s3'
down_revision = 'm7n8o9p0q1r2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('scans') as batch:
        batch.add_column(sa.Column('environment_type', sa.String(length=32), nullable=True, server_default='lab'))


def downgrade() -> None:
    with op.batch_alter_table('scans') as batch:
        batch.drop_column('environment_type')
