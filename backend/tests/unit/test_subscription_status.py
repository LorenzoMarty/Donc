"""effective_status/has_access: transicoes de estado da assinatura (REQ-4 graca de 3 dias,
REQ-5 cancelamento mantem acesso ate fim do periodo pago, REQ-6 admin sempre livre)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from src.models import PlanCycle, SubscriptionStatus, UserRole
from src.models.subscription import Subscription
from src.services.subscription_status import effective_status, has_access

pytestmark = pytest.mark.unit

NOW = datetime(2026, 9, 4, 12, 0, tzinfo=UTC)


def _sub(**overrides) -> Subscription:
    defaults = dict(
        id=1,
        user_id=1,
        cycle=PlanCycle.MONTHLY,
        status=SubscriptionStatus.ACTIVE,
        price_charged_cents=5_900,
        current_period_end=None,
        grace_until=None,
        canceled_at=None,
    )
    defaults.update(overrides)
    return Subscription(**defaults)


def test_active_without_cancellation_stays_active():
    sub = _sub(status=SubscriptionStatus.ACTIVE, current_period_end=NOW + timedelta(days=10))
    assert effective_status(sub, now=NOW) == SubscriptionStatus.ACTIVE


def test_grace_before_deadline_stays_grace():
    sub = _sub(status=SubscriptionStatus.GRACE, grace_until=NOW + timedelta(days=1))
    assert effective_status(sub, now=NOW) == SubscriptionStatus.GRACE


def test_grace_past_deadline_becomes_suspended():
    sub = _sub(status=SubscriptionStatus.GRACE, grace_until=NOW - timedelta(minutes=1))
    assert effective_status(sub, now=NOW) == SubscriptionStatus.SUSPENDED


def test_canceled_intent_keeps_access_until_period_end():
    sub = _sub(status=SubscriptionStatus.ACTIVE, canceled_at=NOW - timedelta(days=1), current_period_end=NOW + timedelta(days=2))
    assert effective_status(sub, now=NOW) == SubscriptionStatus.ACTIVE


def test_canceled_intent_past_period_end_becomes_canceled():
    sub = _sub(status=SubscriptionStatus.ACTIVE, canceled_at=NOW - timedelta(days=10), current_period_end=NOW - timedelta(minutes=1))
    assert effective_status(sub, now=NOW) == SubscriptionStatus.CANCELED


def test_pending_stays_pending():
    sub = _sub(status=SubscriptionStatus.PENDING, current_period_end=None)
    assert effective_status(sub, now=NOW) == SubscriptionStatus.PENDING


def test_admin_has_access_without_any_subscription():
    assert has_access(role=UserRole.ADMIN, subscription=None, now=NOW) is True


def test_student_without_subscription_has_no_access():
    assert has_access(role=UserRole.STUDENT, subscription=None, now=NOW) is False


def test_student_with_active_subscription_has_access():
    sub = _sub(status=SubscriptionStatus.ACTIVE, current_period_end=NOW + timedelta(days=5))
    assert has_access(role=UserRole.STUDENT, subscription=sub, now=NOW) is True


def test_student_with_grace_subscription_has_access():
    sub = _sub(status=SubscriptionStatus.GRACE, grace_until=NOW + timedelta(days=1))
    assert has_access(role=UserRole.STUDENT, subscription=sub, now=NOW) is True


def test_student_with_suspended_subscription_has_no_access():
    sub = _sub(status=SubscriptionStatus.GRACE, grace_until=NOW - timedelta(minutes=1))
    assert has_access(role=UserRole.STUDENT, subscription=sub, now=NOW) is False


def test_student_with_canceled_subscription_has_no_access():
    sub = _sub(status=SubscriptionStatus.CANCELED)
    assert has_access(role=UserRole.STUDENT, subscription=sub, now=NOW) is False
