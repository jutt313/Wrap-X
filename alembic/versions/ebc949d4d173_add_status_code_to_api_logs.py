"""add_status_code_to_api_logs

Revision ID: ebc949d4d173
Revises: 7f2ea55251c8
Create Date: 2025-10-30 10:44:33.901292

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ebc949d4d173'
down_revision: Union[str, None] = '7f2ea55251c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add status_code column
    op.add_column('api_logs', sa.Column('status_code', sa.Integer(), nullable=True))
    
    # Add is_success column (default True for existing records)
    op.add_column('api_logs', sa.Column('is_success', sa.Boolean(), nullable=True, server_default='true'))
    
    # Update is_success based on status_code for existing records (200-299 = success)
    op.execute("""
        UPDATE api_logs 
        SET is_success = CASE 
            WHEN status_code >= 200 AND status_code < 300 THEN true 
            ELSE false 
        END 
        WHERE status_code IS NOT NULL
    """)
    
    # Create index on status_code for faster queries
    op.create_index(op.f('ix_api_logs_status_code'), 'api_logs', ['status_code'], unique=False)
    
    # Create index on is_success for filtering
    op.create_index(op.f('ix_api_logs_is_success'), 'api_logs', ['is_success'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_api_logs_is_success'), table_name='api_logs')
    op.drop_index(op.f('ix_api_logs_status_code'), table_name='api_logs')
    
    # Drop columns
    op.drop_column('api_logs', 'is_success')
    op.drop_column('api_logs', 'status_code')

