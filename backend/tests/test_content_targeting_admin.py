"""REQ-1, REQ-2, REQ-6: aulas/atividades aceitam e persistem targets via admin."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import Module, User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def _first_module_id() -> int:
    db = SessionLocal()
    try:
        module = db.scalar(select(Module).order_by(Module.order))
        assert module is not None
        return module.id
    finally:
        db.close()


def test_create_lesson_persists_targets(client):
    module_id = _first_module_id()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(
            f"/api/v1/admin/modules/{module_id}/lessons",
            json={
                "title": "Aula com target",
                "description": "Descricao valida com mais de dez caracteres.",
                "summary": "Resumo valido com mais de dez caracteres.",
                "targets": ["WEAK_THESIS"],
            },
        )
        assert response.status_code == 201
        assert api_data(response)["targets"] == ["WEAK_THESIS"]
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_create_lesson_rejects_invalid_target(client):
    module_id = _first_module_id()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(
            f"/api/v1/admin/modules/{module_id}/lessons",
            json={
                "title": "Aula invalida",
                "description": "Descricao valida com mais de dez caracteres.",
                "summary": "Resumo valido com mais de dez caracteres.",
                "targets": ["NAO_EXISTE"],
            },
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_update_lesson_persists_targets(client):
    module_id = _first_module_id()
    app.dependency_overrides[require_admin] = override_admin
    try:
        create = client.post(
            f"/api/v1/admin/modules/{module_id}/lessons",
            json={
                "title": "Aula pra editar",
                "description": "Descricao valida com mais de dez caracteres.",
                "summary": "Resumo valido com mais de dez caracteres.",
            },
        )
        lesson_id = api_data(create)["id"]

        response = client.patch(f"/api/v1/admin/lessons/{lesson_id}", json={"targets": ["C3_LOW"]})
        assert response.status_code == 200
        modules = api_data(response)
        lesson = next(
            item["lesson"]
            for module in modules
            for item in module["items"]
            if item["kind"] == "lesson" and item["lesson"] and item["lesson"]["id"] == lesson_id
        )
        assert lesson["targets"] == ["C3_LOW"]
    finally:
        app.dependency_overrides.pop(require_admin, None)
