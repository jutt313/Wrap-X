"""add_notification_settings_table

Revision ID: 58b3f6f8a0ea
Revises: 9b07c0a3f3f4
Create Date: 2025-11-08 14:39:46.215553

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '58b3f6f8a0ea'
down_revision: Union[str, None] = '9b07c0a3f3f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'notification_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('api_errors', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('rate_limits', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('usage_thresholds', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('billing_alerts', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('deployment_updates', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('in_app_enabled', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_notification_settings_id'), 'notification_settings', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notification_settings_id'), table_name='notification_settings')
    op.drop_table('notification_settings')

