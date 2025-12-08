"""remove_tool_integration_tables_and_mode_column

Revision ID: ce09c5aea835
Revises: 322825ad1f9c
Create Date: 2025-12-08 12:03:23.414320

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ce09c5aea835'
down_revision: Union[str, None] = '322825ad1f9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop tool_credentials table first (has foreign key to tool_integrations)
    op.drop_table('tool_credentials')
    
    # Drop tool_integrations table
    op.drop_table('tool_integrations')
    
    # Drop mode column from chat_messages
    op.drop_column('chat_messages', 'mode')


def downgrade() -> None:
    # Re-add mode column to chat_messages
    op.add_column('chat_messages', sa.Column('mode', sa.String(length=20), nullable=True, server_default='wrap'))
    
    # Re-create tool_integrations table
    op.create_table('tool_integrations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wrapped_api_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('tool_name', sa.String(length=200), nullable=False),
        sa.Column('display_name', sa.String(length=200), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('capabilities', sa.JSON(), nullable=True),
        sa.Column('user_requirements', sa.Text(), nullable=True),
        sa.Column('selected_capabilities', sa.JSON(), nullable=True),
        sa.Column('tool_code', sa.Text(), nullable=True),
        sa.Column('credential_fields', sa.JSON(), nullable=True),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['wrapped_api_id'], ['wrapped_apis.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tool_integrations_id'), 'tool_integrations', ['id'], unique=False)
    
    # Re-create tool_credentials table
    op.create_table('tool_credentials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('integration_id', sa.Integer(), nullable=False),
        sa.Column('encrypted_credentials', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['integration_id'], ['tool_integrations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tool_credentials_id'), 'tool_credentials', ['id'], unique=False)
