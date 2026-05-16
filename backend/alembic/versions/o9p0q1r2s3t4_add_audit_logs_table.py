"""add_audit_logs_table

Revision ID: o9p0q1r2s3t4
Revises: n8o9p0q1r2s3
Create Date: 2026-05-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'o9p0q1r2s3t4'
down_revision: Union[str, None] = 'n8o9p0q1r2s3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'audit_logs',
        sa.Column('id',          sa.String(36),  primary_key=True, nullable=False),
        sa.Column('actor_id',    sa.String(36),  nullable=False),
        sa.Column('actor_email', sa.String(255), nullable=False),
        sa.Column('action',      sa.String(64),  nullable=False),
        sa.Column('target_id',   sa.String(36),  nullable=True),
        sa.Column('detail',      sa.Text(),       nullable=True),
        sa.Column('created_at',  sa.DateTime(),  nullable=False),
    )
    op.create_index('ix_audit_logs_actor_id',   'audit_logs', ['actor_id'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_audit_logs_created_at', table_name='audit_logs')
    op.drop_index('ix_audit_logs_actor_id',   table_name='audit_logs')
    op.drop_table('audit_logs')
