"""add_email_verification_fields

Revision ID: 7ff15a448dd3
Revises: aed13e4eec0b
Create Date: 2025-11-14 09:43:40.764293

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7ff15a448dd3'
down_revision: Union[str, None] = 'aed13e4eec0b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email verification fields
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('email_verification_token', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove email verification fields
    op.drop_column('users', 'email_verification_token')
    op.drop_column('users', 'email_verified')

