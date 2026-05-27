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
