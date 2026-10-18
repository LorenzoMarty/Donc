"""Weekly streak freeze: users.streak_freeze_week.

Revision ID: 0043_streak_freeze
Revises: 0042_lesson_published
Create Date: 2026-10-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0043_streak_freeze"
down_revision: str | None = "0042_lesson_published"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("streak_freeze_week", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "streak_freeze_week")
