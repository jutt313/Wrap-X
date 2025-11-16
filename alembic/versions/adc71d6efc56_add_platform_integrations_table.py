"""add_platform_integrations_table

Revision ID: adc71d6efc56
Revises: a9106c2a44c6
Create Date: 2025-11-16 13:06:23.516650

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'adc71d6efc56'
down_revision: Union[str, None] = 'a9106c2a44c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

