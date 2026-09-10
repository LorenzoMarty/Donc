"""REQ-4/5/6/8/9 (spec suporte-e-faq): aluno abre chamado de suporte; admin lista e resolve."""

from __future__ import annotations

import pytest
from sqlalchemy import select

from src.database.session import SessionLocal
from src.dependencies import require_admin
from src.main import app
from src.models import User
from src.utils import auth_rate_limit


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db=None) -> User:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "admin@demo.com"))
        assert user is not None
        return user
    finally:
        db.close()


@pytest.fixture()
def as_admin():
    app.dependency_overrides[require_admin] = override_admin
    try:
        yield
    finally:
        app.dependency_overrides.pop(require_admin, None)


@pytest.fixture()
def _low_rate_limit(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(auth_rate_limit.settings, "auth_rate_limit_per_minute", 1)
    monkeypatch.setattr(auth_rate_limit, "_increment_redis", lambda key: None)
    auth_rate_limit._memory_counters.clear()
    yield
    auth_rate_limit._memory_counters.clear()


def test_student_can_create_support_ticket(client):
    response = client.post(
        "/api/v1/support/tickets",
        json={"category": "billing", "subject": "Cobranca duplicada", "message": "Fui cobrado duas vezes neste mes."},
    )

    assert response.status_code == 201
    assert api_data(response)["message"]


def test_create_ticket_rejects_invalid_category(client):
    response = client.post(
        "/api/v1/support/tickets",
        json={"category": "not-a-real-category", "subject": "Assunto valido", "message": "Mensagem valida com mais de dez caracteres."},
    )

    assert response.status_code == 422


def test_create_ticket_rejects_short_message(client):
    response = client.post(
        "/api/v1/support/tickets",
        json={"category": "other", "subject": "Assunto valido", "message": "curta"},
    )

    assert response.status_code == 422


def test_create_ticket_is_rate_limited(client, _low_rate_limit):
    first = client.post(
        "/api/v1/support/tickets",
        json={"category": "other", "subject": "Primeiro chamado", "message": "Mensagem valida com mais de dez caracteres."},
    )
    assert first.status_code == 201

    second = client.post(
        "/api/v1/support/tickets",
        json={"category": "other", "subject": "Segundo chamado", "message": "Mensagem valida com mais de dez caracteres."},
    )
    assert second.status_code == 429
    assert second.json()["error"] == "rate_limit_exceeded"


def test_non_admin_cannot_list_support_tickets(client):
    response = client.get("/api/v1/admin/support-tickets")
    assert response.status_code == 403


def test_admin_can_list_and_resolve_support_ticket(client, as_admin):
    create = client.post(
        "/api/v1/support/tickets",
        json={"category": "technical_bug", "subject": "Erro ao salvar redacao", "message": "O editor trava ao salvar o rascunho."},
    )
    assert create.status_code == 201

    listing = client.get("/api/v1/admin/support-tickets")
    assert listing.status_code == 200
    data = api_data(listing)
    assert data["total"] >= 1
    ticket = next(item for item in data["items"] if item["subject"] == "Erro ao salvar redacao")
    assert ticket["status"] == "open"
    assert ticket["user_email"] == "aluno@demo.com"

    update = client.patch(f"/api/v1/admin/support-tickets/{ticket['id']}", json={"status": "resolved"})
    assert update.status_code == 200
    assert api_data(update)["status"] == "resolved"


def test_admin_can_filter_support_tickets_by_status(client, as_admin):
    client.post(
        "/api/v1/support/tickets",
        json={"category": "account_access", "subject": "Nao consigo logar", "message": "Esqueci a senha e o link nao chega."},
    )

    listing = client.get("/api/v1/admin/support-tickets?status=resolved")
    assert listing.status_code == 200
    data = api_data(listing)
    assert all(item["status"] == "resolved" for item in data["items"])
