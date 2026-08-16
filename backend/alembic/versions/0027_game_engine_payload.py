"""Add ai_generated_games.engine + payload — spec migrar-jogos-estaticos-para-banco REQ-1.

`engine` identifica qual dos 13 engines de jogo o registro representa (default "quiz" pras linhas
existentes, unico engine ja suportado por AIGeneratedGame ate aqui). `payload` e JSON generico pros
12 formatos nao-quiz (classify/order/fillBlank/duel/escalation/artificiality/corrector/
essayCollapse/textSurgery/survival) — `questions` continua exclusivo de conteudo tipo
pergunta+alternativas (quiz/timed-rush/choice).

Revision ID: 0027_game_engine_payload
Revises: 0026_essay_theme_status
Create Date: 2026-08-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0027_game_engine_payload"
down_revision: str | None = "0026_essay_theme_status"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("ai_generated_games", sa.Column("engine", sa.String(30), nullable=False, server_default="quiz"))
    op.add_column("ai_generated_games", sa.Column("payload", sa.JSON(), nullable=True))
    op.add_column("ai_generated_games", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("ai_generated_games", sa.Column("thumbnail", sa.String(80), nullable=True))
    op.add_column("ai_generated_games", sa.Column("estimated_time", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("ai_generated_games", "estimated_time")
    op.drop_column("ai_generated_games", "thumbnail")
    op.drop_column("ai_generated_games", "description")
    op.drop_column("ai_generated_games", "payload")
    op.drop_column("ai_generated_games", "engine")
