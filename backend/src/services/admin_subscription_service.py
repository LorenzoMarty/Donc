from dataclasses import dataclass
from datetime import UTC, datetime

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
        return AdminSubscribersResult(items=items, total=total, mrr_cents=mrr_cents)

    def _compute_mrr(self, now: datetime) -> int:
        total = 0
        for subscription in self.repository.list_all_for_metrics():
            if effective_status(subscription, now=now) not in (SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE):
                continue
            divisor = _MONTHLY_EQUIVALENT_DIVISOR[subscription.cycle]
            total += round(subscription.price_charged_cents / divisor)
        return total
