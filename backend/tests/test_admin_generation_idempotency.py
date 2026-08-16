"""P2b Bloco 3 (REQ-8) — idempotency key real no endpoint de geracao de tema.

Nota: os testes equivalentes para jogo (idempotencia de `POST /ai-games/generate`) foram removidos
junto com esse endpoint — jogos nao sao mais criados via IA (admin-reorganizacao-ux, pedido do
usuario: "os jogos não podem ser criados, os que existem são os que vão ter"). As acoes de IA que
restaram pra jogo (adicionar pergunta/conteudo) sao "append", nao "create", e nunca tiveram
idempotency-dedup — so registram a chave pra auditoria."""

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import EssayTheme, User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def test_repeated_theme_generation_with_same_key_does_not_duplicate(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        payload = {"focus": "meio ambiente urbano", "idempotency_key": "test-theme-key-1"}
        first = api_data(client.post("/api/v1/admin/essay-themes/generate", json=payload))
        second = api_data(client.post("/api/v1/admin/essay-themes/generate", json=payload))
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert first["id"] == second["id"]

    db = SessionLocal()
    try:
        theme_count = db.scalar(select(func.count()).select_from(EssayTheme).where(EssayTheme.id == first["id"]))
    finally:
        db.close()
    assert theme_count == 1
