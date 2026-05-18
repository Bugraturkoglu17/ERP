"""tenant baseline schema

Revision ID: 20260518_01
Revises:
Create Date: 2026-05-18 17:18:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "20260518_01"
down_revision = None
branch_labels = None
depends_on = None


TENANT_TABLE = "tenants"
LEGACY_TENANT_ID = "00000000-0000-0000-0000-000000000001"


def _column_exists(inspector, table_name: str, column_name: str) -> bool:
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _fk_exists(inspector, table_name: str, constrained_columns: list[str], referred_table: str) -> bool:
    for fk in inspector.get_foreign_keys(table_name):
        if fk.get("referred_table") != referred_table:
            continue
        if fk.get("constrained_columns") == constrained_columns:
            return True
    return False


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table(TENANT_TABLE):
        op.create_table(
            TENANT_TABLE,
            sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
            sa.Column("name", sa.String(length=180), nullable=False),
            sa.Column("code", sa.String(length=64), nullable=False),
            sa.Column(
                "status",
                sa.Enum("TRIAL", "ACTIVE", "SUSPENDED", "ARCHIVED", name="tenantstatus"),
                nullable=False,
                server_default="TRIAL",
            ),
            sa.Column("logo_url", sa.String(length=500), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.UniqueConstraint("name", name="uq_tenants_name"),
            sa.UniqueConstraint("code", name="uq_tenants_code"),
        )
        op.create_index("ix_tenants_name", TENANT_TABLE, ["name"], unique=False)
        op.create_index("ix_tenants_code", TENANT_TABLE, ["code"], unique=False)

    tenant_columns = [
        ("users", "tenant_id", "ix_users_tenant_id"),
        ("customers", "tenant_id", "ix_customers_tenant_id"),
        ("regions", "tenant_id", "ix_regions_tenant_id"),
        ("branches", "tenant_id", "ix_branches_tenant_id"),
        ("projects", "tenant_id", "ix_projects_tenant_id"),
    ]

    for table_name, column_name, index_name in tenant_columns:
        if not inspector.has_table(table_name):
            continue
        if not _column_exists(inspector, table_name, column_name):
            op.add_column(table_name, sa.Column(column_name, sa.UUID(), nullable=True))
            inspector = inspect(bind)
        existing_indexes = {ix["name"] for ix in inspector.get_indexes(table_name)}
        if index_name not in existing_indexes:
            op.create_index(index_name, table_name, [column_name], unique=False)

        if not _fk_exists(inspector, table_name, [column_name], TENANT_TABLE):
            op.create_foreign_key(
                f"{table_name}_{column_name}_fkey",
                table_name,
                TENANT_TABLE,
                [column_name],
                ["id"],
            )

    op.execute(
        sa.text(
            """
            INSERT INTO tenants (id, name, code, status, is_active, created_at)
            VALUES (:id, 'Legacy Tenant', 'legacy', 'ACTIVE', true, now())
            ON CONFLICT (id) DO NOTHING
            """
        ).bindparams(id=LEGACY_TENANT_ID)
    )

    op.execute(
        sa.text(
            """
            UPDATE users
            SET tenant_id = :id
            WHERE tenant_id IS NULL
              AND (default_role IS NULL OR default_role NOT LIKE '%platform_admin%')
            """
        ).bindparams(id=LEGACY_TENANT_ID)
    )
    for table_name in ["customers", "regions", "branches", "projects"]:
        if inspector.has_table(table_name):
            op.execute(
                sa.text(f"UPDATE {table_name} SET tenant_id = :id WHERE tenant_id IS NULL").bindparams(
                    id=LEGACY_TENANT_ID
                )
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    tenant_columns = [
        ("projects", "tenant_id", "ix_projects_tenant_id"),
        ("branches", "tenant_id", "ix_branches_tenant_id"),
        ("regions", "tenant_id", "ix_regions_tenant_id"),
        ("customers", "tenant_id", "ix_customers_tenant_id"),
        ("users", "tenant_id", "ix_users_tenant_id"),
    ]

    for table_name, column_name, index_name in tenant_columns:
        if not inspector.has_table(table_name):
            continue
        for fk in inspector.get_foreign_keys(table_name):
            if fk.get("referred_table") == TENANT_TABLE and fk.get("constrained_columns") == [column_name]:
                op.drop_constraint(fk["name"], table_name, type_="foreignkey")
        existing_indexes = {ix["name"] for ix in inspector.get_indexes(table_name)}
        if index_name in existing_indexes:
            op.drop_index(index_name, table_name=table_name)
        if _column_exists(inspector, table_name, column_name):
            op.drop_column(table_name, column_name)

    if inspector.has_table(TENANT_TABLE):
        for idx_name in ["ix_tenants_code", "ix_tenants_name"]:
            existing = {ix["name"] for ix in inspector.get_indexes(TENANT_TABLE)}
            if idx_name in existing:
                op.drop_index(idx_name, table_name=TENANT_TABLE)
        op.drop_table(TENANT_TABLE)
