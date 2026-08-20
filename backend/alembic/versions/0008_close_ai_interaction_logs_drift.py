"""Close schema drift: ai_interaction_logs columns that were only ever created by
the manual startup guard `_ensure_runtime_columns` (since removed from src/main.py),
never by Alembic.

Revision ID: 0008_ai_logs_drift
Revises: 0007_remove_course_entity
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0008_ai_logs_drift"
down_revision: str | None = "0007_remove_course_entity"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _add_if_missing(table: str, column: str, col_def: sa.Column) -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = {c["name"] for c in inspector.get_columns(table)}
    if column not in existing:
        op.add_column(table, col_def)


def upgrade() -> None:
    _add_if_missing("ai_interaction_logs", "input_tokens", sa.Column("input_tokens", sa.Integer(), nullable=False, server_default="0"))
    _add_if_missing("ai_interaction_logs", "output_tokens", sa.Column("output_tokens", sa.Integer(), nullable=False, server_default="0"))
    _add_if_missing("ai_interaction_logs", "cost_micro_usd", sa.Column("cost_micro_usd", sa.BigInteger(), nullable=False, server_default="0"))
    _add_if_missing("ai_interaction_logs", "model", sa.Column("model", sa.String(80), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.drop_column("ai_interaction_logs", "model")
        op.drop_column("ai_interaction_logs", "cost_micro_usd")
        op.drop_column("ai_interaction_logs", "output_tokens")
        op.drop_column("ai_interaction_logs", "input_tokens")
