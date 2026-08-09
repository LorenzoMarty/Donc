"""Extend student_learning_profiles with latest_competencies, score_trend and cognitive_issues —
P0 core adaptive: StudentLearningProfile becomes the central pedagogical state, CognitiveIssue
gains explicit DETECTED/TRAINING/IMPROVING/MASTERED states.

Revision ID: 0014_slp_cognitive_issues
Revises: 0013_game_attempts
Create Date: 2026-08-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0014_slp_cognitive_issues"
down_revision: str | None = "0013_game_attempts"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "student_learning_profiles",
        sa.Column("latest_competencies", sa.JSON(), nullable=False, server_default="{}"),
    )
    op.add_column(
        "student_learning_profiles",
        sa.Column("score_trend", sa.JSON(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "student_learning_profiles",
        sa.Column("cognitive_issues", sa.JSON(), nullable=False, server_default="{}"),
    )


def downgrade() -> None:
    op.drop_column("student_learning_profiles", "cognitive_issues")
    op.drop_column("student_learning_profiles", "score_trend")
    op.drop_column("student_learning_profiles", "latest_competencies")
