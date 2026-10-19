"""Cobertura das rotas de assinatura e do admin de cupons/assinantes (REQ-2 do spec de testes).
Regra de negocio ja e coberta em tests/unit; aqui so o contrato HTTP."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import require_admin
from src.main import app
from src.models import User
from src.services.subscription_service import SubscriptionService


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def test_me_returns_subscription_or_null(client):
    # O DB da suite e compartilhado: o aluno demo pode ou nao ter assinatura conforme a ordem dos testes.
    response = client.get("/api/v1/subscriptions/me")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data is None or {"cycle", "status"} <= set(data)


def test_webhook_ignores_non_json_body(client):
    response = client.post("/api/v1/subscriptions/webhook", content=b"not json", headers={"content-type": "application/json"})
    assert response.status_code == 200
    assert response.json() == {"success": True}


def test_webhook_unexpected_error_still_returns_200(client, monkeypatch):
    def boom(self, payload, headers):
        raise RuntimeError("falha inesperada")

    monkeypatch.setattr(SubscriptionService, "handle_webhook", boom)
    response = client.post("/api/v1/subscriptions/webhook", json={"data": {"id": "1"}})
    assert response.status_code == 200  # MP nao pode reentregar indefinidamente


def test_admin_coupon_lifecycle_and_subscribers(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        created = client.post(
            "/api/v1/admin/coupons",
            json={"code": "rota10", "discount_type": "percent", "discount_value": 10, "max_uses": 5},
        )
        assert created.status_code == 201
        coupon = created.json()["data"]
        assert coupon["code"] == "ROTA10"  # normalizado em maiusculas

        updated = client.patch(f"/api/v1/admin/coupons/{coupon['id']}", json={"discount_type": "fixed", "discount_value": 500})
        assert updated.status_code == 200
        assert updated.json()["data"]["discount_type"] == "fixed"

        listed = client.get("/api/v1/admin/coupons")
        assert listed.status_code == 200
        assert any(item["code"] == "ROTA10" for item in listed.json()["data"]["items"])

        deactivated = client.post(f"/api/v1/admin/coupons/{coupon['id']}/deactivate")
        assert deactivated.status_code == 200
        assert deactivated.json()["data"]["active"] is False

        subscribers = client.get("/api/v1/admin/subscribers")
        assert subscribers.status_code == 200
        assert {"items", "total", "mrr_cents"} <= set(subscribers.json()["data"])
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_checkout_requires_terms_acceptance(client):
    response = client.post("/api/v1/subscriptions/checkout", json={"cycle": "monthly"})
    assert response.status_code == 400
    assert response.json()["error"] == "terms_not_accepted"


def test_checkout_records_terms_only_after_success_and_keeps_signup_timestamp(client, monkeypatch):
    from types import SimpleNamespace

    from src.config.settings import settings
    from src.database.session import SessionLocal

    def failing(self, user, **kwargs):
        raise RuntimeError("mp fora do ar")

    with SessionLocal() as db:
        demo = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        demo.terms_version, demo.terms_accepted_at = None, None
        db.commit()

    monkeypatch.setattr(SubscriptionService, "start_checkout", failing)
    try:
        client.post("/api/v1/subscriptions/checkout", json={"cycle": "monthly", "accept_terms": True})
    except RuntimeError:
        pass
    with SessionLocal() as db:
        assert db.scalar(select(User).where(User.email == "aluno@demo.com")).terms_version is None

    ok = lambda self, user, **kwargs: (SimpleNamespace(status=SimpleNamespace(value="pending")), "https://mp.example/x")  # noqa: E731
    monkeypatch.setattr(SubscriptionService, "start_checkout", ok)
    assert client.post("/api/v1/subscriptions/checkout", json={"cycle": "monthly", "accept_terms": True}).status_code == 201
    with SessionLocal() as db:
        demo = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert demo.terms_version == settings.legal_terms_version
        first_ts = demo.terms_accepted_at
    client.post("/api/v1/subscriptions/checkout", json={"cycle": "monthly", "accept_terms": True})
    with SessionLocal() as db:
        assert db.scalar(select(User).where(User.email == "aluno@demo.com")).terms_accepted_at == first_ts


def test_payments_route_returns_list(client):
    response = client.get("/api/v1/subscriptions/payments")
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)


def test_admin_funnel_route_shape(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.get("/api/v1/admin/funnel?days=30")
        assert response.status_code == 200
        data = response.json()["data"]
        assert {"days", "signups", "steps", "first_action_median_minutes", "retention_d1", "retention_d7"} <= set(data)
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_admin_funnel_requires_admin_and_validates_days(client):
    # sem override de admin: o aluno demo recebe 403
    assert client.get("/api/v1/admin/funnel").status_code == 403
    app.dependency_overrides[require_admin] = override_admin
    try:
        assert client.get("/api/v1/admin/funnel?days=0").status_code == 422
        assert client.get("/api/v1/admin/funnel?days=181").status_code == 422
    finally:
        app.dependency_overrides.pop(require_admin, None)
