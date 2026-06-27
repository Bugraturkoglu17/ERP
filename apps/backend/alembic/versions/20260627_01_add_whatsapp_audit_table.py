"""add whatsapp audit table

Revision ID: 20260627_01
Revises: 20260521_02
Create Date: 2026-06-27

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "20260627_01"
down_revision = "20260521_02"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "outbound_whatsapp_audits",
        sa.Column("id", UUID(), nullable=False),
        sa.Column("tenant_id", UUID(), nullable=False),
        sa.Column("phone_number", sa.String(length=50), nullable=False),
        sa.Column("template_name", sa.String(length=120), nullable=False),
        sa.Column("provider_message_id", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="queued"),
        sa.Column("error_message", sa.String(length=2000), nullable=True),
        sa.Column("payload_json", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(), nullable=True),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"])
    )
    op.create_index("ix_outbound_whatsapp_audits_tenant_id", "outbound_whatsapp_audits", ["tenant_id"])
    op.create_index("ix_outbound_whatsapp_audits_phone_number", "outbound_whatsapp_audits", ["phone_number"])
    op.create_index("ix_outbound_whatsapp_audits_template_name", "outbound_whatsapp_audits", ["template_name"])
    op.create_index("ix_outbound_whatsapp_audits_provider_message_id", "outbound_whatsapp_audits", ["provider_message_id"])
    op.create_index("ix_outbound_whatsapp_audits_status", "outbound_whatsapp_audits", ["status"])

def downgrade() -> None:
    op.drop_index("ix_outbound_whatsapp_audits_status", table_name="outbound_whatsapp_audits")
    op.drop_index("ix_outbound_whatsapp_audits_provider_message_id", table_name="outbound_whatsapp_audits")
    op.drop_index("ix_outbound_whatsapp_audits_template_name", table_name="outbound_whatsapp_audits")
    op.drop_index("ix_outbound_whatsapp_audits_phone_number", table_name="outbound_whatsapp_audits")
    op.drop_index("ix_outbound_whatsapp_audits_tenant_id", table_name="outbound_whatsapp_audits")
    op.drop_table("outbound_whatsapp_audits")
