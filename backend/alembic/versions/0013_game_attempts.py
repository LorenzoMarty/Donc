"""Add game_attempts — server-side source of truth for game outcomes (P0: the client is never
authoritative for pedagogical results; POST /games/complete now persists a validated attempt here
instead of being fire-and-forget).

Revision ID: 0013_game_attempts
Revises: 0012_remove_game_xp_reward
Create Date: 2026-08-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0013_game_attempts"
down_revision: str | None = "0012_remove_game_xp_reward"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "game_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("game_id", sa.String(length=120), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("accuracy", sa.Integer(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("cognitive_outcomes", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_game_attempts_user_id", "game_attempts", ["user_id"])
    op.create_index("ix_game_attempts_game_id", "game_attempts", ["game_id"])


def downgrade() -> None:
    op.drop_index("ix_game_attempts_game_id", table_name="game_attempts")
    op.drop_index("ix_game_attempts_user_id", table_name="game_attempts")
    op.drop_table("game_attempts")
