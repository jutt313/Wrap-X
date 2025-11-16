"""auto_verify_existing_users

Revision ID: a9106c2a44c6
Revises: 7ff15a448dd3
Create Date: 2025-11-14 15:08:26.823900

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9106c2a44c6'
down_revision: Union[str, None] = '7ff15a448dd3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Auto-verify all existing users (created before email verification was added)
    # This allows existing users to login without needing email verification
    op.execute("""
        UPDATE users 
        SET email_verified = TRUE, is_active = TRUE 
        WHERE email_verified = FALSE OR email_verified IS NULL
    """)


def downgrade() -> None:
    # Cannot safely downgrade - would require knowing which users were auto-verified
    pass

