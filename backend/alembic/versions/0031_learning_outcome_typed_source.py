"""Replace learning_outcomes.source_id (generic int, no FK) with 3 nullable typed FK columns —
exactly one populated per row, matching `source`. Backfills from source_id before dropping it.

Revision ID: 0031_lo_typed_source
Revises: 0030_cognitive_issues_table
Create Date: 2026-08-21

NOTA (2026-08-29): id encurtado de "0031_learning_outcome_typed_source" (34 chars) pra
"0031_lo_typed_source" (20 chars) — o original estourava `alembic_version.version_num`
(VARCHAR(32) padrão do Alembic), derrubando toda migration em produção com
`StringDataRightTruncation`. Nunca chegou a ser gravado com sucesso em nenhum ambiente (a
migration sempre falhou no UPDATE do próprio id), então renomear é seguro — não é um id que já
esteja carimbado em algum `alembic_version` existente.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0031_lo_typed_source"
down_revision: str | None = "0030_cognitive_issues_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "learning_outcomes",
        sa.Column("essay_id", sa.Integer(), sa.ForeignKey("essays.id", ondelete="CASCADE"), nullable=True),
    )
    op.add_column(
        "learning_outcomes",
        sa.Column("game_attempt_id", sa.Integer(), sa.ForeignKey("game_attempts.id", ondelete="CASCADE"), nullable=True),
    )
    op.add_column(
        "learning_outcomes",
        sa.Column("exercise_answer_id", sa.Integer(), sa.ForeignKey("exercise_answers.id", ondelete="CASCADE"), nullable=True),
    )

    conn = op.get_bind()
    conn.execute(sa.text("UPDATE learning_outcomes SET essay_id = source_id WHERE source = 'ESSAY'"))
    conn.execute(sa.text("UPDATE learning_outcomes SET game_attempt_id = source_id WHERE source = 'GAME'"))
    conn.execute(sa.text("UPDATE learning_outcomes SET exercise_answer_id = source_id WHERE source = 'EXERCISE'"))

    op.drop_column("learning_outcomes", "source_id")

    op.create_check_constraint(
        "ck_learning_outcomes_exactly_one_source",
        "learning_outcomes",
        "CAST(essay_id IS NOT NULL AS INTEGER) + CAST(game_attempt_id IS NOT NULL AS INTEGER)"
        " + CAST(exercise_answer_id IS NOT NULL AS INTEGER) = 1",
    )


def downgrade() -> None:
    op.drop_constraint("ck_learning_outcomes_exactly_one_source", "learning_outcomes", type_="check")
    op.add_column("learning_outcomes", sa.Column("source_id", sa.Integer(), nullable=True))

    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE learning_outcomes SET source_id = COALESCE(essay_id, game_attempt_id, exercise_answer_id)"
        )
    )
    op.alter_column("learning_outcomes", "source_id", nullable=False)

    op.drop_column("learning_outcomes", "exercise_answer_id")
    op.drop_column("learning_outcomes", "game_attempt_id")
    op.drop_column("learning_outcomes", "essay_id")
