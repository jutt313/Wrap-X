"""align_thinking_mode_and_backfill_web_search

Revision ID: 3a1b0b8e9b21
Revises: 2f7071479c77
Create Date: 2025-11-17 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a1b0b8e9b21'
down_revision: Union[str, None] = '2f7071479c77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = {c['name'] for c in inspector.get_columns('wrapped_apis')}

    # Add columns if missing (idempotent across environments)
    if 'thinking_focus' not in cols:
        op.add_column('wrapped_apis', sa.Column('thinking_focus', sa.Text(), nullable=True))
    if 'web_search' not in cols:
        op.add_column('wrapped_apis', sa.Column('web_search', sa.String(), nullable=True))
    if 'web_search_triggers' not in cols:
        op.add_column('wrapped_apis', sa.Column('web_search_triggers', sa.Text(), nullable=True))

    # Normalize thinking_mode values from legacy to new
    # always_on -> always, always_off -> off, custom -> conditional
    op.execute("UPDATE wrapped_apis SET thinking_mode = 'always' WHERE thinking_mode = 'always_on'")
    op.execute("UPDATE wrapped_apis SET thinking_mode = 'off' WHERE thinking_mode = 'always_off'")
    op.execute("UPDATE wrapped_apis SET thinking_mode = 'conditional' WHERE thinking_mode = 'custom'")

    # Backfill web_search enum from legacy boolean
    if 'web_search_enabled' in cols:
        op.execute("UPDATE wrapped_apis SET web_search = 'always' WHERE web_search_enabled = TRUE AND (web_search IS NULL OR web_search = '')")
        op.execute("UPDATE wrapped_apis SET web_search = 'off' WHERE (web_search_enabled = FALSE OR web_search_enabled IS NULL) AND (web_search IS NULL OR web_search = '')")


def downgrade() -> None:
    # Best-effort downgrade: leave data but drop added columns if they were created here
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = {c['name'] for c in inspector.get_columns('wrapped_apis')}
    if 'web_search_triggers' in cols:
        op.drop_column('wrapped_apis', 'web_search_triggers')
    if 'web_search' in cols:
        op.drop_column('wrapped_apis', 'web_search')
    if 'thinking_focus' in cols:
        op.drop_column('wrapped_apis', 'thinking_focus')

