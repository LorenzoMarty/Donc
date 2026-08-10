"""Add learning_outcomes — P2a: append-only evidence log behind CognitiveIssue, distinct from
the mutable aggregate in student_learning_profiles.cognitive_issues.

Revision ID: 0018_learning_outcomes
Revises: 0017_content_targets
Create Date: 2026-08-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0018_learning_outcomes"
down_revision: str | None = "0017_content_targets"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "learning_outcomes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cognitive_issue_code", sa.String(length=40), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("source_id", sa.Integer(), nullable=False),
        sa.Column("direction", sa.String(length=8), nullable=False),
        sa.Column("weight", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_learning_outcomes_user_id", "learning_outcomes", ["user_id"])
    op.create_index("ix_learning_outcomes_cognitive_issue_code", "learning_outcomes", ["cognitive_issue_code"])
    op.create_index("ix_learning_outcomes_created_at", "learning_outcomes", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_learning_outcomes_created_at", table_name="learning_outcomes")
    op.drop_index("ix_learning_outcomes_cognitive_issue_code", table_name="learning_outcomes")
    op.drop_index("ix_learning_outcomes_user_id", table_name="learning_outcomes")
    op.drop_table("learning_outcomes")
