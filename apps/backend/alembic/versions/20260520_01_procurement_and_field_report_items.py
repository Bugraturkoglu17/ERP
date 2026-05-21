"""procurement and field report items

Revision ID: 20260520_01
Revises: 20260519_01
Create Date: 2026-05-20 18:57:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM


revision = "20260520_01"
down_revision = "20260519_01"
branch_labels = None
depends_on = None


def _table_exists(inspector, table_name: str) -> bool:
    return inspector.has_table(table_name)


def _column_exists(inspector, table_name: str, column_name: str) -> bool:
    if not inspector.has_table(table_name):
        return False
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _index_exists(inspector, table_name: str, index_name: str) -> bool:
    if not inspector.has_table(table_name):
        return False
    return any(ix["name"] == index_name for ix in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    # ── 1. Enums ──────────────────────────────────────────────────────────────
    bind.execute(sa.text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'procurementstatus') THEN
                CREATE TYPE procurementstatus AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'ordered', 'received', 'cancelled');
            END IF;
        END$$;
    """))

    bind.execute(sa.text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fieldreportactivitytype') THEN
                CREATE TYPE fieldreportactivitytype AS ENUM ('installation', 'testing', 'inspection', 'procurement', 'documentation', 'coordination', 'other');
            END IF;
        END$$;
    """))

    procurement_status_enum = PG_ENUM(
        "draft", "pending_approval", "approved", "rejected",
        "ordered", "received", "cancelled",
        name="procurementstatus",
        create_type=False,
    )

    field_report_activity_enum = PG_ENUM(
        "installation", "testing", "inspection", "procurement",
        "documentation", "coordination", "other",
        name="fieldreportactivitytype",
        create_type=False,
    )

    # ── 2. suppliers ──────────────────────────────────────────────────────────
    if not _table_exists(inspector, "suppliers"):
        op.create_table(
            "suppliers",
            sa.Column("id",           sa.UUID(),          nullable=False),
            sa.Column("tenant_id",    sa.UUID(),          nullable=True),
            sa.Column("name",         sa.String(200),     nullable=False),
            sa.Column("contact_name", sa.String(120),     nullable=True),
            sa.Column("phone",        sa.String(30),      nullable=True),
            sa.Column("email",        sa.String(255),     nullable=True),
            sa.Column("tax_no",       sa.String(30),      nullable=True),
            sa.Column("address",      sa.String(500),     nullable=True),
            sa.Column("notes",        sa.String(500),     nullable=True),
            sa.Column("is_active",    sa.Boolean(),       nullable=False, server_default=sa.text("true")),
            sa.Column("created_at",   sa.DateTime(),      nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_suppliers_tenant_id", "suppliers", ["tenant_id"], unique=False)
        op.create_index("ix_suppliers_name",      "suppliers", ["name"],      unique=False)

    # ── 3. purchase_requests ──────────────────────────────────────────────────
    if not _table_exists(inspector, "purchase_requests"):
        op.create_table(
            "purchase_requests",
            sa.Column("id",           sa.UUID(),                              nullable=False),
            sa.Column("tenant_id",    sa.UUID(),                              nullable=True),
            sa.Column("project_id",   sa.UUID(),                              nullable=True),
            sa.Column("material_id",  sa.UUID(),                              nullable=False),
            sa.Column("quantity",     sa.Integer(),                           nullable=False),
            sa.Column("priority",     sa.String(20),                          nullable=False, server_default="normal"),
            sa.Column("notes",        sa.String(500),                         nullable=True),
            sa.Column("status",       procurement_status_enum,                nullable=False, server_default="pending_approval"),
            sa.Column("requested_by", sa.UUID(),                              nullable=True),
            sa.Column("requested_at", sa.DateTime(),                          nullable=False, server_default=sa.text("now()")),
            sa.Column("reviewed_by",  sa.UUID(),                              nullable=True),
            sa.Column("reviewed_at",  sa.DateTime(),                          nullable=True),
            sa.Column("review_note",  sa.String(255),                         nullable=True),
            sa.ForeignKeyConstraint(["tenant_id"],   ["tenants.id"]),
            sa.ForeignKeyConstraint(["project_id"],  ["projects.id"]),
            sa.ForeignKeyConstraint(["material_id"], ["materials.id"]),
            sa.ForeignKeyConstraint(["requested_by"],["users.id"]),
            sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_purchase_requests_tenant_id",    "purchase_requests", ["tenant_id"],    unique=False)
        op.create_index("ix_purchase_requests_project_id",   "purchase_requests", ["project_id"],   unique=False)
        op.create_index("ix_purchase_requests_material_id",  "purchase_requests", ["material_id"],  unique=False)
        op.create_index("ix_purchase_requests_status",       "purchase_requests", ["status"],       unique=False)
        op.create_index("ix_purchase_requests_requested_at", "purchase_requests", ["requested_at"], unique=False)

    # ── 4. purchase_orders ────────────────────────────────────────────────────
    if not _table_exists(inspector, "purchase_orders"):
        op.create_table(
            "purchase_orders",
            sa.Column("id",            sa.UUID(),              nullable=False),
            sa.Column("tenant_id",     sa.UUID(),              nullable=True),
            sa.Column("po_no",         sa.String(100),         nullable=False),
            sa.Column("supplier_id",   sa.UUID(),              nullable=True),
            sa.Column("project_id",    sa.UUID(),              nullable=True),
            sa.Column("warehouse_id",  sa.UUID(),              nullable=True),
            sa.Column("status",        procurement_status_enum, nullable=False, server_default="draft"),
            sa.Column("order_date",    sa.DateTime(),          nullable=True),
            sa.Column("expected_date", sa.DateTime(),          nullable=True),
            sa.Column("received_at",   sa.DateTime(),          nullable=True),
            sa.Column("total_amount",  sa.Numeric(14, 2),      nullable=True),
            sa.Column("notes",         sa.String(500),         nullable=True),
            sa.Column("created_by",    sa.UUID(),              nullable=True),
            sa.Column("received_by",   sa.UUID(),              nullable=True),
            sa.Column("created_at",    sa.DateTime(),          nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at",    sa.DateTime(),          nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["tenant_id"],   ["tenants.id"]),
            sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"]),
            sa.ForeignKeyConstraint(["project_id"],  ["projects.id"]),
            sa.ForeignKeyConstraint(["warehouse_id"],["warehouses.id"]),
            sa.ForeignKeyConstraint(["created_by"],  ["users.id"]),
            sa.ForeignKeyConstraint(["received_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("po_no", name="uq_purchase_orders_po_no"),
        )
        op.create_index("ix_purchase_orders_tenant_id",  "purchase_orders", ["tenant_id"],  unique=False)
        op.create_index("ix_purchase_orders_po_no",      "purchase_orders", ["po_no"],      unique=True)
        op.create_index("ix_purchase_orders_supplier_id","purchase_orders", ["supplier_id"],unique=False)
        op.create_index("ix_purchase_orders_project_id", "purchase_orders", ["project_id"], unique=False)
        op.create_index("ix_purchase_orders_status",     "purchase_orders", ["status"],     unique=False)

    # ── 5. purchase_order_items ───────────────────────────────────────────────
    if not _table_exists(inspector, "purchase_order_items"):
        op.create_table(
            "purchase_order_items",
            sa.Column("id",          sa.UUID(),          nullable=False),
            sa.Column("order_id",    sa.UUID(),          nullable=False),
            sa.Column("material_id", sa.UUID(),          nullable=False),
            sa.Column("quantity",    sa.Integer(),       nullable=False),
            sa.Column("unit_price",  sa.Numeric(12, 2),  nullable=True),
            sa.Column("total_price", sa.Numeric(14, 2),  nullable=True),
            sa.Column("notes",       sa.String(255),     nullable=True),
            sa.ForeignKeyConstraint(["order_id"],    ["purchase_orders.id"]),
            sa.ForeignKeyConstraint(["material_id"], ["materials.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_purchase_order_items_order_id",   "purchase_order_items", ["order_id"],    unique=False)
        op.create_index("ix_purchase_order_items_material_id","purchase_order_items", ["material_id"], unique=False)

    # ── 6. field_report_items ─────────────────────────────────────────────────
    if not _table_exists(inspector, "field_report_items"):
        op.create_table(
            "field_report_items",
            sa.Column("id",             sa.UUID(),                     nullable=False),
            sa.Column("report_id",      sa.UUID(),                     nullable=False),
            sa.Column("activity_type",  field_report_activity_enum,    nullable=False, server_default="installation"),
            sa.Column("description",    sa.String(500),                nullable=False),
            sa.Column("location",       sa.String(200),                nullable=True),
            sa.Column("hours_spent",    sa.Float(),                    nullable=True),
            sa.Column("workers_count",  sa.Integer(),                  nullable=True),
            sa.Column("sort_order",     sa.Integer(),                  nullable=False, server_default="0"),
            sa.ForeignKeyConstraint(["report_id"], ["field_reports.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_field_report_items_report_id",     "field_report_items", ["report_id"],    unique=False)
        op.create_index("ix_field_report_items_activity_type", "field_report_items", ["activity_type"],unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    for table, indexes in [
        ("field_report_items", [
            "ix_field_report_items_activity_type",
            "ix_field_report_items_report_id",
        ]),
        ("purchase_order_items", [
            "ix_purchase_order_items_material_id",
            "ix_purchase_order_items_order_id",
        ]),
        ("purchase_orders", [
            "ix_purchase_orders_status",
            "ix_purchase_orders_project_id",
            "ix_purchase_orders_supplier_id",
            "ix_purchase_orders_po_no",
            "ix_purchase_orders_tenant_id",
        ]),
        ("purchase_requests", [
            "ix_purchase_requests_requested_at",
            "ix_purchase_requests_status",
            "ix_purchase_requests_material_id",
            "ix_purchase_requests_project_id",
            "ix_purchase_requests_tenant_id",
        ]),
        ("suppliers", [
            "ix_suppliers_name",
            "ix_suppliers_tenant_id",
        ]),
    ]:
        if _table_exists(inspector, table):
            for idx in indexes:
                if _index_exists(inspector, table, idx):
                    op.drop_index(idx, table_name=table)
            op.drop_table(table)
            inspector = inspect(bind)

    procurement_status_enum = sa.Enum(name="procurementstatus")
    procurement_status_enum.drop(bind, checkfirst=True)

    field_report_activity_enum = sa.Enum(name="fieldreportactivitytype")
    field_report_activity_enum.drop(bind, checkfirst=True)
