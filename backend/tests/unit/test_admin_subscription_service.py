"""AdminSubscriptionService: listagem de assinantes com status + indicador de receita
recorrente (REQ-10) — MRR normaliza o ciclo anual para equivalente mensal."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 - registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.models import PlanCycle, SubscriptionStatus, User, UserRole
from src.models.subscription import Subscription
from src.services.admin_subscription_service import AdminSubscriptionService

pytestmark = pytest.mark.unit

NOW = datetime(2026, 9, 4, 12, 0, tzinfo=UTC)


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db, *, email: str) -> User:
    user = User(name="Aluno", email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user


def _make_subscription(db, *, user: User, cycle: PlanCycle, status: SubscriptionStatus, price_cents: int, **extra) -> Subscription:
    sub = Subscription(user_id=user.id, cycle=cycle, status=status, price_charged_cents=price_cents, **extra)
    db.add(sub)
    db.commit()
    return sub


def test_mrr_sums_monthly_and_normalized_annual_active_subscriptions():
    db = _session()
    monthly_user = _make_user(db, email="mensal@teste.com")
    annual_user = _make_user(db, email="anual@teste.com")
    _make_subscription(db, user=monthly_user, cycle=PlanCycle.MONTHLY, status=SubscriptionStatus.ACTIVE, price_cents=5_900, current_period_end=NOW + timedelta(days=10))
    _make_subscription(db, user=annual_user, cycle=PlanCycle.ANNUAL, status=SubscriptionStatus.ACTIVE, price_cents=58_800, current_period_end=NOW + timedelta(days=100))

    result = AdminSubscriptionService(db).list_subscribers(limit=50, offset=0, now=NOW)

    assert result.mrr_cents == 5_900 + round(58_800 / 12)


def test_mrr_excludes_canceled_and_suspended_subscriptions():
    db = _session()
    canceled_user = _make_user(db, email="cancelado@teste.com")
    suspended_user = _make_user(db, email="suspenso@teste.com")
    _make_subscription(db, user=canceled_user, cycle=PlanCycle.MONTHLY, status=SubscriptionStatus.CANCELED, price_cents=5_900)
    _make_subscription(db, user=suspended_user, cycle=PlanCycle.MONTHLY, status=SubscriptionStatus.SUSPENDED, price_cents=5_900)

    result = AdminSubscriptionService(db).list_subscribers(limit=50, offset=0, now=NOW)

    assert result.mrr_cents == 0


def test_mrr_includes_grace_subscriptions():
    db = _session()
    grace_user = _make_user(db, email="graca@teste.com")
    _make_subscription(
        db, user=grace_user, cycle=PlanCycle.MONTHLY, status=SubscriptionStatus.GRACE, price_cents=5_900, grace_until=NOW + timedelta(days=1)
    )

    result = AdminSubscriptionService(db).list_subscribers(limit=50, offset=0, now=NOW)

    assert result.mrr_cents == 5_900


def test_list_subscribers_includes_user_name_and_email():
    db = _session()
    user = _make_user(db, email="aluno@teste.com")
    _make_subscription(db, user=user, cycle=PlanCycle.MONTHLY, status=SubscriptionStatus.ACTIVE, price_cents=5_900, current_period_end=NOW + timedelta(days=10))

    result = AdminSubscriptionService(db).list_subscribers(limit=50, offset=0, now=NOW)

    assert result.total == 1
    row = result.items[0]
    assert row.email == "aluno@teste.com"
    assert row.status == SubscriptionStatus.ACTIVE
