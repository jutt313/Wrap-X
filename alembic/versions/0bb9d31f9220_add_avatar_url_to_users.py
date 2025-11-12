"""add_avatar_url_to_users

Revision ID: 0bb9d31f9220
Revises: ebc949d4d173
Create Date: 2025-10-30 15:25:16.284283

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0bb9d31f9220'
down_revision: Union[str, None] = 'ebc949d4d173'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

