from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.events import AIGeneratedGame


class GameService:
    """Serve conteudo de jogos para alunos (somente leitura)."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def published(self) -> list[AIGeneratedGame]:
        return list(
            self.db.scalars(
                select(AIGeneratedGame)
                .where(AIGeneratedGame.status == "approved")
                .order_by(AIGeneratedGame.created_at.desc())
            )
        )
