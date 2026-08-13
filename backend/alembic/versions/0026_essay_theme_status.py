"""Add essay_themes.status — P3b REQ-1/REQ-3: EssayTheme entra no mesmo padrao
pending/approved/rejected que AIGeneratedGame/AIGeneratedExercise ja tem. server_default garante
que todo tema hoje existente (ativo ou nao) vira "approved" — backfill automatico, sem tocar em
is_active de ninguem.

Revision ID: 0026_essay_theme_status
Revises: 0025_game_question_ids
Create Date: 2026-08-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0026_essay_theme_status"
down_revision: str | None = "0025_game_question_ids"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("essay_themes", sa.Column("status", sa.String(20), nullable=False, server_default="approved"))


def downgrade() -> None:
    op.drop_column("essay_themes", "status")
