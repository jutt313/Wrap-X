"""add_web_search_thinking_enabled_columns

Revision ID: bf17b2c50111
Revises: adc71d6efc56
Create Date: 2025-11-16 13:55:08.145286

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bf17b2c50111'
down_revision: Union[str, None] = 'adc71d6efc56'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add tool toggle columns to wrapped_apis table (if they don't exist)
    # Check if columns exist first
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('wrapped_apis')]
    
    if 'web_search_enabled' not in columns:
        op.add_column('wrapped_apis', sa.Column('web_search_enabled', sa.Boolean(), nullable=False, server_default='false'))
    if 'thinking_enabled' not in columns:
        op.add_column('wrapped_apis', sa.Column('thinking_enabled', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Drop tool toggle columns from wrapped_apis
    op.drop_column('wrapped_apis', 'thinking_enabled')
    op.drop_column('wrapped_apis', 'web_search_enabled')

