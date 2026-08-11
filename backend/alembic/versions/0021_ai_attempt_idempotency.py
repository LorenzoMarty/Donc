"""Add attempt/idempotency_key to ai_interaction_logs and idempotency_key to ai_jobs — P2b
Bloco 3 (REQ-7/8/9): tentativa em falha, retry/duplo-clique nunca gera/cobra duas vezes.

Revision ID: 0021_ai_attempt_idempotency
Revises: 0020_ai_log_content_link
Create Date: 2026-08-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0021_ai_attempt_idempotency"
down_revision: str | None = "0020_ai_log_content_link"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("ai_interaction_logs", sa.Column("attempt", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("ai_interaction_logs", sa.Column("idempotency_key", sa.String(length=80), nullable=True))
    op.create_index("ix_ai_interaction_logs_idempotency_key", "ai_interaction_logs", ["idempotency_key"])

    op.add_column("ai_jobs", sa.Column("idempotency_key", sa.String(length=80), nullable=True))
    op.create_index("ix_ai_jobs_idempotency_key", "ai_jobs", ["idempotency_key"])
    op.add_column("ai_jobs", sa.Column("attempt", sa.Integer(), nullable=False, server_default="1"))


def downgrade() -> None:
    op.drop_column("ai_jobs", "attempt")
    op.drop_index("ix_ai_jobs_idempotency_key", table_name="ai_jobs")
    op.drop_column("ai_jobs", "idempotency_key")

    op.drop_index("ix_ai_interaction_logs_idempotency_key", table_name="ai_interaction_logs")
    op.drop_column("ai_interaction_logs", "idempotency_key")
    op.drop_column("ai_interaction_logs", "attempt")
