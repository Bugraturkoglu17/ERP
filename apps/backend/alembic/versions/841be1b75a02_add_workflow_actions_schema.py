"""add_workflow_actions_schema

Revision ID: 841be1b75a02
Revises: fb1e7542ac9e
Create Date: 2026-07-07 11:47:48.199388

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '841be1b75a02'
down_revision: Union[str, None] = 'fb1e7542ac9e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('workflow_actions', sa.Column('config_schema', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('workflow_actions', 'config_schema')
