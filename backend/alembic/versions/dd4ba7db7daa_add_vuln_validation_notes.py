"""add_vuln_validation_notes

Revision ID: dd4ba7db7daa
Revises: f1e2d3c4b5a6
Create Date: 2026-04-16 10:01:51.549132

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'dd4ba7db7daa'
down_revision: Union[str, None] = 'f1e2d3c4b5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('vulnerabilities', sa.Column('validation_notes', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('vulnerabilities', 'validation_notes')
