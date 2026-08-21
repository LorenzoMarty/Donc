"""StaticGame — registro mínimo dos jogos do catálogo estático (frontend/src/games/*), pra
validar `game_id` no backend (auditoria arquitetural 2026-08-21). Não duplica a definição do jogo
(perguntas/regras continuam só no frontend) — só existência + categoria, o mínimo pra fechar o
buraco de `game_id` forjado gravando progresso sem tentativa real. Seed manual em
alembic/versions/0033_static_games.py; não sincroniza automaticamente se o catálogo do frontend
mudar (risco documentado — precisa de nova migration quando um jogo estático for adicionado)."""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from src.database.session import Base


class StaticGame(Base):
    __tablename__ = "static_games"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
