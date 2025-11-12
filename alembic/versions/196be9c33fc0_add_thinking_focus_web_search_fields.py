"""add_thinking_focus_web_search_fields

Revision ID: 196be9c33fc0
Revises: 40264bad3144
Create Date: 2025-01-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '196be9c33fc0'
down_revision: Union[str, None] = '40264bad3144'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add thinking_focus, web_search, and web_search_triggers columns to wrapped_apis table
    op.add_column('wrapped_apis', sa.Column('thinking_focus', sa.Text(), nullable=True))
    op.add_column('wrapped_apis', sa.Column('web_search', sa.String(), nullable=True))
    op.add_column('wrapped_apis', sa.Column('web_search_triggers', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove the columns
    op.drop_column('wrapped_apis', 'web_search_triggers')
    op.drop_column('wrapped_apis', 'web_search')
    op.drop_column('wrapped_apis', 'thinking_focus')

