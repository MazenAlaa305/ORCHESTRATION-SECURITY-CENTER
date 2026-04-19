"""add pdf_bytes + relax signature on reports

Revision ID: m7n8o9p0q1r2
Revises: l6m7n8o9p0q1
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa

revision = 'm7n8o9p0q1r2'
down_revision = 'l6m7n8o9p0q1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Store generated PDF bytes for re-download and signature verification.
    with op.batch_alter_table('reports') as batch:
        batch.add_column(sa.Column('pdf_bytes', sa.LargeBinary(), nullable=True))
        # Relax signature to nullable — it's empty when REPORT_SIGNING_KEY is unset
        batch.alter_column('signature', existing_type=sa.String(length=64), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('reports') as batch:
        batch.drop_column('pdf_bytes')
        batch.alter_column('signature', existing_type=sa.String(length=64), nullable=False)
