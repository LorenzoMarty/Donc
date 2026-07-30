"""Remove the account-level XP/level progression system.

Drops `users.xp`, `users.level` and the `learning_rewards` table. This is a
temporary rollback of gamification, not a replacement — no new columns are
introduced.

Revision ID: 0009_remove_user_progression
Revises: 0008_close_ai_interaction_logs_drift
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0009_remove_user_progression"
down_revision: str | None = "0008_close_ai_interaction_logs_drift"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    user_columns = {c["name"] for c in inspector.get_columns("users")}
    if "xp" in user_columns:
        op.drop_column("users", "xp")
    if "level" in user_columns:
        op.drop_column("users", "level")

    if "learning_rewards" in inspector.get_table_names():
        op.drop_table("learning_rewards")


def downgrade() -> None:
    op.add_column("users", sa.Column("xp", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("level", sa.Integer(), nullable=False, server_default="1"))

    op.create_table(
        "learning_rewards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reward_type", sa.String(24), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=False),
        sa.Column("xp", sa.Integer(), nullable=False),
        sa.Column("awarded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "reward_type", "target_id", name="uq_learning_reward_user_target"),
    )
