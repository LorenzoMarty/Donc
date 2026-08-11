"""Add ai_generated_exercises — P2c Bloco 1 (REQ-1): fila de revisao real do exercicio gerado
por IA (mesmo padrao de ai_generated_games), substitui o draft efemero anterior.

Revision ID: 0022_ai_generated_exercises
Revises: 0021_ai_attempt_idempotency
Create Date: 2026-08-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0022_ai_gen_exercises"
down_revision: str | None = "0021_ai_attempt_idempotency"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_generated_exercises",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("module_id", sa.Integer(), sa.ForeignKey("modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lesson_id", sa.Integer(), sa.ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("correct_answer", sa.String(length=5), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("skill", sa.String(length=160), nullable=False),
        sa.Column("difficulty", sa.String(length=30), nullable=False, server_default="medium"),
        sa.Column("base_lesson_ids", sa.JSON(), nullable=False),
        sa.Column("targets", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("edited_after_generation", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_ai_generated_exercises_status", "ai_generated_exercises", ["status"])


def downgrade() -> None:
    op.drop_index("ix_ai_generated_exercises_status", table_name="ai_generated_exercises")
    op.drop_table("ai_generated_exercises")
