"""add_scan_checkpoint

Phase 2.3 hardening: adds checkpoint column to scans so Celery retries
can skip phases that already completed.  The column stores the most
recently completed phase name (recon_done, attack_done, validated,
risk_scored, reported).

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-15 01:37:10.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('scans') as batch_op:
        batch_op.add_column(sa.Column(
            'checkpoint',
            sa.String(length=32),
            nullable=True,
            comment='recon_done | attack_done | validated | risk_scored | reported',
        ))


def downgrade() -> None:
    with op.batch_alter_table('scans') as batch_op:
        batch_op.drop_column('checkpoint')
