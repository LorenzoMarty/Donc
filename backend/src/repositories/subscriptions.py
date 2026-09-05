from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models import Subscription


class SubscriptionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_user_id(self, user_id: int) -> Subscription | None:
        return self.db.scalar(select(Subscription).where(Subscription.user_id == user_id))

    def get_by_mp_preapproval_id(self, mp_preapproval_id: str) -> Subscription | None:
        return self.db.scalar(select(Subscription).where(Subscription.mp_preapproval_id == mp_preapproval_id))

    def list_all(self, *, limit: int, offset: int) -> list[Subscription]:
        query = select(Subscription).order_by(Subscription.created_at.desc()).limit(limit).offset(offset)
        return list(self.db.scalars(query))

    def count_all(self) -> int:
        return self.db.scalar(select(func.count()).select_from(Subscription)) or 0

    def list_all_for_metrics(self) -> list[Subscription]:
        # Sem paginacao — usado so pra agregados (MRR), volume de assinantes e pequeno o
        # suficiente pra nao justificar replicar `effective_status` em SQL.
        return list(self.db.scalars(select(Subscription)))

    def save(self, subscription: Subscription) -> Subscription:
        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)
        return subscription
