"""Add recommendation_logs — P2a: tracking do ciclo recomendacao (shown/started/completed) ate
o LearningOutcome que ela produziu.

Revision ID: 0019_recommendation_logs
Revises: 0018_learning_outcomes
Create Date: 2026-08-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0019_recommendation_logs"
down_revision: str | None = "0018_learning_outcomes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "recommendation_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action_type", sa.String(length=20), nullable=False),
        sa.Column("target_issue", sa.String(length=40), nullable=True),
        sa.Column("target", sa.String(length=120), nullable=True),
        sa.Column("shown_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "learning_outcome_id",
            sa.Integer(),
            sa.ForeignKey("learning_outcomes.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_recommendation_logs_user_id", "recommendation_logs", ["user_id"])
    op.create_index("ix_recommendation_logs_target_issue", "recommendation_logs", ["target_issue"])
    op.create_index("ix_recommendation_logs_shown_at", "recommendation_logs", ["shown_at"])


def downgrade() -> None:
    op.drop_index("ix_recommendation_logs_shown_at", table_name="recommendation_logs")
    op.drop_index("ix_recommendation_logs_target_issue", table_name="recommendation_logs")
    op.drop_index("ix_recommendation_logs_user_id", table_name="recommendation_logs")
    op.drop_table("recommendation_logs")
