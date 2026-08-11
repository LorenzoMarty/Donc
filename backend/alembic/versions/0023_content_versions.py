"""Add content_versions — P2c Bloco 2 (REQ-6): historico simples de versoes de conteudo IA
editado (AIGeneratedGame/AIGeneratedExercise/EssayTheme).

Revision ID: 0023_content_versions
Revises: 0022_ai_gen_exercises
Create Date: 2026-08-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0023_content_versions"
down_revision: str | None = "0022_ai_gen_exercises"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "content_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("content_type", sa.String(length=60), nullable=False),
        sa.Column("content_id", sa.Integer(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("edited_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_content_versions_content_type", "content_versions", ["content_type"])
    op.create_index("ix_content_versions_content_id", "content_versions", ["content_id"])
    op.create_index("ix_content_versions_created_at", "content_versions", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_content_versions_created_at", table_name="content_versions")
    op.drop_index("ix_content_versions_content_id", table_name="content_versions")
    op.drop_index("ix_content_versions_content_type", table_name="content_versions")
    op.drop_table("content_versions")
