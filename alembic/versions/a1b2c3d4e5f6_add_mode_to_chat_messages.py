"""add_mode_to_chat_messages

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e6
Create Date: 2025-12-03 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add mode column to chat_messages table
    op.add_column('chat_messages', sa.Column('mode', sa.String(length=20), nullable=True, server_default='wrap'))
    
    # Create index on mode for faster filtering
    op.create_index(op.f('ix_chat_messages_mode'), 'chat_messages', ['mode'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_chat_messages_mode'), table_name='chat_messages')
    op.drop_column('chat_messages', 'mode')

