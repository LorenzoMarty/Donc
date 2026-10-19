"""Referral — indicação de amigo: quem indicou, quem foi indicado e se o benefício já foi liberado."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database.session import Base


class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[int] = mapped_column(primary_key=True)
    referrer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Um aluno só pode ter sido indicado uma vez.
    referred_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(40), nullable=False)
    # "pending": indicado iniciou o checkout com o código; "rewarded": primeiro pagamento confirmado.
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    rewarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Quando o dono aplicou o crédito (1 mês grátis) na cobrança do indicador.
    reward_applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
