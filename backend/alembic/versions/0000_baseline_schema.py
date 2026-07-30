"""Baseline schema: creates the base tables the current models define, if missing.

Historical gap found while consolidating schema management onto Alembic (see
0008/0009): migrations 0001-0009 only ever added columns *on top of* a schema
that was actually provisioned by `Base.metadata.create_all()` at application
startup — no migration ever created the base tables (`users`, `essays`,
`lessons`, `modules`, `exercises`, ...). Running `alembic upgrade head`
against a truly empty database failed before this migration existed.

This migration closes that gap using `checkfirst=True`, so it is a safe no-op
against any database that already has these tables (every existing
deployment, which got them via `create_all()`) and only actually creates
tables on a genuinely empty database.

Only the tables NOT already created by a later migration are listed here —
`ai_jobs`, `student_learning_profiles`, `ai_knowledge_documents`,
`ai_knowledge_chunks`, `ai_interaction_logs` (0001), `user_events`,
`ai_generated_games` (0003) and `module_items` (0004) keep being created by
their own migration, to avoid a "table already exists" conflict.

Revision ID: 0000_baseline_schema
Revises:
Create Date: 2026-07-30
"""

from collections.abc import Sequence

from alembic import op

from src.database.session import Base
from src.models import *  # noqa: F401,F403 - garante que todas as tabelas estao registradas


revision: str = "0000_baseline_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TABLES_CREATED_BY_LATER_MIGRATIONS = {
    "ai_jobs",
    "student_learning_profiles",
    "ai_knowledge_documents",
    "ai_knowledge_chunks",
    "ai_interaction_logs",
    "user_events",
    "ai_generated_games",
    "module_items",
}


def upgrade() -> None:
    baseline_tables = [
        table
        for name, table in Base.metadata.tables.items()
        if name not in _TABLES_CREATED_BY_LATER_MIGRATIONS
    ]
    Base.metadata.create_all(bind=op.get_bind(), tables=baseline_tables, checkfirst=True)


def downgrade() -> None:
    # Intencionalmente um no-op: esta e a migracao raiz que representa "banco
    # do jeito que create_all() sempre deixou". Descer dela significaria
    # apagar todas as tabelas da aplicacao - destrutivo demais para ser
    # automatico. Se precisar zerar o banco, use scripts/reset_production_data.py.
    pass
