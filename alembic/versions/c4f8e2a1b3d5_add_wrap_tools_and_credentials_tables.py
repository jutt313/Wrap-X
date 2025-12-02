"""add_wrap_tools_and_credentials_tables

Revision ID: c4f8e2a1b3d5
Revises: 3a1b0b8e9b21
Create Date: 2025-11-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c4f8e2a1b3d5'
down_revision: Union[str, None] = '3a1b0b8e9b21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add custom_tools_enabled column to wrapped_apis
    op.add_column('wrapped_apis', sa.Column('custom_tools_enabled', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create wrap_tools table
    op.create_table(
        'wrap_tools',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wrap_id', sa.Integer(), nullable=False),
        sa.Column('tool_name', sa.String(100), nullable=False),
        sa.Column('tool_code', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['wrap_id'], ['wrapped_apis.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('wrap_id', 'tool_name', name='uq_wrap_tool_name')
    )
    op.create_index(op.f('ix_wrap_tools_id'), 'wrap_tools', ['id'], unique=False)
    op.create_index(op.f('ix_wrap_tools_wrap_id'), 'wrap_tools', ['wrap_id'], unique=False)
    
    # Create wrap_credentials table
    op.create_table(
        'wrap_credentials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wrap_id', sa.Integer(), nullable=False),
        sa.Column('tool_id', sa.Integer(), nullable=True),
        sa.Column('tool_name', sa.String(100), nullable=False),
        sa.Column('credentials_json', sa.Text(), nullable=False),
        sa.Column('tool_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['wrap_id'], ['wrapped_apis.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tool_id'], ['wrap_tools.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('wrap_id', 'tool_name', name='uq_wrap_credential_tool_name')
    )
    op.create_index(op.f('ix_wrap_credentials_id'), 'wrap_credentials', ['id'], unique=False)
    op.create_index(op.f('ix_wrap_credentials_wrap_id'), 'wrap_credentials', ['wrap_id'], unique=False)
    op.create_index(op.f('ix_wrap_credentials_tool_id'), 'wrap_credentials', ['tool_id'], unique=False)


def downgrade() -> None:
    # Drop wrap_credentials table
    op.drop_index(op.f('ix_wrap_credentials_tool_id'), table_name='wrap_credentials')
    op.drop_index(op.f('ix_wrap_credentials_wrap_id'), table_name='wrap_credentials')
    op.drop_index(op.f('ix_wrap_credentials_id'), table_name='wrap_credentials')
    op.drop_table('wrap_credentials')
    
    # Drop wrap_tools table
    op.drop_index(op.f('ix_wrap_tools_wrap_id'), table_name='wrap_tools')
    op.drop_index(op.f('ix_wrap_tools_id'), table_name='wrap_tools')
    op.drop_table('wrap_tools')
    
    # Remove custom_tools_enabled column from wrapped_apis
    op.drop_column('wrapped_apis', 'custom_tools_enabled')

