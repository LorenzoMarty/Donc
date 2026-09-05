from datetime import datetime
from enum import Enum

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from src.database.session import Base


class PlanCycle(str, Enum):
    MONTHLY = "monthly"
    ANNUAL = "annual"


class SubscriptionStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    GRACE = "grace"
    SUSPENDED = "suspended"
    CANCELED = "canceled"


class DiscountType(str, Enum):
    PERCENT = "percent"
    FIXED = "fixed"


class Subscription(Base):
    """Uma assinatura por usuario (REQ-7 troca de plano no lugar em vez de criar outra linha).
    `mp_preapproval_id` referencia o recurso Preapproval da API de Assinaturas do Mercado Pago.
    """

    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    cycle: Mapped[PlanCycle] = mapped_column(SQLEnum(PlanCycle), nullable=False)
    status: Mapped[SubscriptionStatus] = mapped_column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.PENDING, nullable=False)
    mp_preapproval_id: Mapped[str | None] = mapped_column(String(120), unique=True, nullable=True)
    price_charged_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    coupon_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    # Evita contar o cupom de novo a cada webhook redundante de uma mesma assinatura que ja pagou.
    coupon_applied: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Fim do periodo ja pago — fonte da verdade para "acesso mantido ate o fim do periodo" (REQ-5)
    # e para o corte de graca (REQ-4), junto com `grace_until`.
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    grace_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Marca a intencao de cancelar (usuario pediu) sem cortar acesso na hora — o corte real
    # acontece quando `current_period_end` passa (calculado em `effective_status`).
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Coupon(Base):
    __tablename__ = "coupons"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    discount_type: Mapped[DiscountType] = mapped_column(SQLEnum(DiscountType), nullable=False)
    # Percent: 1-100. Fixed: centavos.
    discount_value: Mapped[int] = mapped_column(Integer, nullable=False)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ProcessedWebhookEvent(Base):
    """Deduplicacao de notificacoes do Mercado Pago — o mesmo evento pode ser reentregue
    (retry do provedor); sem isso um webhook duplicado reprocessaria a mudanca de status
    (ex.: contar o mesmo cupom duas vezes)."""

    __tablename__ = "processed_webhook_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    mp_notification_id: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
