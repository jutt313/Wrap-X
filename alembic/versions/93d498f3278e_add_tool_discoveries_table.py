"""add_tool_discoveries_table

Revision ID: 93d498f3278e
Revises: ebc949d4d173
Create Date: 2025-12-03 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '93d498f3278e'
down_revision: Union[str, None] = '0ae16d796314'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create tool_discoveries table
    op.create_table(
        'tool_discoveries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wrap_id', sa.Integer(), nullable=False),
        sa.Column('tool_name', sa.String(100), nullable=False),
        sa.Column('display_name', sa.String(200), nullable=True),
        sa.Column('capabilities', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('documentation_url', sa.String(500), nullable=True),
        sa.Column('auth_type', sa.String(50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('user_requirements', sa.Text(), nullable=True),
        sa.Column('selected_capabilities', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='discovered'),
        sa.Column('discovery_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['wrap_id'], ['wrapped_apis.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('wrap_id', 'tool_name', name='uq_tool_discovery_wrap_tool')
    )
    op.create_index(op.f('ix_tool_discoveries_id'), 'tool_discoveries', ['id'], unique=False)
    op.create_index(op.f('ix_tool_discoveries_wrap_id'), 'tool_discoveries', ['wrap_id'], unique=False)
    op.create_index(op.f('ix_tool_discoveries_tool_name'), 'tool_discoveries', ['tool_name'], unique=False)
    op.create_index(op.f('ix_tool_discoveries_status'), 'tool_discoveries', ['status'], unique=False)


def downgrade() -> None:
    # Drop tool_discoveries table
    op.drop_index(op.f('ix_tool_discoveries_status'), table_name='tool_discoveries')
    op.drop_index(op.f('ix_tool_discoveries_tool_name'), table_name='tool_discoveries')
    op.drop_index(op.f('ix_tool_discoveries_wrap_id'), table_name='tool_discoveries')
    op.drop_index(op.f('ix_tool_discoveries_id'), table_name='tool_discoveries')
    op.drop_table('tool_discoveries')

