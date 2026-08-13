"""P3b REQ-1/REQ-2/REQ-9: EssayTheme gerado por IA entra em fila pending->approved/rejected,
igual jogo e exercicio ja tinham."""

from fastapi import Depends
from sqlalchemy import select
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


def _generate_theme(client, focus="saude publica"):
    return api_data(client.post("/api/v1/admin/essay-themes/generate", json={"focus": focus}))


def test_generated_theme_is_pending_and_hidden_from_students(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        theme = _generate_theme(client)
        assert theme["status"] == "pending"

        admin_list = api_data(client.get("/api/v1/admin/essay-themes"))
        assert theme["id"] in {t["id"] for t in admin_list}
    finally:
        app.dependency_overrides.pop(require_admin, None)

    student_themes = api_data(client.get("/api/v1/essays/themes"))
    assert theme["id"] not in {t["id"] for t in student_themes}


def test_admin_can_approve_pending_theme(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        theme = _generate_theme(client, focus="mobilidade urbana")
        response = client.post(f"/api/v1/admin/essay-themes/{theme['id']}/review", json={"action": "approve"})
        assert response.status_code == 200
        reviewed = api_data(response)
        assert reviewed["status"] == "approved"
    finally:
        app.dependency_overrides.pop(require_admin, None)

    student_themes = api_data(client.get("/api/v1/essays/themes"))
    assert theme["id"] in {t["id"] for t in student_themes}

    db = SessionLocal()
    try:
        db_theme = db.get(EssayTheme, theme["id"])
    finally:
        db.close()
    assert db_theme.is_active is True


def test_admin_can_reject_pending_theme(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        theme = _generate_theme(client, focus="tecnologia na educacao")
        response = client.post(f"/api/v1/admin/essay-themes/{theme['id']}/review", json={"action": "reject"})
        assert response.status_code == 200
        assert api_data(response)["status"] == "rejected"
    finally:
        app.dependency_overrides.pop(require_admin, None)

    student_themes = api_data(client.get("/api/v1/essays/themes"))
    assert theme["id"] not in {t["id"] for t in student_themes}


def test_review_unknown_theme_is_404(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post("/api/v1/admin/essay-themes/999999/review", json={"action": "approve"})
    finally:
        app.dependency_overrides.pop(require_admin, None)
    assert response.status_code == 404


def test_review_requires_admin(client):
    response = client.post("/api/v1/admin/essay-themes/1/review", json={"action": "approve"})
    assert response.status_code in (401, 403)


def test_admin_can_update_pending_theme_before_approval(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        theme = _generate_theme(client, focus="seguranca publica")
        response = client.patch(
            f"/api/v1/admin/essay-themes/{theme['id']}",
            json={"context": "Analise causas, consequencias e politicas publicas de seguranca urbana no Brasil."},
        )
        assert response.status_code == 200
        assert api_data(response)["context"].startswith("Analise causas")
    finally:
        app.dependency_overrides.pop(require_admin, None)
