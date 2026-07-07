"""add_workflow_run_monitoring

Revision ID: 024068998aaf
Revises: 841be1b75a02
Create Date: 2026-07-07

Adds monitoring columns to workflow_runs:
- parent_run_id: nullable self-referential FK (retry chain)
- stalled_at: when the run was detected as stalled
- alert_sent_at: idempotency guard for failure/stalled notifications
"""
from alembic import op
import sqlalchemy as sa

revision = '024068998aaf'
down_revision = '841be1b75a02'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('workflow_runs',
        sa.Column('parent_run_id', sa.UUID(), nullable=True)
    )
    op.create_foreign_key(
        'fk_workflow_runs_parent_run_id',
        'workflow_runs', 'workflow_runs',
        ['parent_run_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_workflow_runs_parent_run_id', 'workflow_runs', ['parent_run_id'])

    op.add_column('workflow_runs',
        sa.Column('stalled_at', sa.DateTime(), nullable=True)
    )
    op.add_column('workflow_runs',
        sa.Column('alert_sent_at', sa.DateTime(), nullable=True)
    )


def downgrade() -> None:
    op.drop_index('ix_workflow_runs_parent_run_id', table_name='workflow_runs')
    op.drop_constraint('fk_workflow_runs_parent_run_id', 'workflow_runs', type_='foreignkey')
    op.drop_column('workflow_runs', 'parent_run_id')
    op.drop_column('workflow_runs', 'stalled_at')
    op.drop_column('workflow_runs', 'alert_sent_at')
