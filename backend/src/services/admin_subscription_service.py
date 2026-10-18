from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from src.models import PlanCycle, SubscriptionStatus, User
from src.models.subscription import Subscription
from src.repositories.subscriptions import SubscriptionRepository
from src.services.subscription_status import effective_status

_MONTHLY_EQUIVALENT_DIVISOR = {PlanCycle.MONTHLY: 1, PlanCycle.ANNUAL: 12}


@dataclass
class AdminSubscriberRow:
    user_id: int
    name: str
    email: str
    cycle: PlanCycle
    status: SubscriptionStatus
    price_charged_cents: int
    current_period_end: datetime | None
    canceled_at: datetime | None


@dataclass
class AdminSubscribersResult:
    items: list[AdminSubscriberRow]
    total: int
    mrr_cents: int
    active_count: int
    canceled_30d: int
    churn_rate_30d: float


class AdminSubscriptionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = SubscriptionRepository(db)

    def list_subscribers(self, *, limit: int, offset: int, now: datetime | None = None) -> AdminSubscribersResult:
        now = now or datetime.now(UTC)
        page = self.repository.list_all(limit=limit, offset=offset)
        total = self.repository.count_all()

        items = []
        for subscription in page:
            user = self.db.get(User, subscription.user_id)
            items.append(
                AdminSubscriberRow(
                    user_id=subscription.user_id,
                    name=user.name if user else "",
                    email=user.email if user else "",
                    cycle=subscription.cycle,
                    status=effective_status(subscription, now=now),
                    price_charged_cents=subscription.price_charged_cents,
                    current_period_end=subscription.current_period_end,
                    canceled_at=subscription.canceled_at,
                )
            )

        mrr_cents = self._compute_mrr(now)
        active_count, canceled_30d, churn_rate_30d = self._compute_active_and_churn(now)
        return AdminSubscribersResult(
            items=items,
            total=total,
            mrr_cents=mrr_cents,
            active_count=active_count,
            canceled_30d=canceled_30d,
            churn_rate_30d=churn_rate_30d,
        )

    def _compute_active_and_churn(self, now: datetime) -> tuple[int, int, float]:
        """Assinantes com acesso hoje (ativa/carencia) e churn dos ultimos 30 dias:
        cancelamentos pedidos na janela / (quem pagava no inicio ~ ativos que nao cancelaram + cancelados na janela)."""
        window_start = now - timedelta(days=30)
        active_count = paying = canceled_in_window = 0
        for subscription in self.repository.list_all_for_metrics():
            has_access = effective_status(subscription, now=now) in (SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE)
            active_count += has_access
            if subscription.canceled_at is not None and _aware(subscription.canceled_at) >= window_start:
                canceled_in_window += 1
            elif has_access:
                paying += 1
        base = paying + canceled_in_window
        churn = round(canceled_in_window / base * 100, 1) if base else 0.0
        return active_count, canceled_in_window, churn

    def _compute_mrr(self, now: datetime) -> int:
        total = 0
        for subscription in self.repository.list_all_for_metrics():
            if effective_status(subscription, now=now) not in (SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE):
                continue
            divisor = _MONTHLY_EQUIVALENT_DIVISOR[subscription.cycle]
            total += round(subscription.price_charged_cents / divisor)
        return total


def _aware(value: datetime) -> datetime:
    # SQLite (testes) devolve datetime naive; Postgres devolve aware.
    return value if value.tzinfo else value.replace(tzinfo=UTC)
