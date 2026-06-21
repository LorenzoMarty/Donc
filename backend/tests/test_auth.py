from __future__ import annotations


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
    assert data["access_token"]
    assert data["user"]["email"] == "novo@test.com"


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
    assert data["access_token"]
    assert data["user"]["email"] == "login@test.com"


def test_login_rejects_wrong_password(client):
    client.post("/api/v1/auth/register", json={"name": "Wrong Pass", "email": "wrong@test.com", "password": "correct"})
    response = client.post("/api/v1/auth/login", json={"email": "wrong@test.com", "password": "incorrect"})
    assert response.status_code == 401
    assert response.json()["success"] is False


def test_login_rejects_unknown_email(client):
    response = client.post("/api/v1/auth/login", json={"email": "ghost@test.com", "password": "qualquer"})
    assert response.status_code == 401
    assert response.json()["success"] is False


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
