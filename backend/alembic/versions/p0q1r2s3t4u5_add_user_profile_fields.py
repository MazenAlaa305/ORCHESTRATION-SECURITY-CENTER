"""add_user_profile_fields

Revision ID: p0q1r2s3t4u5
Revises: o9p0q1r2s3t4
Create Date: 2026-05-19 00:00:00.000000

Adds editable profile fields (full_name, bio, phone, avatar_url) to the
users table to support the self-service profile page introduced alongside
public sign-up.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'p0q1r2s3t4u5'
down_revision: Union[str, None] = 'o9p0q1r2s3t4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('full_name',  sa.String(120), nullable=True))
    op.add_column('users', sa.Column('bio',        sa.Text(),       nullable=True))
    op.add_column('users', sa.Column('phone',      sa.String(40),   nullable=True))
    op.add_column('users', sa.Column('avatar_url', sa.String(512),  nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'phone')
    op.drop_column('users', 'bio')
    op.drop_column('users', 'full_name')
