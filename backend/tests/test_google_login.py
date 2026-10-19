"""POST /auth/google: valida o ID token do Google e cria/vincula a conta.

As chaves públicas do Google são substituídas por um par RSA gerado no teste (JWKS local); o
restante — assinatura, `aud`, `iss`, expiração e `email_verified` — é a validação de verdade.
"""

from __future__ import annotations

import time

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jose import jwk, jwt
from sqlalchemy import select

from src.config.settings import settings
from src.database.session import SessionLocal
from src.models import User
from src.services import google_identity

CLIENT_ID = "test-client-id.apps.googleusercontent.com"


def _keypair():
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
    public_pem = private.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()
    public_jwk = jwk.construct(public_pem, "RS256").to_dict()
    public_jwk["kid"] = "test-key"
    return private_pem, {"keys": [public_jwk]}


PRIVATE_PEM, JWKS = _keypair()
_OTHER_PRIVATE_PEM, _ = _keypair()


def _token(*, sub="g-123", email="google.user@example.com", email_verified=True, aud=CLIENT_ID, iss="https://accounts.google.com", exp_delta=3600, key=PRIVATE_PEM):
    now = int(time.time())
    claims = {"sub": sub, "email": email, "email_verified": email_verified, "name": "Pessoa Google", "aud": aud, "iss": iss, "iat": now, "exp": now + exp_delta}
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": "test-key"})


@pytest.fixture()
def google(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", CLIENT_ID)
    monkeypatch.setattr(google_identity, "_fetch_jwks", lambda **kw: JWKS)
    from src.dependencies import get_current_user
    from src.main import app

    monkeypatch.delitem(app.dependency_overrides, get_current_user)  # sessão vem do cookie de verdade


def _post(client, credential, accept_terms=True):
    return client.post("/api/v1/auth/google", json={"credential": credential, "accept_terms": accept_terms})


def _user_by_email(email):
    db = SessionLocal()
    try:
        return db.scalar(select(User).where(User.email == email))
    finally:
        db.close()


def test_new_google_user_is_created_without_password_and_gets_a_session(client, google):
    response = _post(client, _token(sub="new-sub", email="novo.google@example.com"))

    assert response.status_code == 200
    assert response.json()["data"]["user"]["email"] == "novo.google@example.com"
    assert response.cookies.get("access_token") and response.cookies.get("refresh_token")
    user = _user_by_email("novo.google@example.com")
    assert user.hashed_password is None and user.google_sub == "new-sub" and user.terms_accepted_at is not None
    assert client.get("/api/v1/auth/me").json()["data"]["email"] == "novo.google@example.com"


def test_new_account_requires_terms_but_existing_one_does_not(client, google):
    blocked = _post(client, _token(sub="s-terms", email="semtermos@example.com"), accept_terms=False)
    assert blocked.status_code == 400 and blocked.json()["error"] == "terms_not_accepted"
    assert _user_by_email("semtermos@example.com") is None

    assert _post(client, _token(sub="s-terms", email="semtermos@example.com")).status_code == 200
    # quem já tem conta entra sem aceitar de novo
    assert _post(client, _token(sub="s-terms", email="semtermos@example.com"), accept_terms=False).status_code == 200


def test_existing_email_is_linked_not_duplicated(client, google):
    client.post("/api/v1/auth/register", json={"name": "Com Senha", "email": "vincular@example.com", "password": "senha1234", "accept_terms": True})
    client.cookies.clear()

    response = _post(client, _token(sub="link-sub", email="vincular@example.com"), accept_terms=False)

    assert response.status_code == 200
    db = SessionLocal()
    try:
        users = db.scalars(select(User).where(User.email == "vincular@example.com")).all()
    finally:
        db.close()
    assert len(users) == 1 and users[0].google_sub == "link-sub" and users[0].hashed_password
    # a senha antiga continua funcionando
    assert client.post("/api/v1/auth/login", json={"email": "vincular@example.com", "password": "senha1234"}).status_code == 200


@pytest.mark.parametrize(
    "kwargs",
    [
        {"aud": "outro-client-id"},
        {"exp_delta": -60},
        {"iss": "https://evil.example.com"},
        {"email_verified": False},
        {"key": _OTHER_PRIVATE_PEM},
    ],
    ids=["aud-errado", "expirado", "emissor-errado", "email-nao-verificado", "assinatura-de-outra-chave"],
)
def test_invalid_tokens_are_rejected_and_create_nothing(client, google, kwargs):
    email = "naodeve@example.com"
    response = _post(client, _token(email=email, **kwargs))
    assert response.status_code == 401
    assert response.json()["error"] == "invalid_google_token"
    assert _user_by_email(email) is None


def test_garbage_credential_is_rejected(client, google):
    response = _post(client, "isto-nao-e-um-jwt-valido-nem-de-longe")
    assert response.status_code == 401


def test_disabled_without_client_id(client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", None)
    assert _post(client, "x" * 40).status_code == 503


def test_google_only_account_cannot_password_login_and_change_password_explains(client, google):
    _post(client, _token(sub="only-google", email="somente.google@example.com"))
    csrf = {"X-CSRF-Token": client.cookies.get("csrf_token")}

    change = client.post("/api/v1/auth/change-password", json={"current_password": "qualquer1", "new_password": "novasenha99"}, headers=csrf)
    assert change.status_code == 400 and change.json()["error"] == "no_password_set"

    client.cookies.clear()
    login = client.post("/api/v1/auth/login", json={"email": "somente.google@example.com", "password": "qualquer1"})
    assert login.status_code == 401 and login.json()["error"] == "invalid_credentials"


def test_unknown_kid_triggers_one_key_refresh_then_succeeds(monkeypatch):
    """Rotação de chaves: o cache tem só a chave antiga; a releitura traz a nova e o token vale."""
    monkeypatch.setattr(settings, "google_client_id", CLIENT_ID)
    calls: list[bool] = []

    def loader(*, force: bool = False):
        calls.append(force)
        return JWKS if force else {"keys": []}

    identity = google_identity.verify_google_id_token(_token(), jwks_loader=loader)

    assert identity.email == "google.user@example.com"
    assert calls == [False, True]
