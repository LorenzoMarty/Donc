"""Fila de revisao unificada — P3b REQ-4: agrega itens pendentes (por padrao) de jogo, exercicio
e tema numa lista so, com filtros comuns. Le direto dos 3 modelos — nao introduz uma tabela nova,
so uma camada de leitura sobre o que ja existe (AIGeneratedGame/AIGeneratedExercise/EssayTheme)."""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.essay import EssayTheme
from src.models.events import AIGeneratedExercise, AIGeneratedGame
from src.schemas.admin import ReviewQueueItem


class AdminReviewQueueService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_queue(
        self,
        *,
        content_type: str | None = None,
        status: str = "pending",
        target: str | None = None,
        difficulty: str | None = None,
        created_from: date | None = None,
    ) -> list[ReviewQueueItem]:
        items: list[ReviewQueueItem] = []

        if content_type in (None, "game"):
            query = select(AIGeneratedGame).where(AIGeneratedGame.status == status)
            if difficulty:
                query = query.where(AIGeneratedGame.difficulty == difficulty)
            if created_from:
                query = query.where(AIGeneratedGame.created_at >= created_from)
            for game in self.db.scalars(query):
                if target and target not in (game.targets or []):
                    continue
                items.append(
                    ReviewQueueItem(
                        content_type="game",
                        content_id=game.id,
                        title=game.name,
                        skill=game.skill,
                        difficulty=game.difficulty,
                        targets=game.targets or [],
                        status=game.status,
                        created_at=game.created_at,
                    )
                )

        if content_type in (None, "exercise"):
            query = select(AIGeneratedExercise).where(AIGeneratedExercise.status == status)
            if difficulty:
                query = query.where(AIGeneratedExercise.difficulty == difficulty)
            if created_from:
                query = query.where(AIGeneratedExercise.created_at >= created_from)
            for exercise in self.db.scalars(query):
                if target and target not in (exercise.targets or []):
                    continue
                items.append(
                    ReviewQueueItem(
                        content_type="exercise",
                        content_id=exercise.id,
                        title=exercise.statement,
                        skill=exercise.skill,
                        difficulty=exercise.difficulty,
                        targets=exercise.targets or [],
                        status=exercise.status,
                        created_at=exercise.created_at,
                    )
                )

        if content_type in (None, "theme") and not target and not difficulty:
            # EssayTheme nao tem targets/dificuldade — filtro por qualquer um dos dois exclui tema.
            theme_query = select(EssayTheme).where(EssayTheme.status == status)
            if created_from:
                theme_query = theme_query.where(EssayTheme.created_at >= created_from)
            for theme in self.db.scalars(theme_query):
                items.append(
                    ReviewQueueItem(
                        content_type="theme",
                        content_id=theme.id,
                        title=theme.title,
                        skill=None,
                        difficulty=None,
                        targets=[],
                        status=theme.status,
                        created_at=theme.created_at,
                    )
                )

        items.sort(key=lambda item: item.created_at, reverse=True)
        return items
