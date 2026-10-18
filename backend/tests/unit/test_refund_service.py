"""RefundService: reembolso total dentro do prazo (auditado, revoga acesso) e conciliacao MP x banco."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.middlewares.errors import AppError
from src.models import PlanCycle, Subscription, SubscriptionStatus, User, UserRole
from src.models.subscription import SubscriptionRefund
from src.services.refund_service import RefundService

pytestmark = pytest.mark.unit

NOW = datetime(2026, 10, 17, 12, tzinfo=UTC)


class FakeMP:
    def __init__(self):
        self.refunded: list[str] = []
        self.updates: list[tuple[str, dict]] = []
        self.charges: dict[str, list[dict]] = {}
        self.remote: list[dict] = []

    def list_authorized_payments(self, preapproval_id):
        return self.charges.get(preapproval_id, [])

    def refund_payment(self, payment_id):
        self.refunded.append(payment_id)
        return {}

    def update_preapproval(self, preapproval_id, **fields):
        self.updates.append((preapproval_id, fields))
        return {}

    def search_preapprovals(self, *, status, limit=100, offset=0):
        return self.remote[offset : offset + limit]


def _charge(payment_id, days_ago, status="approved", amount=59.0):
    date = (NOW - timedelta(days=days_ago)).isoformat()
    return {"id": 1, "transaction_amount": amount, "debit_date": date, "payment": {"id": payment_id, "status": status}}


def _setup(n_users=1):
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    admin = User(name="Admin", email="admin@t.com", hashed_password=get_password_hash("12345678"), role=UserRole.ADMIN)
    db.add(admin)
    subs = []
    for i in range(n_users):
        user = User(name=f"Aluno{i}", email=f"a{i}@t.com", hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
        db.add(user)
        db.flush()
        sub = Subscription(
            user_id=user.id, cycle=PlanCycle.MONTHLY, status=SubscriptionStatus.ACTIVE, mp_preapproval_id=f"pre-{i}",
            price_charged_cents=5900, current_period_end=NOW + timedelta(days=25),
        )
        db.add(sub)
        subs.append((user, sub))
    db.commit()
    return db, admin, subs


def test_refund_within_window_calls_mp_audits_and_revokes_access():
    db, admin, [(user, sub)] = _setup()
    mp = FakeMP()
    mp.charges["pre-0"] = [_charge("pay-old", 40), _charge("pay-new", 2)]

    refund = RefundService(db, mp).refund_latest_charge(user_id=user.id, admin_user_id=admin.id, now=NOW)

    assert mp.refunded == ["pay-new"]
    assert mp.updates == [("pre-0", {"status": "cancelled"})]
    assert (refund.mp_payment_id, refund.amount_cents, refund.admin_user_id) == ("pay-new", 5900, admin.id)
    db.refresh(sub)
    assert sub.status == SubscriptionStatus.CANCELED
    assert sub.current_period_end == NOW.replace(tzinfo=None) or sub.current_period_end.replace(tzinfo=UTC) == NOW


def test_refund_rejected_outside_window_or_twice_or_without_payment():
    db, admin, [(user, _)] = _setup()
    mp = FakeMP()
    service = RefundService(db, mp)

    with pytest.raises(AppError) as exc:
        service.refund_latest_charge(user_id=user.id, admin_user_id=admin.id, now=NOW)
    assert exc.value.code == "no_payment_to_refund"

    mp.charges["pre-0"] = [_charge("pay-old", 8)]
    with pytest.raises(AppError) as exc:
        service.refund_latest_charge(user_id=user.id, admin_user_id=admin.id, now=NOW)
    assert exc.value.code == "refund_window_expired"
    assert mp.refunded == []

    mp.charges["pre-0"] = [_charge("pay-ok", 1)]
    service.refund_latest_charge(user_id=user.id, admin_user_id=admin.id, now=NOW)
    db.add(SubscriptionRefund(subscription_id=1, mp_payment_id="pay-dup", amount_cents=1))
    db.commit()
    mp.charges["pre-0"] = [_charge("pay-dup", 1)]
    with pytest.raises(AppError) as exc:
        service.refund_latest_charge(user_id=user.id, admin_user_id=admin.id, now=NOW)
    assert exc.value.code == "already_refunded"
    assert len(db.scalars(select(SubscriptionRefund)).all()) == 2


def test_reconcile_flags_all_three_divergences():
    db, _, subs = _setup(n_users=3)
    (u0, _), (u1, s1), (u2, s2) = subs
    mp = FakeMP()
    mp.charges["pre-0"] = [_charge("p0", 3)]  # ok
    mp.charges["pre-1"] = []  # ativa sem pagamento
    s2.status = SubscriptionStatus.CANCELED
    s2.canceled_at = NOW
    s2.current_period_end = NOW - timedelta(days=1)
    db.commit()
    mp.remote = [
        {"id": "pre-0"},
        {"id": "pre-1"},
        {"id": "pre-2"},  # cancelada no banco, autorizada no MP
        {"id": "pre-orphan", "payer_email": "ghost@x.com"},
    ]

    issues = RefundService(db, mp).reconcile(now=NOW)

    assert sorted((i.kind, i.mp_preapproval_id) for i in issues) == [
        ("active_without_payment", "pre-1"),
        ("remote_without_local", "pre-orphan"),
        ("status_mismatch", "pre-2"),
    ]
