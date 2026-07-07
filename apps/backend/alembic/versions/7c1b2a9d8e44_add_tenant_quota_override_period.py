"""add_tenant_quota_override_period

Revision ID: 7c1b2a9d8e44
Revises: 660af244a23a
Create Date: 2026-07-07 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7c1b2a9d8e44"
down_revision: Union[str, None] = "660af244a23a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tenant_entitlement_overrides", sa.Column("period", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("tenant_entitlement_overrides", "period")
