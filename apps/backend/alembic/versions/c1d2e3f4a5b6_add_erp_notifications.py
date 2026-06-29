"""add erp_notifications table

Revision ID: c1d2e3f4a5b6
Revises: 7a8b9c0d1e2f
Create Date: 2026-06-28 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'c1d2e3f4a5b6'
down_revision = '7a8b9c0d1e2f'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("DROP TABLE IF EXISTS erp_notifications CASCADE")
    op.create_table(
        'erp_notifications',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.String(1000), nullable=True),
        sa.Column('work_order_id', UUID(as_uuid=True), sa.ForeignKey('work_orders.id'), nullable=True),
        sa.Column('work_order_title', sa.String(255), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_erp_notifications_tenant_id', 'erp_notifications', ['tenant_id'])
    op.create_index('ix_erp_notifications_event_type', 'erp_notifications', ['event_type'])
    op.create_index('ix_erp_notifications_is_read', 'erp_notifications', ['is_read'])
    op.create_index('ix_erp_notifications_created_at', 'erp_notifications', ['created_at'])
    op.create_index('ix_erp_notifications_work_order_id', 'erp_notifications', ['work_order_id'])


def downgrade():
    op.drop_table('erp_notifications')
