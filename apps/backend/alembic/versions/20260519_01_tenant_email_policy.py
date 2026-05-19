"""tenant email policy and audit

Revision ID: 20260519_01
Revises: 20260518_01
Create Date: 2026-05-19 21:15:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260519_01"
down_revision = "20260518_01"
branch_labels = None
depends_on = None


SETTINGS_TABLE = "platform_tenant_settings"
AUDIT_TABLE = "outbound_email_audits"


def _column_exists(inspector, table_name: str, column_name: str) -> bool:
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _index_exists(inspector, table_name: str, index_name: str) -> bool:
    return any(ix["name"] == index_name for ix in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    email_mode_enum = sa.Enum("PLATFORM", "TENANT_DOMAIN", name="tenantemailmode")
    email_mode_enum.create(bind, checkfirst=True)

    if inspector.has_table(SETTINGS_TABLE):
        if not _column_exists(inspector, SETTINGS_TABLE, "email_mode"):
            op.add_column(
                SETTINGS_TABLE,
                sa.Column("email_mode", email_mode_enum, nullable=False, server_default="PLATFORM"),
            )
        if not _column_exists(inspector, SETTINGS_TABLE, "from_name"):
            op.add_column(SETTINGS_TABLE, sa.Column("from_name", sa.String(length=180), nullable=True))
        if not _column_exists(inspector, SETTINGS_TABLE, "from_email"):
            op.add_column(SETTINGS_TABLE, sa.Column("from_email", sa.String(length=255), nullable=True))
        if not _column_exists(inspector, SETTINGS_TABLE, "reply_to"):
            op.add_column(SETTINGS_TABLE, sa.Column("reply_to", sa.String(length=255), nullable=True))
        if not _column_exists(inspector, SETTINGS_TABLE, "email_domain_verified"):
            op.add_column(
                SETTINGS_TABLE,
                sa.Column("email_domain_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            )
        if not _column_exists(inspector, SETTINGS_TABLE, "email_provider_identity_id"):
            op.add_column(
                SETTINGS_TABLE,
                sa.Column("email_provider_identity_id", sa.String(length=255), nullable=True),
            )
        if not _column_exists(inspector, SETTINGS_TABLE, "email_branding"):
            op.add_column(SETTINGS_TABLE, sa.Column("email_branding", sa.Text(), nullable=True))

    inspector = inspect(bind)
    if not inspector.has_table(AUDIT_TABLE):
        op.create_table(
            AUDIT_TABLE,
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("tenant_id", sa.UUID(), nullable=False),
            sa.Column("template", sa.String(length=120), nullable=False),
            sa.Column("recipient_count", sa.Integer(), nullable=False),
            sa.Column("provider", sa.String(length=40), nullable=False, server_default="resend"),
            sa.Column("provider_message_id", sa.String(length=255), nullable=True),
            sa.Column("status", sa.String(length=40), nullable=False, server_default="queued"),
            sa.Column("error_message", sa.String(length=2000), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_outbound_email_audits_tenant_id", AUDIT_TABLE, ["tenant_id"], unique=False)
        op.create_index("ix_outbound_email_audits_template", AUDIT_TABLE, ["template"], unique=False)
        op.create_index("ix_outbound_email_audits_provider_message_id", AUDIT_TABLE, ["provider_message_id"], unique=False)
        op.create_index("ix_outbound_email_audits_status", AUDIT_TABLE, ["status"], unique=False)
        op.create_index("ix_outbound_email_audits_created_at", AUDIT_TABLE, ["created_at"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if inspector.has_table(AUDIT_TABLE):
        for idx in [
            "ix_outbound_email_audits_created_at",
            "ix_outbound_email_audits_status",
            "ix_outbound_email_audits_provider_message_id",
            "ix_outbound_email_audits_template",
            "ix_outbound_email_audits_tenant_id",
        ]:
            if _index_exists(inspector, AUDIT_TABLE, idx):
                op.drop_index(idx, table_name=AUDIT_TABLE)
        op.drop_table(AUDIT_TABLE)

    inspector = inspect(bind)
    if inspector.has_table(SETTINGS_TABLE):
        for col in [
            "email_branding",
            "email_provider_identity_id",
            "email_domain_verified",
            "reply_to",
            "from_email",
            "from_name",
            "email_mode",
        ]:
            if _column_exists(inspector, SETTINGS_TABLE, col):
                op.drop_column(SETTINGS_TABLE, col)

    email_mode_enum = sa.Enum("PLATFORM", "TENANT_DOMAIN", name="tenantemailmode")
    email_mode_enum.drop(bind, checkfirst=True)
