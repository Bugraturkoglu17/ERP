"""StoreInvoiceRecord: related_payment_id ve invoice_date alanları eklendi

Revision ID: 20260628_03
Revises: 20260628_02
Create Date: 2026-06-28
"""

from alembic import op
import sqlalchemy as sa

revision = "20260628_03"
down_revision = "20260628_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "store_invoice_records",
        sa.Column("related_payment_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "store_invoice_records",
        sa.Column("invoice_date", sa.String(20), nullable=True),
    )
    op.create_index(
        "ix_store_invoice_records_related_payment_id",
        "store_invoice_records",
        ["related_payment_id"],
    )
    op.create_foreign_key(
        "fk_invoice_related_payment",
        "store_invoice_records",
        "store_progress_payments",
        ["related_payment_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_invoice_related_payment", "store_invoice_records", type_="foreignkey")
    op.drop_index("ix_store_invoice_records_related_payment_id", "store_invoice_records")
    op.drop_column("store_invoice_records", "invoice_date")
    op.drop_column("store_invoice_records", "related_payment_id")
