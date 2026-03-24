"""cleanup_legacy_fields

Revision ID: c8a2b1c3d4e5
Revises: 97af5de1cc55
Create Date: 2026-03-24 15:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8a2b1c3d4e5'
down_revision: Union[str, None] = '42961c8452a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop columns from scan_assets
    op.drop_column('scan_assets', 'mac_address')
    op.drop_column('scan_assets', 'mac_vendor')
    op.drop_column('scan_assets', 'os_name')
    op.drop_column('scan_assets', 'os_family')
    op.drop_column('scan_assets', 'os_accuracy')
    op.drop_column('scan_assets', 'device_type')
    op.drop_column('scan_assets', 'uptime')
    op.drop_column('scan_assets', 'is_new')
    op.drop_column('scan_assets', 'first_seen')
    op.drop_column('scan_assets', 'last_seen')
    op.drop_column('scan_assets', 'ai_insight')
    
    # Drop columns from asset_services
    op.drop_column('asset_services', 'service_name')
    op.drop_column('asset_services', 'product')
    op.drop_column('asset_services', 'version')
    op.drop_column('asset_services', 'cpe')
    op.drop_column('asset_services', 'extra_info')
    
    # Add indexes for foreign keys
    op.create_index(op.f('ix_scan_assets_scan_id'), 'scan_assets', ['scan_id'], unique=False)
    op.create_index(op.f('ix_asset_services_asset_id'), 'asset_services', ['asset_id'], unique=False)


def downgrade() -> None:
    # Remove indexes
    op.drop_index(op.f('ix_asset_services_asset_id'), table_name='asset_services')
    op.drop_index(op.f('ix_scan_assets_scan_id'), table_name='scan_assets')
    
    # Add back columns to asset_services
    op.add_column('asset_services', sa.Column('extra_info', sa.TEXT(), nullable=True))
    op.add_column('asset_services', sa.Column('cpe', sa.VARCHAR(length=255), nullable=True))
    op.add_column('asset_services', sa.Column('version', sa.VARCHAR(length=100), nullable=True))
    op.add_column('asset_services', sa.Column('product', sa.VARCHAR(length=255), nullable=True))
    op.add_column('asset_services', sa.Column('service_name', sa.VARCHAR(length=100), nullable=True))
    
    # Add back columns to scan_assets
    op.add_column('scan_assets', sa.Column('ai_insight', sa.JSON(), nullable=True))
    op.add_column('scan_assets', sa.Column('last_seen', sa.DATETIME(), nullable=True))
    op.add_column('scan_assets', sa.Column('first_seen', sa.DATETIME(), nullable=True))
    op.add_column('scan_assets', sa.Column('is_new', sa.VARCHAR(), nullable=True))
    op.add_column('scan_assets', sa.Column('uptime', sa.VARCHAR(), nullable=True))
    op.add_column('scan_assets', sa.Column('device_type', sa.VARCHAR(), nullable=True))
    op.add_column('scan_assets', sa.Column('os_accuracy', sa.INTEGER(), nullable=True))
    op.add_column('scan_assets', sa.Column('os_family', sa.VARCHAR(), nullable=True))
    op.add_column('scan_assets', sa.Column('os_name', sa.VARCHAR(), nullable=True))
    op.add_column('scan_assets', sa.Column('mac_vendor', sa.VARCHAR(), nullable=True))
    op.add_column('scan_assets', sa.Column('mac_address', sa.VARCHAR(), nullable=True))
