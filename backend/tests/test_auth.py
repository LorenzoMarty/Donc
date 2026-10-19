from __future__ import annotations

import pytest

from src.config.settings import settings
from src.utils import auth_rate_limit


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def test_register_creates_user_and_returns_token(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Novo Aluno", "email": "novo@test.com", "accept_terms": True, "password": "senha1234"},
    )
    assert response.status_code == 201
    data = api_data(response)
    assert "access_token" not in data
    assert data["user"]["email"] == "novo@test.com"
    assert response.cookies.get("access_token")
    assert response.cookies.get("refresh_token")
    assert response.cookies.get("csrf_token")


def test_register_rejects_duplicate_email(client):
    payload = {"name": "Aluno A", "email": "dup@test.com", "accept_terms": True, "password": "senha1234"}
    r1 = client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409
    assert r2.json()["success"] is False


def test_login_returns_token_for_valid_credentials(client):
    client.post("/api/v1/auth/register", json={"name": "Login Test", "email": "login@test.com", "accept_terms": True, "password": "senha1234"})
    response = client.post("/api/v1/auth/login", json={"email": "login@test.com", "password": "senha1234"})
    assert response.status_code == 200
    data = api_data(response)
    assert "access_token" not in data
    assert data["user"]["email"] == "login@test.com"
    assert response.cookies.get("access_token")
    assert response.cookies.get("refresh_token")
    assert response.cookies.get("csrf_token")


def test_login_rejects_wrong_password(client):
    client.post("/api/v1/auth/register", json={"name": "Wrong Pass", "email": "wrong@test.com", "accept_terms": True, "password": "correct"})
    response = client.post("/api/v1/auth/login", json={"email": "wrong@test.com", "password": "incorrect"})
    assert response.status_code == 401
    assert response.json()["success"] is False


def test_login_rejects_unknown_email(client):
    response = client.post("/api/v1/auth/login", json={"email": "ghost@test.com", "password": "qualquer"})
    assert response.status_code == 401
    assert response.json()["success"] is False


def test_login_rate_limit_blocks_repeated_attempts(client, monkeypatch):
    original_limit = settings.auth_rate_limit_per_minute
    auth_rate_limit._memory_counters.clear()
    monkeypatch.setattr(auth_rate_limit, "_increment_redis", lambda key: None)
    settings.auth_rate_limit_per_minute = 1
    try:
        payload = {"email": "rate-limit@test.com", "password": "qualquer"}
        assert client.post("/api/v1/auth/login", json=payload).status_code == 401
        response = client.post("/api/v1/auth/login", json=payload)
        assert response.status_code == 429
        assert response.json()["error"] == "rate_limit_exceeded"
    finally:
        settings.auth_rate_limit_per_minute = original_limit
        auth_rate_limit._memory_counters.clear()


def test_cookie_authenticated_mutation_requires_csrf_header(client):
    client.post("/api/v1/auth/login", json={"email": "aluno@demo.com", "password": "12345678"})

    response = client.patch("/api/v1/auth/me", json={"name": "Sem CSRF"})

    assert response.status_code == 403
    assert response.json()["error"] == "csrf_invalid"


def test_cookie_authenticated_mutation_accepts_csrf_header(client):
    login = client.post("/api/v1/auth/login", json={"email": "aluno@demo.com", "password": "12345678"})
    csrf_token = login.cookies.get("csrf_token")

    try:
        response = client.patch("/api/v1/auth/me", headers={"X-CSRF-Token": csrf_token}, json={"name": "Com CSRF"})

        assert response.status_code == 200
        assert api_data(response)["name"] == "Com CSRF"
    finally:
        client.patch("/api/v1/auth/me", headers={"X-CSRF-Token": csrf_token}, json={"name": "Aluno Demo"})


def test_me_returns_user_shape(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = api_data(response)
    assert "email" in data
    assert "name" in data


def test_me_exposes_created_at(client):
    data = api_data(client.get("/api/v1/auth/me"))
    assert data["created_at"]


def test_update_me_changes_name(client):
    original = api_data(client.get("/api/v1/auth/me"))["name"]
    try:
        response = client.patch("/api/v1/auth/me", json={"name": "Aluno Renomeado"})
        assert response.status_code == 200
        assert api_data(response)["name"] == "Aluno Renomeado"
    finally:
        client.patch("/api/v1/auth/me", json={"name": original})


def test_update_me_rejects_short_and_long_names(client):
    assert client.patch("/api/v1/auth/me", json={"name": "A"}).status_code == 422
    assert client.patch("/api/v1/auth/me", json={"name": "x" * 121}).status_code == 422


def test_change_password_rejects_wrong_current(client):
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "senha-errada", "new_password": "novasenha123"},
    )
    assert response.status_code == 400
    assert response.json()["error"] == "invalid_current_password"


def test_change_password_rejects_weak_new_password(client):
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "12345678", "new_password": "curta"},
    )
    assert response.status_code == 422


def test_change_password_succeeds_and_restores(client):
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "12345678", "new_password": "novasenha123"},
    )
    assert response.status_code == 200
    # restaura a senha demo para nao contaminar a suite (user compartilhado pelo override)
    restore = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "novasenha123", "new_password": "12345678"},
    )
    assert restore.status_code == 200


def _recovery_token(monkeypatch, email: str) -> str:
    sent: list[dict] = []
    monkeypatch.setattr("src.services.email_service.send_password_reset", lambda **kw: sent.append(kw) or True)
    return sent


def test_password_recovery_does_not_reveal_unknown_email(client, monkeypatch):
    sent = _recovery_token(monkeypatch, "x")
    response = client.post("/api/v1/auth/password-recovery", json={"email": "ghost-recovery@test.com"})
    assert response.status_code == 200
    assert sent == []


def test_password_reset_flow_token_is_single_use(client, monkeypatch):
    sent = _recovery_token(monkeypatch, "x")
    client.post("/api/v1/auth/register", json={"name": "Reset Flow", "email": "reset@test.com", "accept_terms": True, "password": "senha1234"})
    assert client.post("/api/v1/auth/password-recovery", json={"email": "reset@test.com"}).status_code == 200
    token = sent[0]["token"]

    ok = client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "novasenha99"})
    assert ok.status_code == 200
    assert client.post("/api/v1/auth/login", json={"email": "reset@test.com", "password": "novasenha99"}).status_code == 200
    assert client.post("/api/v1/auth/login", json={"email": "reset@test.com", "password": "senha1234"}).status_code == 401

    reused = client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "outrasenha1"})
    assert reused.status_code == 400
    assert reused.json()["error"] == "invalid_reset_token"


def test_password_reset_rejects_expired_token(client, monkeypatch):
    sent = _recovery_token(monkeypatch, "x")
    monkeypatch.setattr(settings, "password_reset_token_minutes", -1)
    client.post("/api/v1/auth/register", json={"name": "Expired", "email": "verify-expired@test.com", "accept_terms": True, "password": "senha1234"})
    client.post("/api/v1/auth/password-recovery", json={"email": "verify-expired@test.com"})
    response = client.post("/api/v1/auth/reset-password", json={"token": sent[0]["token"], "new_password": "novasenha99"})
    assert response.status_code == 400
    assert response.json()["error"] == "invalid_reset_token"


def test_password_reset_rejects_garbage_token(client):
    response = client.post("/api/v1/auth/reset-password", json={"token": "x" * 40, "new_password": "novasenha99"})
    assert response.status_code == 400


def test_register_requires_terms_acceptance(client):
    response = client.post(
        "/api/v1/auth/register", json={"name": "Sem Aceite", "email": "sem-aceite@test.com", "password": "senha1234"}
    )
    assert response.status_code == 400
    assert response.json()["error"] == "terms_not_accepted"


def test_register_records_terms_version(client):
    from sqlalchemy import select

    from src.database.session import SessionLocal
    from src.models import User

    client.post(
        "/api/v1/auth/register",
        json={"name": "Com Aceite", "email": "com-aceite@test.com", "password": "senha1234", "accept_terms": True},
    )
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "com-aceite@test.com"))
        assert user.terms_version == settings.legal_terms_version
        assert user.terms_accepted_at is not None


def test_password_recovery_and_reset_are_rate_limited(client, monkeypatch):
    monkeypatch.setattr(settings, "auth_rate_limit_per_minute", 2)
    monkeypatch.setattr(auth_rate_limit, "_memory_counters", {})
    monkeypatch.setattr(auth_rate_limit, "_increment_redis", lambda key: None)
    codes = [client.post("/api/v1/auth/password-recovery", json={"email": "rl-recovery@test.com"}).status_code for _ in range(3)]
    assert codes == [200, 200, 429]
    codes = [
        client.post("/api/v1/auth/reset-password", json={"token": "x" * 40, "new_password": "novasenha99"}).status_code
        for _ in range(3)
    ]
    assert codes == [400, 400, 429]


@pytest.fixture()
def real_auth(monkeypatch):
    """A suite sobrescreve `get_current_user` com o aluno demo; aqui o usuario vem do cookie de verdade."""
    from src.dependencies import get_current_user
    from src.main import app

    monkeypatch.delitem(app.dependency_overrides, get_current_user)


def _register_capturing_token(client, monkeypatch, email):
    sent: list[dict] = []
    monkeypatch.setattr("src.services.email_service.send_email_verification", lambda **kw: sent.append(kw) or True)
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Verifica", "email": email, "password": "senha1234", "accept_terms": True},
    )
    assert response.status_code == 201
    assert response.json()["data"]["user"]["email_verified"] is False
    assert sent and sent[0]["to"] == email
    return sent[0]["token"], {"X-CSRF-Token": response.cookies.get("csrf_token")}


def test_register_sends_verification_then_welcome_after_confirming(client, monkeypatch, real_auth):
    token, _ = _register_capturing_token(client, monkeypatch, "verify@test.com")
    welcomed: list[dict] = []
    monkeypatch.setattr("src.services.email_service.send_welcome", lambda **kw: welcomed.append(kw) or True)

    ok = client.post("/api/v1/auth/verify-email", json={"token": token})
    assert ok.status_code == 200
    assert welcomed and welcomed[0]["to"] == "verify@test.com"
    assert client.get("/api/v1/auth/me").json()["data"]["email_verified"] is True

    # uso único
    again = client.post("/api/v1/auth/verify-email", json={"token": token})
    assert again.status_code == 400
    assert again.json()["error"] == "invalid_verification_token"


def test_verify_email_rejects_expired_token(client, monkeypatch, real_auth):
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import update

    from src.database.session import SessionLocal
    from src.models import EmailVerificationToken

    token, _ = _register_capturing_token(client, monkeypatch, "emailverify-expired@test.com")
    db = SessionLocal()
    try:
        db.execute(update(EmailVerificationToken).values(expires_at=datetime.now(UTC) - timedelta(hours=1)))
        db.commit()
    finally:
        db.close()
    response = client.post("/api/v1/auth/verify-email", json={"token": token})
    assert response.status_code == 400
    assert response.json()["error"] == "invalid_verification_token"


def test_unverified_user_cannot_checkout_and_resend_has_cooldown(client, monkeypatch, real_auth):
    _, csrf = _register_capturing_token(client, monkeypatch, "gate@test.com")

    checkout = client.post("/api/v1/subscriptions/checkout", json={"cycle": "monthly", "accept_terms": True}, headers=csrf)
    assert checkout.status_code == 403
    assert checkout.json()["error"] == "email_not_verified"

    # o cadastro acabou de emitir um token: reenvio imediato cai no cooldown
    assert client.post("/api/v1/auth/resend-verification", headers=csrf).status_code == 429
    monkeypatch.setattr(settings, "email_verification_resend_cooldown_seconds", 0)
    assert client.post("/api/v1/auth/resend-verification", headers=csrf).status_code == 200


def test_welcome_email_only_on_first_verification(client, monkeypatch, real_auth):
    from sqlalchemy import select

    from src.database.session import SessionLocal
    from src.models import EmailVerificationToken, User
    from src.services.auth_service import AuthService

    token, _ = _register_capturing_token(client, monkeypatch, "twice@test.com")
    welcomed: list[dict] = []
    monkeypatch.setattr("src.services.email_service.send_welcome", lambda **kw: welcomed.append(kw) or True)
    assert client.post("/api/v1/auth/verify-email", json={"token": token}).status_code == 200
    assert len(welcomed) == 1

    # token antigo de quem já está verificado: o link funciona, mas não reenvia as boas-vindas
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "twice@test.com"))
        old_token = AuthService(db).issue_email_verification(user)
    finally:
        db.close()
    assert client.post("/api/v1/auth/verify-email", json={"token": old_token}).status_code == 200
    assert len(welcomed) == 1


def test_admin_is_not_blocked_by_email_verification(client):
    from sqlalchemy import select

    from src.database.session import SessionLocal
    from src.models import User
    from src.services.auth_service import AuthService

    db = SessionLocal()
    try:
        admin = db.scalar(select(User).where(User.email == "admin@demo.com"))
        admin.email_verified_at = None
        AuthService(db).require_email_verified(admin)  # não levanta
        student = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        student.email_verified_at = None
        try:
            AuthService(db).require_email_verified(student)
            raised = False
        except Exception as exc:  # noqa: BLE001
            raised = getattr(exc, "code", "") == "email_not_verified"
        db.rollback()
    finally:
        db.close()
    assert raised


def test_export_my_data_downloads_json(client):
    response = client.get("/api/v1/auth/me/export")
    assert response.status_code == 200
    assert "attachment" in response.headers["content-disposition"]
    body = response.json()
    assert body["account"]["email"] == "aluno@demo.com"
    assert "hashed_password" not in body["account"]
    assert {"essays", "goals", "game_attempts", "subscription"} <= set(body)


def test_delete_account_requires_password_then_blocks_login(client, monkeypatch):
    from src.dependencies import get_current_user
    from src.main import app

    monkeypatch.delitem(app.dependency_overrides, get_current_user)
    register = client.post(
        "/api/v1/auth/register",
        json={"name": "Vai Embora", "email": "bye@test.com", "password": "senha1234", "accept_terms": True},
    )
    csrf = {"X-CSRF-Token": register.cookies.get("csrf_token")}

    wrong = client.post("/api/v1/auth/delete-account", json={"password": "errada"}, headers=csrf)
    assert wrong.status_code == 400

    ok = client.post("/api/v1/auth/delete-account", json={"password": "senha1234"}, headers=csrf)
    assert ok.status_code == 200

    client.cookies.clear()
    login = client.post("/api/v1/auth/login", json={"email": "bye@test.com", "password": "senha1234"})
    assert login.status_code == 401


def test_delete_account_requires_csrf_header_for_cookie_sessions(client):
    client.post("/api/v1/auth/login", json={"email": "aluno@demo.com", "password": "12345678"})
    response = client.post("/api/v1/auth/delete-account", json={"password": "12345678"})
    assert response.status_code == 403 and response.json()["error"] == "csrf_invalid"
