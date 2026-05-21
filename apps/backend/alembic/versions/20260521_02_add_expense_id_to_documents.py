"""add expense_id to documents

Revision ID: 20260521_02
Revises: 20260521_01
Create Date: 2026-05-21
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260521_02"
down_revision = "20260521_01"
branch_labels = None
depends_on = None


def _column_exists(inspector, table_name: str, column_name: str) -> bool:
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table("documents"):
        return

    # Add expense_id to documents
    if not _column_exists(inspector, "documents", "expense_id"):
        op.add_column(
            "documents",
            sa.Column("expense_id", sa.UUID(), nullable=True)
        )
        op.create_foreign_key(
            "fk_documents_expense_id_expenses",
            "documents",
            "expenses",
            ["expense_id"],
            ["id"],
            ondelete="SET NULL"
        )
        op.create_index(
            "ix_documents_expense_id",
            "documents",
            ["expense_id"]
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table("documents"):
        return

    if _column_exists(inspector, "documents", "expense_id"):
        op.drop_constraint("fk_documents_expense_id_expenses", "documents", type_="foreignkey")
        op.drop_index("ix_documents_expense_id", "documents")
        op.drop_column("documents", "expense_id")
