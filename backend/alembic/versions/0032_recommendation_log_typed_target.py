"""Replace recommendation_logs.target (free text) with typed columns — lesson_id/exercise_id
(real FK) + target_hub (string, GAME case has no persisted hub entity). Backfills from target
before dropping it.

Revision ID: 0032_reclog_typed_target
Revises: 0031_lo_typed_source
Create Date: 2026-08-21

NOTA (2026-08-29): id encurtado de "0032_recommendation_log_typed_target" (36 chars) pra
"0032_reclog_typed_target" (24 chars) — mesmo motivo do 0031 (estourava
`alembic_version.version_num`, VARCHAR(32)). Nunca gravado com sucesso em nenhum ambiente.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0032_reclog_typed_target"
down_revision: str | None = "0031_lo_typed_source"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "recommendation_logs",
        sa.Column("lesson_id", sa.Integer(), sa.ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True),
    )
    op.add_column(
        "recommendation_logs",
        sa.Column("exercise_id", sa.Integer(), sa.ForeignKey("exercises.id", ondelete="SET NULL"), nullable=True),
    )
    op.add_column("recommendation_logs", sa.Column("target_hub", sa.String(length=40), nullable=True))

    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE recommendation_logs SET lesson_id = CAST(target AS INTEGER)"
            " WHERE action_type = 'LESSON' AND target IS NOT NULL"
        )
    )
    conn.execute(
        sa.text(
            "UPDATE recommendation_logs SET exercise_id = CAST(target AS INTEGER)"
            " WHERE action_type = 'EXERCISE' AND target IS NOT NULL"
        )
    )
    conn.execute(
        sa.text("UPDATE recommendation_logs SET target_hub = target WHERE action_type = 'GAME' AND target IS NOT NULL")
    )

    op.drop_column("recommendation_logs", "target")


def downgrade() -> None:
    op.add_column("recommendation_logs", sa.Column("target", sa.String(length=120), nullable=True))

    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE recommendation_logs SET target = CAST(lesson_id AS TEXT) WHERE lesson_id IS NOT NULL"
        )
    )
    conn.execute(
        sa.text(
            "UPDATE recommendation_logs SET target = CAST(exercise_id AS TEXT) WHERE exercise_id IS NOT NULL"
        )
    )
    conn.execute(sa.text("UPDATE recommendation_logs SET target = target_hub WHERE target_hub IS NOT NULL"))

    op.drop_column("recommendation_logs", "target_hub")
    op.drop_column("recommendation_logs", "exercise_id")
    op.drop_column("recommendation_logs", "lesson_id")
