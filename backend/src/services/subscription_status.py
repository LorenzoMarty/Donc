from datetime import UTC, datetime

from src.models import SubscriptionStatus, UserRole
from src.models.subscription import Subscription


def _as_aware(value: datetime | None) -> datetime | None:
    # SQLite (usado nos testes) nao preserva tzinfo em DateTime(timezone=True) — volta naive do
    # banco. Toda escrita do projeto usa UTC, entao naive == UTC aqui.
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def effective_status(subscription: Subscription, *, now: datetime) -> SubscriptionStatus:
    """Recalcula o status "de verdade" a partir de `now`, sem depender de um job periodico:
    graca expirada vira suspensa (REQ-4), cancelamento pedido so corta acesso quando o periodo
    ja pago passou (REQ-5). Callers que persistem o resultado (ex.: no webhook) mantem a coluna
    `status` alinhada; quem so precisa decidir acesso pode chamar isso sem gravar nada."""
    grace_until = _as_aware(subscription.grace_until)
    current_period_end = _as_aware(subscription.current_period_end)

    if subscription.status == SubscriptionStatus.GRACE:
        if grace_until is not None and now > grace_until:
            return SubscriptionStatus.SUSPENDED
        return SubscriptionStatus.GRACE

    if subscription.status == SubscriptionStatus.ACTIVE and subscription.canceled_at is not None:
        if current_period_end is not None and now > current_period_end:
            return SubscriptionStatus.CANCELED
        return SubscriptionStatus.ACTIVE

    return subscription.status


def has_access(*, role: UserRole, subscription: Subscription | None, now: datetime) -> bool:
    """ADMIN nunca e bloqueado por assinatura (REQ-6). Todo o resto so acessa com assinatura
    ativa ou em periodo de graca (REQ-4/11)."""
    if role == UserRole.ADMIN:
        return True
    if subscription is None:
        return False
    status = effective_status(subscription, now=now)
    return status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE)
