"""sprint18_modular_platform

Revision ID: b4f3c2d1e8a9
Revises: obs_indexes
Create Date: 2026-07-06 17:57:25.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "b4f3c2d1e8a9"
down_revision: Union[str, None] = "obs_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("platform_plans", sa.Column("features", sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default="[]"))
    op.add_column("platform_plans", sa.Column("quotas_json", sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default="{}"))
    op.add_column("platform_subscriptions", sa.Column("overrides_json", sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default="{}"))

    op.create_table(
        "tenant_entitlement_overrides",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("target_type", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("target_id", sqlmodel.sql.sqltypes.AutoString(length=120), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("limit_value", sa.Integer(), nullable=True),
        sa.Column("reason", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("created_by", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "target_type", "target_id", name="uq_tenant_entitlement_override"),
    )
    op.create_index(op.f("ix_tenant_entitlement_overrides_tenant_id"), "tenant_entitlement_overrides", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_tenant_entitlement_overrides_target_id"), "tenant_entitlement_overrides", ["target_id"], unique=False)
    op.create_index(op.f("ix_tenant_entitlement_overrides_target_type"), "tenant_entitlement_overrides", ["target_type"], unique=False)
    op.create_index(op.f("ix_tenant_entitlement_overrides_enabled"), "tenant_entitlement_overrides", ["enabled"], unique=False)

    op.create_table(
        "tenant_usage_meters",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("meter_key", sqlmodel.sql.sqltypes.AutoString(length=80), nullable=False),
        sa.Column("period_key", sqlmodel.sql.sqltypes.AutoString(length=40), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("source", sqlmodel.sql.sqltypes.AutoString(length=80), nullable=False),
        sa.Column("last_event_ref", sqlmodel.sql.sqltypes.AutoString(length=160), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "meter_key", "period_key", name="uq_tenant_usage_period"),
    )
    op.create_index(op.f("ix_tenant_usage_meters_tenant_id"), "tenant_usage_meters", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_tenant_usage_meters_meter_key"), "tenant_usage_meters", ["meter_key"], unique=False)
    op.create_index(op.f("ix_tenant_usage_meters_period_key"), "tenant_usage_meters", ["period_key"], unique=False)

    op.create_table(
        "marketplace_installations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sqlmodel.sql.sqltypes.AutoString(length=120), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(length=30), nullable=False),
        sa.Column("installed_by", sa.Uuid(), nullable=True),
        sa.Column("installed_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["installed_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "listing_id", name="uq_marketplace_installation"),
    )
    op.create_index(op.f("ix_marketplace_installations_tenant_id"), "marketplace_installations", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_marketplace_installations_listing_id"), "marketplace_installations", ["listing_id"], unique=False)
    op.create_index(op.f("ix_marketplace_installations_status"), "marketplace_installations", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_marketplace_installations_status"), table_name="marketplace_installations")
    op.drop_index(op.f("ix_marketplace_installations_listing_id"), table_name="marketplace_installations")
    op.drop_index(op.f("ix_marketplace_installations_tenant_id"), table_name="marketplace_installations")
    op.drop_table("marketplace_installations")
    op.drop_index(op.f("ix_tenant_usage_meters_period_key"), table_name="tenant_usage_meters")
    op.drop_index(op.f("ix_tenant_usage_meters_meter_key"), table_name="tenant_usage_meters")
    op.drop_index(op.f("ix_tenant_usage_meters_tenant_id"), table_name="tenant_usage_meters")
    op.drop_table("tenant_usage_meters")
    op.drop_index(op.f("ix_tenant_entitlement_overrides_enabled"), table_name="tenant_entitlement_overrides")
    op.drop_index(op.f("ix_tenant_entitlement_overrides_target_type"), table_name="tenant_entitlement_overrides")
    op.drop_index(op.f("ix_tenant_entitlement_overrides_target_id"), table_name="tenant_entitlement_overrides")
    op.drop_index(op.f("ix_tenant_entitlement_overrides_tenant_id"), table_name="tenant_entitlement_overrides")
    op.drop_table("tenant_entitlement_overrides")
    op.drop_column("platform_subscriptions", "overrides_json")
    op.drop_column("platform_plans", "quotas_json")
    op.drop_column("platform_plans", "features")
