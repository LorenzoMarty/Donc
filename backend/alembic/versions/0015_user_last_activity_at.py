"""Add users.last_activity_at — P0 fix streak: separates presence (last_seen_at, touched on
every authenticated request) from real pedagogical activity (last_activity_at, only touched by
game completion, exercise submission, lesson completion, essay submission).

Revision ID: 0015_user_last_activity_at
Revises: 0014_student_learning_profile_cognitive_issues
Create Date: 2026-08-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0015_user_last_activity_at"
down_revision: str | None = "0014_student_learning_profile_cognitive_issues"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_activity_at")
