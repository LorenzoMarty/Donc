"""Remove ai_generated_games.xp_reward — P0 remove XP/conquistas/simulados from the product;
games stay as pedagogical tools, no XP reward attached to them anymore.

Revision ID: 0012_remove_game_xp_reward
Revises: 0011_essay_last_ai_job_id
Create Date: 2026-08-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0012_remove_game_xp_reward"
down_revision: str | None = "0011_essay_last_ai_job_id"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("ai_generated_games", "xp_reward")


def downgrade() -> None:
    op.add_column(
        "ai_generated_games",
        sa.Column("xp_reward", sa.Integer(), nullable=False, server_default="40"),
    )
