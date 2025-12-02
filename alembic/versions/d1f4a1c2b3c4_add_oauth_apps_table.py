"""
add_oauth_apps_table

Revision ID: d1f4a1c2b3c4
Revises: c4f8e2a1b3d5
Create Date: 2025-11-28 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd1f4a1c2b3c4'
down_revision: Union[str, None] = 'c4f8e2a1b3d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'oauth_apps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wrapped_api_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('client_id', sa.Text(), nullable=True),
        sa.Column('client_secret_encrypted', sa.Text(), nullable=True),
        sa.Column('redirect_url', sa.Text(), nullable=True),
        sa.Column('scopes', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('access_token_encrypted', sa.Text(), nullable=True),
        sa.Column('refresh_token_encrypted', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('state_token', sa.String(length=128), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['wrapped_api_id'], ['wrapped_apis.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('wrapped_api_id', 'provider', name='uq_oauth_apps_wrap_provider')
    )
    op.create_index(op.f('ix_oauth_apps_id'), 'oauth_apps', ['id'], unique=False)
    op.create_index(op.f('ix_oauth_apps_wrapped_api_id'), 'oauth_apps', ['wrapped_api_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_oauth_apps_wrapped_api_id'), table_name='oauth_apps')
    op.drop_index(op.f('ix_oauth_apps_id'), table_name='oauth_apps')
    op.drop_table('oauth_apps')


