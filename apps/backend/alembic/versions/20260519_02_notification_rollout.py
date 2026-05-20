"""notification rollout preferences and dead-letter

Revision ID: 20260519_02
Revises: 20260519_01
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "20260519_02"
down_revision = "20260519_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if inspector.has_table("platform_tenant_settings"):
        existing_columns = {col["name"] for col in inspector.get_columns("platform_tenant_settings")}
        if "email_notifications_enabled" not in existing_columns:
            op.add_column(
                "platform_tenant_settings",
                sa.Column("email_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            )
        if "email_digest_mode" not in existing_columns:
            op.add_column(
                "platform_tenant_settings",
                sa.Column("email_digest_mode", sa.String(length=20), nullable=False, server_default="immediate"),
            )
        if "email_opt_out_templates" not in existing_columns:
            op.add_column(
                "platform_tenant_settings",
                sa.Column("email_opt_out_templates", sa.String(), nullable=True),
            )

    inspector = inspect(bind)
    if not inspector.has_table("outbound_email_dead_letters"):
        op.create_table(
            "outbound_email_dead_letters",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("tenant_id", sa.UUID(), nullable=False),
            sa.Column("template", sa.String(length=120), nullable=False),
            sa.Column("retry_count", sa.Integer(), nullable=False),
            sa.Column("payload", sa.String(), nullable=False),
            sa.Column("error_message", sa.String(length=2000), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    inspector = inspect(bind)
    if inspector.has_table("outbound_email_dead_letters"):
        existing_indexes = {ix["name"] for ix in inspector.get_indexes("outbound_email_dead_letters")}
        created_at_idx = op.f("ix_outbound_email_dead_letters_created_at")
        template_idx = op.f("ix_outbound_email_dead_letters_template")
        tenant_id_idx = op.f("ix_outbound_email_dead_letters_tenant_id")
        if created_at_idx not in existing_indexes:
            op.create_index(created_at_idx, "outbound_email_dead_letters", ["created_at"], unique=False)
        if template_idx not in existing_indexes:
            op.create_index(template_idx, "outbound_email_dead_letters", ["template"], unique=False)
        if tenant_id_idx not in existing_indexes:
            op.create_index(tenant_id_idx, "outbound_email_dead_letters", ["tenant_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if inspector.has_table("outbound_email_dead_letters"):
        existing_indexes = {ix["name"] for ix in inspector.get_indexes("outbound_email_dead_letters")}
        tenant_id_idx = op.f("ix_outbound_email_dead_letters_tenant_id")
        template_idx = op.f("ix_outbound_email_dead_letters_template")
        created_at_idx = op.f("ix_outbound_email_dead_letters_created_at")
        if tenant_id_idx in existing_indexes:
            op.drop_index(tenant_id_idx, table_name="outbound_email_dead_letters")
        if template_idx in existing_indexes:
            op.drop_index(template_idx, table_name="outbound_email_dead_letters")
        if created_at_idx in existing_indexes:
            op.drop_index(created_at_idx, table_name="outbound_email_dead_letters")
        op.drop_table("outbound_email_dead_letters")

    inspector = inspect(bind)
    if inspector.has_table("platform_tenant_settings"):
        existing_columns = {col["name"] for col in inspector.get_columns("platform_tenant_settings")}
        if "email_opt_out_templates" in existing_columns:
            op.drop_column("platform_tenant_settings", "email_opt_out_templates")
        if "email_digest_mode" in existing_columns:
            op.drop_column("platform_tenant_settings", "email_digest_mode")
        if "email_notifications_enabled" in existing_columns:
            op.drop_column("platform_tenant_settings", "email_notifications_enabled")
