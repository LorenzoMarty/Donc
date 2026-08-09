"""Add content targeting — P1: lessons/exercises/ai_generated_games declare which CognitiveIssue
codes they train. AIGeneratedGame also gets edited_after_generation for the admin content-quality
report.

Revision ID: 0017_content_targets
Revises: 0016_student_profiles
Create Date: 2026-08-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0017_content_targets"
down_revision: str | None = "0016_student_profiles"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("lessons", sa.Column("targets", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("exercises", sa.Column("targets", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("ai_generated_games", sa.Column("targets", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column(
        "ai_generated_games",
        sa.Column("edited_after_generation", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("ai_generated_games", "edited_after_generation")
    op.drop_column("ai_generated_games", "targets")
    op.drop_column("exercises", "targets")
    op.drop_column("lessons", "targets")
