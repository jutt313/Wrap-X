"""add_config_version_and_audit_fields

Revision ID: aed13e4eec0b
Revises: 58b3f6f8a0ea
Create Date: 2025-11-11 12:17:26.690175

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'aed13e4eec0b'
down_revision: Union[str, None] = '58b3f6f8a0ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add config_version column to wrapped_apis table
    op.add_column('wrapped_apis', sa.Column('config_version', sa.Integer(), nullable=False, server_default='0'))
    
    # Add user_id column to config_versions table
    op.add_column('config_versions', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_config_versions_user_id',
        'config_versions', 'users',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Rename version to version_number in config_versions table
    op.alter_column('config_versions', 'version', new_column_name='version_number')
    
    # Add changes column to config_versions table
    op.add_column('config_versions', sa.Column('changes', postgresql.JSON(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    # Remove changes column
    op.drop_column('config_versions', 'changes')
    
    # Rename version_number back to version
    op.alter_column('config_versions', 'version_number', new_column_name='version')
    
    # Remove user_id column and foreign key
    op.drop_constraint('fk_config_versions_user_id', 'config_versions', type_='foreignkey')
    op.drop_column('config_versions', 'user_id')
    
    # Remove config_version column from wrapped_apis
    op.drop_column('wrapped_apis', 'config_version')

