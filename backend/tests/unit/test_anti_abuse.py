"""Anti-abuso: IP real, normalizacao de e-mail, Turnstile e reaproveitamento de cupom."""

from __future__ import annotations

from types import SimpleNamespace

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.config.settings import settings
from src.database.session import Base
from src.middlewares.errors import AppError
from src.models import PlanCycle, User, UserRole
from src.models.subscription import DiscountType
from src.services.coupon_service import CouponService
from src.services.subscription_service import SubscriptionService
from src.services.turnstile import verify_turnstile
from src.utils.client_ip import client_ip
from src.utils.email_normalize import normalize_email

pytestmark = pytest.mark.unit


def test_normalize_email_collapses_aliases():
    assert normalize_email("Joao.Silva+promo@Gmail.com") == "joaosilva@gmail.com"
    assert normalize_email("joaosilva@googlemail.com") == "joaosilva@gmail.com"
    assert normalize_email("a.b+x@escola.com.br") == "a.b@escola.com.br"  # ponto so some no Gmail


def _request(headers: dict[str, str], host: str = "10.0.0.5"):
    return SimpleNamespace(headers=headers, client=SimpleNamespace(host=host))


def test_client_ip_ignores_forwarded_for_unless_trusted(monkeypatch):
    request = _request({"x-forwarded-for": "6.6.6.6, 203.0.113.9"})
    monkeypatch.setattr(settings, "trust_forwarded_for", False)
    assert client_ip(request) == "10.0.0.5"
    monkeypatch.setattr(settings, "trust_forwarded_for", True)
    assert client_ip(request) == "203.0.113.9"  # a entrada do proxy confiavel, nao a que o cliente forjou
    assert client_ip(_request({})) == "10.0.0.5"


def _transport(success: bool, captured: dict | None = None):
    def handler(request: httpx.Request) -> httpx.Response:
        if captured is not None:
            captured["body"] = request.content.decode()
        return httpx.Response(200, json={"success": success})

    return httpx.MockTransport(handler)


def test_turnstile_is_skipped_without_secret(monkeypatch):
    monkeypatch.setattr(settings, "turnstile_secret_key", None)
    verify_turnstile(None)  # nao levanta


def test_turnstile_requires_valid_token_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "turnstile_secret_key", "secret")
    with pytest.raises(AppError) as missing:
        verify_turnstile(None)
    assert missing.value.code == "captcha_failed"

    captured: dict = {}
    verify_turnstile("tok", remote_ip="1.2.3.4", transport=_transport(True, captured))
    assert "response=tok" in captured["body"] and "remoteip=1.2.3.4" in captured["body"]

    with pytest.raises(AppError) as rejected:
        verify_turnstile("tok", transport=_transport(False))
    assert rejected.value.code == "captcha_failed"


def test_turnstile_fails_closed_when_cloudflare_is_unreachable(monkeypatch):
    monkeypatch.setattr(settings, "turnstile_secret_key", "secret")

    def boom(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down")

    with pytest.raises(AppError) as exc:
        verify_turnstile("tok", transport=httpx.MockTransport(boom))
    assert exc.value.code == "captcha_failed"


class FakeMP:
    def create_preapproval(self, **kwargs):
        return {"id": f"pre-{kwargs['external_reference']}", "init_point": "https://mp.example/x"}


def _db_with_users(*emails):
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    users = []
    for email in emails:
        user = User(name=email, email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
        db.add(user)
        users.append(user)
    db.commit()
    return db, users


def test_limited_coupon_cannot_be_reused_by_alias_accounts():
    db, (first, alias, other) = _db_with_users("ana.souza@gmail.com", "anasouza+2@gmail.com", "bruno@gmail.com")
    CouponService(db).create(code="LIMITADO", discount_type=DiscountType.PERCENT, discount_value=50, max_uses=100)
    service = SubscriptionService(db, mp_client=FakeMP())

    service.start_checkout(first, cycle=PlanCycle.MONTHLY, coupon_code="LIMITADO")

    with pytest.raises(AppError) as exc:
        service.start_checkout(alias, cycle=PlanCycle.MONTHLY, coupon_code="LIMITADO")
    assert exc.value.code == "coupon_already_used"
    # outra pessoa de verdade usa normalmente
    service.start_checkout(other, cycle=PlanCycle.MONTHLY, coupon_code="LIMITADO")


def test_unlimited_coupon_allows_aliases_but_not_the_same_account_twice():
    db, (first, alias) = _db_with_users("ana@gmail.com", "ana+x@gmail.com")
    CouponService(db).create(code="LIVRE", discount_type=DiscountType.PERCENT, discount_value=10)
    service = SubscriptionService(db, mp_client=FakeMP())

    service.start_checkout(first, cycle=PlanCycle.MONTHLY, coupon_code="LIVRE")
    service.start_checkout(alias, cycle=PlanCycle.MONTHLY, coupon_code="LIVRE")  # sem max_uses: sem trava por pessoa

    subscription = service.repository.get_by_user_id(first.id)
    subscription.coupon_applied = True  # simula o webhook que consumiu o cupom
    service.repository.save(subscription)
    with pytest.raises(AppError) as exc:
        service.start_checkout(first, cycle=PlanCycle.ANNUAL, coupon_code="LIVRE")
    assert exc.value.code == "coupon_already_used"
