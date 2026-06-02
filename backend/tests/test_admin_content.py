from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import require_admin
from src.main import app
from src.models import User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def test_admin_can_create_course_module_and_lesson(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        course_response = client.post(
            "/api/v1/admin/courses",
            json={
                "title": "Curso Admin",
                "slug": "curso-admin",
                "description": "Curso criado pelo painel administrativo.",
                "color": "#65BE02",
            },
        )
        assert course_response.status_code == 201
        course = api_data(course_response)

        module_response = client.post(
            f"/api/v1/admin/courses/{course['id']}/modules",
            json={"title": "Modulo Admin", "description": "Modulo criado dentro do curso."},
        )
        assert module_response.status_code == 201
        module = api_data(module_response)
        assert module["order"] == 1

        lesson_response = client.post(
            f"/api/v1/admin/modules/{module['id']}/lessons",
            json={
                "title": "Aula Admin",
                "description": "Aula criada dentro do modulo.",
                "summary": "Resumo da aula criada para validar a estrutura de pastas.",
                "duration_minutes": 12,
            },
        )
        assert lesson_response.status_code == 201
        lesson = api_data(lesson_response)
        assert lesson["order"] == 1

        content_response = client.get("/api/v1/admin/content")
        assert content_response.status_code == 200
        content = api_data(content_response)
        created_course = next(item for item in content if item["id"] == course["id"])
        assert created_course["modules"][0]["lessons"][0]["title"] == "Aula Admin"
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_created_course_is_visible_to_students(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        course_response = client.post(
            "/api/v1/admin/courses",
            json={
                "title": "Curso Visivel",
                "description": "Curso que deve aparecer na tela de aulas.",
            },
        )
        assert course_response.status_code == 201
        course = api_data(course_response)
    finally:
        app.dependency_overrides.pop(require_admin, None)

    courses_response = client.get("/api/v1/lessons/courses")
    assert courses_response.status_code == 200
    courses = api_data(courses_response)
    assert course["id"] in {item["id"] for item in courses}
