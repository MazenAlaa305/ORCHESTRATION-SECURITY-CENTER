"""add_target_scope_fields

Phase 2.4 hardening: adds scope_allowlist, max_rps, and max_concurrent_scans
to the targets table so the scanner can enforce per-target safety constraints.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-15 01:37:20.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('targets') as batch_op:
        batch_op.add_column(sa.Column(
            'scope_allowlist',
            sa.JSON(),
            nullable=True,
            comment='List of allowed hostnames/CIDRs. None = hostname of base_url only.',
        ))
        batch_op.add_column(sa.Column(
            'max_rps',
            sa.Integer(),
            server_default='10',
            nullable=False,
            comment='Max HTTP requests per second across all agents for this target.',
        ))
        batch_op.add_column(sa.Column(
            'max_concurrent_scans',
            sa.Integer(),
            server_default='1',
            nullable=False,
            comment='Max simultaneous Celery scan tasks. Extras fail with concurrency_limit.',
        ))


def downgrade() -> None:
    with op.batch_alter_table('targets') as batch_op:
        batch_op.drop_column('max_concurrent_scans')
        batch_op.drop_column('max_rps')
        batch_op.drop_column('scope_allowlist')
