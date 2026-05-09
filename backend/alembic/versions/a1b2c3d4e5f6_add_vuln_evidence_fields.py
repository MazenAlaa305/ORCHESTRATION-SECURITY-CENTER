"""add_vuln_evidence_fields

Phase 1.2 hardening: adds raw_request, raw_response, evidence_hash,
detected_by, and template_id columns to the vulnerabilities table.

Every finding produced by the Nuclei-backed AttackAgent after this
migration will have these columns populated.  Existing rows (produced
by the old payload-based agent) will have NULL values — this is safe
and expected; the ValidationAgent handles the NULL case gracefully via
the 'no_raw_request_legacy_finding' reprobe reason.

Revision ID: a1b2c3d4e5f6
Revises: c8a2b1c3d4e5
Create Date: 2026-04-15 01:26:23.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# ── Metadata ──────────────────────────────────────────────────────────────────
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'c8a2b1c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add Nuclei evidence columns to vulnerabilities."""
    # Use batch_alter_table for SQLite compatibility in dev environments
    with op.batch_alter_table('vulnerabilities') as batch_op:
        batch_op.add_column(sa.Column(
            'raw_request',
            sa.Text(),
            nullable=True,
            comment='Full HTTP request sent by Nuclei (from -ir flag)',
        ))
        batch_op.add_column(sa.Column(
            'raw_response',
            sa.Text(),
            nullable=True,
            comment='Full HTTP response received by Nuclei',
        ))
        batch_op.add_column(sa.Column(
            'evidence_hash',
            sa.String(length=64),
            nullable=True,
            comment='sha256(raw_request + raw_response) for deduplication',
        ))
        batch_op.add_column(sa.Column(
            'detected_by',
            sa.String(length=32),
            nullable=True,
            comment='Scanner that found this: nuclei | recon | manual',
        ))
        batch_op.add_column(sa.Column(
            'template_id',
            sa.String(length=128),
            nullable=True,
            comment='Nuclei template ID or ZAP rule ID',
        ))


def downgrade() -> None:
    """Remove Nuclei evidence columns from vulnerabilities."""
    with op.batch_alter_table('vulnerabilities') as batch_op:
        batch_op.drop_column('template_id')
        batch_op.drop_column('detected_by')
        batch_op.drop_column('evidence_hash')
        batch_op.drop_column('raw_response')
        batch_op.drop_column('raw_request')
