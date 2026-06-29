"""add observability indexes

Revision ID: obs_indexes
Revises: 
Create Date: 2026-06-29 22:50:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'obs_indexes'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # WorkOrder tenant_id/status/created_at composite index
    op.create_index(
        'ix_work_orders_tenant_status_created', 
        'work_orders', 
        ['tenant_id', 'status', 'created_at']
    )
    
    # ErpNotification tenant_id/is_read/created_at index
    op.create_index(
        'ix_notifications_tenant_read_created', 
        'erp_notifications', 
        ['tenant_id', 'is_read', 'created_at']
    )
    
    # WorkOrderWhatsappMessage work_order_id/status/created_at index
    op.create_index(
        'ix_wa_messages_wo_status_created', 
        'work_order_whatsapp_messages', 
        ['work_order_id', 'status', 'created_at']
    )

def downgrade() -> None:
    op.drop_index('ix_wa_messages_wo_status_created', table_name='work_order_whatsapp_messages')
    op.drop_index('ix_notifications_tenant_read_created', table_name='erp_notifications')
    op.drop_index('ix_work_orders_tenant_status_created', table_name='work_orders')
