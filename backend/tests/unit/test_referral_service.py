"""Indicação de amigos: código, desconto no checkout, auto-indicação e crédito após o 1º pagamento."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.config.settings import settings
from src.database.session import Base
from src.middlewares.errors import AppError
from src.models import PlanCycle, SubscriptionStatus, User, UserRole
from src.models.referral import Referral
from src.services.referral_service import ReferralService
from src.services.subscription_service import SubscriptionService

pytestmark = pytest.mark.unit


class FakeMP:
    def __init__(self):
        self.remote_status: dict[str, str] = {}

    def create_preapproval(self, **kwargs):
        pid = f"pre-{kwargs['external_reference']}"
        self.remote_status[pid] = "pending"
        self.last_amount = kwargs["amount_cents"]
        return {"id": pid, "init_point": "https://mp.example/x"}

    def get_preapproval(self, preapproval_id):
        return {"id": preapproval_id, "status": self.remote_status[preapproval_id], "next_payment_date": "2026-11-20T10:00:00+00:00"}

    def verify_webhook_signature(self, **kwargs):
        return True


def _setup(*emails):
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    users = []
    for email in emails:
        user = User(name=email.split("@")[0], email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
        db.add(user)
        users.append(user)
    db.commit()
    return db, users


def test_code_is_generated_once_and_unique():
    db, (a, b) = _setup("a@t.com", "b@t.com")
    service = ReferralService(db)
    code = service.code_for(a)
    assert code.startswith("AMIGO-") and len(code) == 12
    assert service.code_for(a) == code
    assert service.code_for(b) != code


def test_referred_student_gets_discount_and_referrer_earns_credit_only_after_first_payment():
    db, (referrer, friend) = _setup("indicador@t.com", "amigo@t.com")
    mp = FakeMP()
    service = SubscriptionService(db, mp_client=mp)
    code = ReferralService(db).code_for(referrer)

    subscription, _ = service.start_checkout(friend, cycle=PlanCycle.MONTHLY, coupon_code=code.lower())

    assert mp.last_amount == 5_900 - round(5_900 * settings.referral_discount_percent / 100)
    assert subscription.coupon_code == code
    pending = ReferralService(db).summary(referrer)
    assert (pending.pending_count, pending.rewarded_count, pending.credits_available) == (1, 0, 0)

    # pagamento confirmado (webhook): preapproval autorizada
    mp.remote_status[subscription.mp_preapproval_id] = "authorized"
    service.handle_webhook({"id": "n1", "data": {"id": subscription.mp_preapproval_id}}, {})

    done = ReferralService(db).summary(referrer)
    assert (done.pending_count, done.rewarded_count, done.credits_available) == (0, 1, 1)
    assert db.scalar(select(Referral).where(Referral.referred_id == friend.id)).status == "rewarded"


def test_self_referral_and_alias_accounts_are_rejected():
    db, (referrer, alias) = _setup("pessoa@gmail.com", "pes.soa+2@gmail.com")
    service = SubscriptionService(db, mp_client=FakeMP())
    code = ReferralService(db).code_for(referrer)

    with pytest.raises(AppError) as own:
        service.start_checkout(referrer, cycle=PlanCycle.MONTHLY, coupon_code=code)
    assert own.value.code == "referral_self"
    with pytest.raises(AppError) as same_person:
        service.start_checkout(alias, cycle=PlanCycle.MONTHLY, coupon_code=code)
    assert same_person.value.code == "referral_self"


def test_account_can_only_be_referred_once_and_only_if_never_subscribed():
    db, (first, second, friend) = _setup("um@t.com", "dois@t.com", "amigo@t.com")
    service = SubscriptionService(db, mp_client=FakeMP())
    code_one = ReferralService(db).code_for(first)
    code_two = ReferralService(db).code_for(second)

    service.start_checkout(friend, cycle=PlanCycle.MONTHLY, coupon_code=code_one)
    with pytest.raises(AppError) as exc:
        service.start_checkout(friend, cycle=PlanCycle.MONTHLY, coupon_code=code_two)
    assert exc.value.code == "referral_already_used"

    # quem ja pagou alguma vez nao pode ser indicado depois
    paid = service.repository.get_by_user_id(friend.id)
    paid.status = SubscriptionStatus.CANCELED
    paid.current_period_end = paid.created_at
    service.repository.save(paid)
    db.query(Referral).delete()
    db.commit()
    with pytest.raises(AppError) as late:
        service.start_checkout(friend, cycle=PlanCycle.MONTHLY, coupon_code=code_one)
    assert late.value.code == "referral_not_eligible"


def test_redoing_checkout_without_code_discards_pending_referral():
    db, (referrer, friend) = _setup("indicador@t.com", "amigo@t.com")
    service = SubscriptionService(db, mp_client=FakeMP())
    service.start_checkout(friend, cycle=PlanCycle.MONTHLY, coupon_code=ReferralService(db).code_for(referrer))
    assert db.scalar(select(Referral)) is not None

    service.start_checkout(friend, cycle=PlanCycle.MONTHLY)

    assert db.scalar(select(Referral)) is None


def test_admin_overview_and_apply_reward():
    db, (referrer, friend) = _setup("indicador@t.com", "amigo@t.com")
    mp = FakeMP()
    service = SubscriptionService(db, mp_client=mp)
    subscription, _ = service.start_checkout(friend, cycle=PlanCycle.MONTHLY, coupon_code=ReferralService(db).code_for(referrer))
    mp.remote_status[subscription.mp_preapproval_id] = "authorized"
    service.handle_webhook({"id": "n2", "data": {"id": subscription.mp_preapproval_id}}, {})

    referrals = ReferralService(db)
    overview = referrals.admin_overview()
    assert (overview["total"], overview["rewarded"], overview["credits_open"]) == (1, 1, 1)
    assert overview["top_referrers"][0]["email"] == "indicador@t.com"

    referrals.mark_reward_applied(overview["items"][0]["id"])
    assert referrals.admin_overview()["credits_open"] == 0
    assert referrals.summary(referrer).credits_available == 0
