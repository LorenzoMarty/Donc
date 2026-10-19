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


def test_suggestion_ticket_admin_reply_student_sees_and_follows_up(client, as_admin, monkeypatch):
    sent: list[dict] = []
    monkeypatch.setattr("src.services.email_service.send_support_reply", lambda **kw: sent.append(kw) or True)
    # fire_and_forget roda em thread; executa na hora para o teste ser deterministico.
    monkeypatch.setattr("src.services.email_service.fire_and_forget", lambda send, **kw: send(**kw))

    created = client.post(
        "/api/v1/support/tickets",
        json={"category": "suggestion", "subject": "Modo escuro nas aulas", "message": "Seria bom ter modo escuro no player."},
    )
    assert created.status_code == 201

    ticket = next(t for t in api_data(client.get("/api/v1/admin/support-tickets"))["items"] if t["subject"] == "Modo escuro nas aulas")
    assert ticket["category"] == "suggestion"

    reply = client.post(f"/api/v1/admin/support-tickets/{ticket['id']}/reply", json={"message": "Boa ideia, vamos avaliar!"})
    assert reply.status_code == 201
    assert sent and sent[0]["subject"] == "Modo escuro nas aulas"

    mine = next(t for t in api_data(client.get("/api/v1/support/tickets")) if t["id"] == ticket["id"])
    assert [(m["author_role"], m["body"]) for m in mine["messages"]] == [("admin", "Boa ideia, vamos avaliar!")]

    client.patch(f"/api/v1/admin/support-tickets/{ticket['id']}", json={"status": "resolved"})
    follow = client.post(f"/api/v1/support/tickets/{ticket['id']}/messages", json={"message": "Obrigado, fico no aguardo."})
    assert follow.status_code == 201
    data = api_data(follow)
    assert data["status"] == "open"  # réplica reabre
    assert [m["author_role"] for m in data["messages"]] == ["admin", "student"]


def test_student_cannot_reply_to_someone_elses_ticket(client):
    response = client.post("/api/v1/support/tickets/999999/messages", json={"message": "Olá, isso não é meu."})
    assert response.status_code == 404


def test_student_cannot_reply_to_a_ticket_that_belongs_to_someone_else(client):
    from src.models import SupportTicket

    db = SessionLocal()
    try:
        admin = db.scalar(select(User).where(User.email == "admin@demo.com"))
        ticket = SupportTicket(user_id=admin.id, category="other", subject="Chamado do admin", message="Mensagem do outro usuário.")
        db.add(ticket)
        db.commit()
        ticket_id = ticket.id
    finally:
        db.close()

    # o aluno demo (usuário autenticado nos testes) tenta responder um chamado que existe, mas é de outro usuário
    response = client.post(f"/api/v1/support/tickets/{ticket_id}/messages", json={"message": "Tentando entrar no chamado alheio."})

    assert response.status_code == 404
    db = SessionLocal()
    try:
        assert db.get(SupportTicket, ticket_id).messages == []
    finally:
        db.close()


def test_reply_moves_the_ticket_up_by_updating_updated_at(client, as_admin, monkeypatch):
    monkeypatch.setattr("src.services.email_service.fire_and_forget", lambda send, **kw: None)
    client.post("/api/v1/support/tickets", json={"category": "other", "subject": "Ordenação por atualização", "message": "Mensagem inicial do chamado."})
    ticket = next(t for t in api_data(client.get("/api/v1/admin/support-tickets"))["items"] if t["subject"] == "Ordenação por atualização")

    client.post(f"/api/v1/admin/support-tickets/{ticket['id']}/reply", json={"message": "Resposta que deve atualizar o chamado."})

    after = next(t for t in api_data(client.get("/api/v1/admin/support-tickets"))["items"] if t["id"] == ticket["id"])
    assert after["updated_at"] >= ticket["updated_at"]
    assert len(after["messages"]) == 1
