"""Add token_version to users for server-side session revocation.

Revision ID: 20260907_01
Revises: 20260906_01
Create Date: 2026-09-07
"""

from alembic import op
import sqlalchemy as sa


revision = "20260907_01"
down_revision = "20260906_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "token_version" not in columns:
        op.add_column(
            "users",
            sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    op.drop_column("users", "token_version")
