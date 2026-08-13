"""Backfill id estavel por pergunta em AIGeneratedGame.questions — P3a REQ-1/REQ-12.

Sem mudanca de schema (questions continua JSON) — so preenche `id` nas perguntas que ainda nao
tem, pra add/remove/reorder/regenerar granular (P3a) terem uma referencia estavel por posicao.
`AdminGameReviewService._game_to_read` ja faz esse backfill de forma preguicosa em qualquer
leitura, entao esta migracao e so pra garantir que dados existentes ja estejam consistentes antes
do deploy do editor granular, sem depender de alguem abrir cada jogo no admin primeiro.

Revision ID: 0025_game_question_ids
Revises: 0024_content_archived
Create Date: 2026-08-11
"""

import json
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0025_game_question_ids"
down_revision: str | None = "0024_content_archived"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    games_table = sa.table(
        "ai_generated_games",
        sa.column("id", sa.Integer),
        sa.column("questions", sa.JSON),
    )
    rows = bind.execute(sa.select(games_table.c.id, games_table.c.questions)).fetchall()
    for game_id, questions in rows:
        if not questions:
            continue
        raw = json.loads(questions) if isinstance(questions, str) else questions
        changed = False
        backfilled = []
        for question in raw:
            if question.get("id"):
                backfilled.append(question)
                continue
            backfilled.append({**question, "id": uuid.uuid4().hex[:8]})
            changed = True
        if changed:
            bind.execute(
                games_table.update().where(games_table.c.id == game_id).values(questions=backfilled)
            )


def downgrade() -> None:
    # Backfill de dado nao tem downgrade estrutural (nao remove coluna nenhuma) — remover o `id`
    # de cada pergunta de volta nao traz beneficio nenhum, entao e no-op.
    pass
