"""add_public_id_to_projects

Revision ID: 7526a4d87f04
Revises: 0bb9d31f9220
Create Date: 2025-10-30 16:18:26.214141

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7526a4d87f04'
down_revision: Union[str, None] = '0bb9d31f9220'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('projects', sa.Column('public_id', sa.String(length=64), nullable=True))
    op.create_index(op.f('ix_projects_public_id'), 'projects', ['public_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_projects_public_id'), table_name='projects')
    op.drop_column('projects', 'public_id')

