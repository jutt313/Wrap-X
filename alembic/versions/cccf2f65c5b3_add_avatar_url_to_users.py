"""add_avatar_url_to_users

Revision ID: cccf2f65c5b3
Revises: 196be9c33fc0
Create Date: 2025-11-06 08:54:17.015926

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cccf2f65c5b3'
down_revision: Union[str, None] = '196be9c33fc0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add avatar_url column to users table if it doesn't exist
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'avatar_url' not in columns:
        op.add_column('users', sa.Column('avatar_url', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove avatar_url column from users table if it exists
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'avatar_url' in columns:
        op.drop_column('users', 'avatar_url')

