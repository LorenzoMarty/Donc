"""Lessons get a published flag (draft/published) for third-party content.

Existing lessons stay published so nothing disappears for current students.

Revision ID: 0042_lesson_published
Revises: 0041_user_terms_acceptance
Create Date: 2026-10-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0042_lesson_published"
down_revision: str | None = "0041_user_terms_acceptance"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("lessons", sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("lessons", "published")
