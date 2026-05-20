"""tenant settings profile and security fields

Revision ID: 20260521_01
Revises: 20260519_02
Create Date: 2026-05-21
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260521_01"
down_revision = "20260519_02"
branch_labels = None
depends_on = None


SETTINGS_TABLE = "platform_tenant_settings"


def _column_exists(inspector, table_name: str, column_name: str) -> bool:
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table(SETTINGS_TABLE):
        return

    additions = [
        ("contact_phone", sa.String(length=30), True, None),
        ("address", sa.String(), True, None),
        ("default_currency", sa.String(length=8), False, "TRY"),
        ("vat_rate", sa.Numeric(5, 2), False, sa.text("20.00")),
        ("low_stock_threshold", sa.Integer(), False, sa.text("10")),
        ("auto_invoice_no", sa.Boolean(), False, sa.text("true")),
        ("require_approval_for_expenses", sa.Boolean(), False, sa.text("false")),
        ("default_payment_term_days", sa.Integer(), False, sa.text("30")),
        ("locale", sa.String(length=16), False, "tr-TR"),
        ("timezone", sa.String(length=64), False, "Europe/Istanbul"),
        ("date_format", sa.String(length=32), False, "DD.MM.YYYY"),
        ("session_timeout_minutes", sa.Integer(), False, sa.text("120")),
        ("mfa_required_for_admins", sa.Boolean(), False, sa.text("false")),
        ("login_ip_whitelist", sa.String(), True, None),
        ("email_notifications", sa.Boolean(), False, sa.text("true")),
        ("push_notifications", sa.Boolean(), False, sa.text("false")),
        ("daily_summary_hour", sa.Integer(), False, sa.text("9")),
        ("backup_frequency", sa.String(length=20), False, "daily"),
        ("retention_days", sa.Integer(), False, sa.text("90")),
    ]

    for name, type_, nullable, default in additions:
        if _column_exists(inspector, SETTINGS_TABLE, name):
            continue
        op.add_column(
            SETTINGS_TABLE,
            sa.Column(name, type_, nullable=nullable, server_default=default),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table(SETTINGS_TABLE):
        return

    removable_columns = [
        "retention_days",
        "backup_frequency",
        "daily_summary_hour",
        "push_notifications",
        "email_notifications",
        "login_ip_whitelist",
        "mfa_required_for_admins",
        "session_timeout_minutes",
        "date_format",
        "timezone",
        "locale",
        "default_payment_term_days",
        "require_approval_for_expenses",
        "auto_invoice_no",
        "low_stock_threshold",
        "vat_rate",
        "default_currency",
        "address",
        "contact_phone",
    ]

    for name in removable_columns:
        if _column_exists(inspector, SETTINGS_TABLE, name):
            op.drop_column(SETTINGS_TABLE, name)
