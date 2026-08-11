"""ContentVersion — P2c Bloco 2 (REQ-6..10): historico simples de versoes de conteudo IA
editado. Nao e um "git de conteudo" — so uma lista cronologica de snapshots do estado ANTES de
cada edicao pos-criacao, o suficiente pra recuperar a versao anterior."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database.session import Base


class ContentVersion(Base):
    __tablename__ = "content_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    content_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    content_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    edited_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
