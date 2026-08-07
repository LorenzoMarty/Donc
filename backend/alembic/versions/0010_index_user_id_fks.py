"""Add index on user_id FKs missing one (essays, lesson_progress, exercise_answers, goals).

Postgres does not index foreign keys automatically. These columns are filtered on every
dashboard/essay-history load; without an index the query degrades to a sequential scan as the
tables grow. Same pattern already used for `ai_jobs`/`ai_interaction_logs` in 0001.

Usa `CREATE INDEX CONCURRENTLY` no Postgres (fora de transação, via `autocommit_block`) para não
travar escritas em `essays`/`lesson_progress`/`exercise_answers`/`goals` durante o deploy — essas
tabelas são lidas e escritas o tempo todo pelo app. SQLite (usado nos testes) não suporta
`CONCURRENTLY`, então cai no `create_index` normal nesse dialeto.

Revision ID: 0010_index_user_id_fks
Revises: 0009_remove_user_progression
Create Date: 2026-08-07
"""

from collections.abc import Sequence

from alembic import op


revision: str = "0010_index_user_id_fks"
down_revision: str | None = "0009_remove_user_progression"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_INDEXES = [
    ("ix_essays_user_id", "essays"),
    ("ix_lesson_progress_user_id", "lesson_progress"),
    ("ix_exercise_answers_user_id", "exercise_answers"),
    ("ix_goals_user_id", "goals"),
]


def upgrade() -> None:
    is_postgres = op.get_bind().dialect.name == "postgresql"
    for index_name, table_name in _INDEXES:
        if is_postgres:
            with op.get_context().autocommit_block():
                op.create_index(index_name, table_name, ["user_id"], postgresql_concurrently=True)
        else:
            op.create_index(index_name, table_name, ["user_id"])


def downgrade() -> None:
    is_postgres = op.get_bind().dialect.name == "postgresql"
    for index_name, table_name in reversed(_INDEXES):
        if is_postgres:
            with op.get_context().autocommit_block():
                op.drop_index(index_name, table_name=table_name, postgresql_concurrently=True)
        else:
            op.drop_index(index_name, table_name=table_name)
