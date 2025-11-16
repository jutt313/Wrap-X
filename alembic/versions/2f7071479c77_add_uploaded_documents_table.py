"""add_uploaded_documents_table

Revision ID: 2f7071479c77
Revises: bf17b2c50111
Create Date: 2025-11-16 14:03:38.546521

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2f7071479c77'
down_revision: Union[str, None] = 'bf17b2c50111'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create uploaded_documents table
    op.create_table(
        'uploaded_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wrapped_api_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('file_type', sa.String(), nullable=False),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['wrapped_api_id'], ['wrapped_apis.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_uploaded_documents_id'), 'uploaded_documents', ['id'], unique=False)
    op.create_index(op.f('ix_uploaded_documents_wrapped_api_id'), 'uploaded_documents', ['wrapped_api_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_uploaded_documents_wrapped_api_id'), table_name='uploaded_documents')
    op.drop_index(op.f('ix_uploaded_documents_id'), table_name='uploaded_documents')
    op.drop_table('uploaded_documents')

