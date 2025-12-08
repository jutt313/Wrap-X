"""add_tool_integration_tables

Revision ID: f1a2b3c4d5e6
Revises: 93d498f3278e
Create Date: 2025-12-03 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = '93d498f3278e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create tool_integrations table
    op.create_table(
        'tool_integrations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wrapped_api_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('tool_name', sa.String(length=200), nullable=False),
        sa.Column('display_name', sa.String(length=200), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('capabilities', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('user_requirements', sa.Text(), nullable=True),
        sa.Column('selected_capabilities', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('tool_code', sa.Text(), nullable=True),
        sa.Column('credential_fields', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['wrapped_api_id'], ['wrapped_apis.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tool_integrations_id'), 'tool_integrations', ['id'], unique=False)
    op.create_index(op.f('ix_tool_integrations_wrapped_api_id'), 'tool_integrations', ['wrapped_api_id'], unique=False)
    op.create_index(op.f('ix_tool_integrations_user_id'), 'tool_integrations', ['user_id'], unique=False)
    
    # Create tool_credentials table
    op.create_table(
        'tool_credentials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('integration_id', sa.Integer(), nullable=False),
        sa.Column('encrypted_credentials', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['integration_id'], ['tool_integrations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tool_credentials_id'), 'tool_credentials', ['id'], unique=False)
    op.create_index(op.f('ix_tool_credentials_integration_id'), 'tool_credentials', ['integration_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_tool_credentials_integration_id'), table_name='tool_credentials')
    op.drop_index(op.f('ix_tool_credentials_id'), table_name='tool_credentials')
    op.drop_table('tool_credentials')
    op.drop_index(op.f('ix_tool_integrations_user_id'), table_name='tool_integrations')
    op.drop_index(op.f('ix_tool_integrations_wrapped_api_id'), table_name='tool_integrations')
    op.drop_index(op.f('ix_tool_integrations_id'), table_name='tool_integrations')
    op.drop_table('tool_integrations')

