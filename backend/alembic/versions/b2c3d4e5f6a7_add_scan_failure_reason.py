"""add_scan_failure_reason

Phase 2.2 hardening: adds failure_reason column to scans so the difference
between a crash (orphaned_on_restart), a concurrency block, and a normal
scan failure is visible in the audit trail.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-15 01:37:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('scans') as batch_op:
        batch_op.add_column(sa.Column(
            'failure_reason',
            sa.String(length=128),
            nullable=True,
            comment=(
                'orphaned_on_restart | concurrency_limit | '
                '<first 120 chars of exception message>'
            ),
        ))


def downgrade() -> None:
    with op.batch_alter_table('scans') as batch_op:
        batch_op.drop_column('failure_reason')
