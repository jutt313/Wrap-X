"""add_extracted_text_to_uploaded_documents

Revision ID: 0ae16d796314
Revises: d1f4a1c2b3c4
Create Date: 2025-12-01 11:26:33.318114

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0ae16d796314'
down_revision: Union[str, None] = 'd1f4a1c2b3c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add extracted_text column to uploaded_documents table
    op.add_column('uploaded_documents', sa.Column('extracted_text', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove extracted_text column
    op.drop_column('uploaded_documents', 'extracted_text')

