"""SubscriptionService: checkout (REQ-1/2), webhook (REQ-3/4), cancelamento (REQ-5), troca de
plano (REQ-7) e aplicacao de cupom no fluxo real (REQ-9) — Mercado Pago substituido por um fake
em memoria (MercadoPagoClient em si ja e testado isoladamente em test_mercadopago_client.py)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 - registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.middlewares.errors import AppError
from src.models import PlanCycle, SubscriptionStatus, User, UserRole
from src.models.subscription import DiscountType
from src.services.coupon_service import CouponService
from src.services.subscription_service import SubscriptionService

pytestmark = pytest.mark.unit


class FakeMercadoPagoClient:
    def __init__(self):
        self.calls: list[tuple[str, dict]] = []
        self._next_preapproval_id = 1
        self.preapprovals: dict[str, dict] = {}

    def create_preapproval(self, **kwargs) -> dict:
        self.calls.append(("create_preapproval", kwargs))
        preapproval_id = f"preapproval-{self._next_preapproval_id}"
        self._next_preapproval_id += 1
        record = {"id": preapproval_id, "status": "pending", "init_point": f"https://mp.example/checkout/{preapproval_id}"}
        self.preapprovals[preapproval_id] = record
        return record

    def get_preapproval(self, preapproval_id: str) -> dict:
        return self.preapprovals[preapproval_id]

    def update_preapproval(self, preapproval_id: str, **fields) -> dict:
        self.calls.append(("update_preapproval", {"id": preapproval_id, **fields}))
        self.preapprovals[preapproval_id].update(fields)
        return self.preapprovals[preapproval_id]

    def verify_webhook_signature(self, **kwargs) -> bool:
        return True

    def set_remote_status(self, preapproval_id: str, status: str, next_payment_date: str | None = None) -> None:
        self.preapprovals[preapproval_id]["status"] = status
        if next_payment_date:
            self.preapprovals[preapproval_id]["next_payment_date"] = next_payment_date


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db, *, email: str = "aluno@teste.com") -> User:
    user = User(name="Aluno", email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    db.commit()
    db.refresh(user)
    return user


def _service(db):
    mp = FakeMercadoPagoClient()
    return SubscriptionService(db, mp_client=mp), mp


def test_start_checkout_creates_pending_subscription_and_returns_init_point():
    db = _session()
    user = _make_user(db)
    service, mp = _service(db)

    subscription, checkout_url = service.start_checkout(user, cycle=PlanCycle.MONTHLY)

    assert subscription.status == SubscriptionStatus.PENDING
    assert subscription.cycle == PlanCycle.MONTHLY
    assert subscription.price_charged_cents == 5_900
    assert checkout_url == f"https://mp.example/checkout/{subscription.mp_preapproval_id}"
    assert mp.calls[0][0] == "create_preapproval"
    assert mp.calls[0][1]["amount_cents"] == 5_900


def test_start_checkout_applies_coupon_discount():
    db = _session()
    user = _make_user(db)
    CouponService(db).create(code="PROMO10", discount_type=DiscountType.PERCENT, discount_value=10)
    service, mp = _service(db)

    subscription, _ = service.start_checkout(user, cycle=PlanCycle.MONTHLY, coupon_code="promo10")

    assert subscription.price_charged_cents == 5_310
    assert subscription.coupon_code == "PROMO10"
    assert subscription.coupon_applied is False
    assert mp.calls[0][1]["amount_cents"] == 5_310


def test_start_checkout_rejects_when_already_active():
    db = _session()
    user = _make_user(db)
    service, mp = _service(db)
    subscription, _ = service.start_checkout(user, cycle=PlanCycle.MONTHLY)
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.current_period_end = datetime.now(UTC) + timedelta(days=10)
    service.repository.save(subscription)

    with pytest.raises(AppError) as exc_info:
        service.start_checkout(user, cycle=PlanCycle.ANNUAL)
    assert exc_info.value.code == "subscription_already_active"


def test_webhook_activates_pending_subscription_and_redeems_coupon():
    db = _session()
    user = _make_user(db)
    CouponService(db).create(code="PROMO10", discount_type=DiscountType.PERCENT, discount_value=10)
    service, mp = _service(db)
    subscription, _ = service.start_checkout(user, cycle=PlanCycle.MONTHLY, coupon_code="PROMO10")
    mp.set_remote_status(subscription.mp_preapproval_id, "authorized", next_payment_date="2026-10-04T12:00:00.000-03:00")

    service.handle_webhook(
        {"id": "notif-1", "type": "subscription_preapproval", "data": {"id": subscription.mp_preapproval_id}},
        headers={},
    )

    refreshed = service.repository.get_by_user_id(user.id)
    assert refreshed.status == SubscriptionStatus.ACTIVE
    assert refreshed.coupon_applied is True
    assert refreshed.current_period_end is not None

    coupon = CouponService(db).repository.get_by_code("PROMO10")
    assert coupon.used_count == 1


def test_webhook_is_idempotent_for_repeated_notification_id():
    db = _session()
    user = _make_user(db)
    CouponService(db).create(code="PROMO10", discount_type=DiscountType.PERCENT, discount_value=10)
    service, mp = _service(db)
    subscription, _ = service.start_checkout(user, cycle=PlanCycle.MONTHLY, coupon_code="PROMO10")
    mp.set_remote_status(subscription.mp_preapproval_id, "authorized", next_payment_date="2026-10-04T12:00:00.000-03:00")

    event = {"id": "notif-1", "type": "subscription_preapproval", "data": {"id": subscription.mp_preapproval_id}}
    service.handle_webhook(event, headers={})
    service.handle_webhook(event, headers={})

    coupon = CouponService(db).repository.get_by_code("PROMO10")
    assert coupon.used_count == 1


def test_webhook_paused_starts_grace_period():
    db = _session()
    user = _make_user(db)
    service, mp = _service(db)
    subscription, _ = service.start_checkout(user, cycle=PlanCycle.MONTHLY)
    mp.set_remote_status(subscription.mp_preapproval_id, "authorized", next_payment_date="2026-10-04T12:00:00.000-03:00")
    service.handle_webhook({"id": "notif-1", "data": {"id": subscription.mp_preapproval_id}}, headers={})

    mp.set_remote_status(subscription.mp_preapproval_id, "paused")
    service.handle_webhook({"id": "notif-2", "data": {"id": subscription.mp_preapproval_id}}, headers={})

    refreshed = service.repository.get_by_user_id(user.id)
    assert refreshed.status == SubscriptionStatus.GRACE
    assert refreshed.grace_until is not None


def test_cancel_active_subscription_keeps_access_until_period_end():
    db = _session()
    user = _make_user(db)
    service, mp = _service(db)
    subscription, _ = service.start_checkout(user, cycle=PlanCycle.MONTHLY)
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.current_period_end = datetime.now(UTC) + timedelta(days=10)
    service.repository.save(subscription)

    canceled = service.cancel(user)

    assert canceled.status == SubscriptionStatus.ACTIVE
    assert canceled.canceled_at is not None
    assert mp.calls[-1][0] == "update_preapproval"


def test_change_plan_updates_cycle_and_price():
    db = _session()
    user = _make_user(db)
    service, mp = _service(db)
    subscription, _ = service.start_checkout(user, cycle=PlanCycle.MONTHLY)
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.current_period_end = datetime.now(UTC) + timedelta(days=10)
    service.repository.save(subscription)

    updated = service.change_plan(user, new_cycle=PlanCycle.ANNUAL)

    assert updated.cycle == PlanCycle.ANNUAL
    assert updated.price_charged_cents == 58_800
    assert mp.calls[-1][0] == "update_preapproval"


def test_change_plan_rejects_same_cycle():
    db = _session()
    user = _make_user(db)
    service, mp = _service(db)
    subscription, _ = service.start_checkout(user, cycle=PlanCycle.MONTHLY)
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.current_period_end = datetime.now(UTC) + timedelta(days=10)
    service.repository.save(subscription)

    with pytest.raises(AppError) as exc_info:
        service.change_plan(user, new_cycle=PlanCycle.MONTHLY)
    assert exc_info.value.code == "subscription_same_cycle"
