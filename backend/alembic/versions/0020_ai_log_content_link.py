"""Add content_id/content_type/template_version to ai_interaction_logs — P2b Bloco 1 (REQ-1/2):
liga cada chamada de IA ao conteudo persistido que ela gerou, sem heuristica de timestamp.

Revision ID: 0020_ai_log_content_link
Revises: 0019_recommendation_logs
Create Date: 2026-08-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0020_ai_log_content_link"
down_revision: str | None = "0019_recommendation_logs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("ai_interaction_logs", sa.Column("content_id", sa.Integer(), nullable=True))
    op.add_column("ai_interaction_logs", sa.Column("content_type", sa.String(length=60), nullable=True))
    op.add_column("ai_interaction_logs", sa.Column("template_version", sa.String(length=40), nullable=True))
    op.create_index("ix_ai_interaction_logs_content_type", "ai_interaction_logs", ["content_type"])


def downgrade() -> None:
    op.drop_index("ix_ai_interaction_logs_content_type", table_name="ai_interaction_logs")
    op.drop_column("ai_interaction_logs", "template_version")
    op.drop_column("ai_interaction_logs", "content_type")
    op.drop_column("ai_interaction_logs", "content_id")
