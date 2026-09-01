from __future__ import annotations

from src.config.settings import settings
from src.utils import auth_rate_limit


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def test_register_creates_user_and_returns_token(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Novo Aluno", "email": "novo@test.com", "password": "senha1234"},
    )
    assert response.status_code == 201
    data = api_data(response)
    assert "access_token" not in data
    assert data["user"]["email"] == "novo@test.com"
    assert response.cookies.get("access_token")
    assert response.cookies.get("refresh_token")
    assert response.cookies.get("csrf_token")


def test_register_rejects_duplicate_email(client):
    payload = {"name": "Aluno A", "email": "dup@test.com", "password": "senha1234"}
    r1 = client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409
    assert r2.json()["success"] is False


def test_login_returns_token_for_valid_credentials(client):
    client.post("/api/v1/auth/register", json={"name": "Login Test", "email": "login@test.com", "password": "senha1234"})
    response = client.post("/api/v1/auth/login", json={"email": "login@test.com", "password": "senha1234"})
    assert response.status_code == 200
    data = api_data(response)
    assert "access_token" not in data
    assert data["user"]["email"] == "login@test.com"
    assert response.cookies.get("access_token")
    assert response.cookies.get("refresh_token")
    assert response.cookies.get("csrf_token")


def test_login_rejects_wrong_password(client):
    client.post("/api/v1/auth/register", json={"name": "Wrong Pass", "email": "wrong@test.com", "password": "correct"})
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


def test_password_recovery_is_explicitly_unavailable_without_email_provider(client):
    response = client.post("/api/v1/auth/password-recovery", json={"email": "aluno@demo.com"})

    assert response.status_code == 501
    assert response.json()["success"] is False
    assert response.json()["error"] == "password_recovery_not_configured"


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
