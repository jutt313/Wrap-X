"""add_file_path_to_tool_integrations

Revision ID: 322825ad1f9c
Revises: a1b2c3d4e5f6
Create Date: 2025-12-08 08:43:57.659763

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '322825ad1f9c'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tool_integrations', sa.Column('file_path', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('tool_integrations', 'file_path')

