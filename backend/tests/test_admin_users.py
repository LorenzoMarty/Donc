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


def test_admin_can_update_student_controls(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        users_response = client.get("/api/v1/admin/users")
        assert users_response.status_code == 200
        student = next(user for user in api_data(users_response)["items"] if user["role"] == "student")

        response = client.patch(
            f"/api/v1/admin/users/{student['id']}",
            json={
                "name": "Aluno Controlado",
                "streak_days": 6,
                "daily_goal_minutes": 75,
            },
        )

        assert response.status_code == 200
        updated = api_data(response)
        assert updated["name"] == "Aluno Controlado"
        assert updated["streak_days"] == 6
        assert updated["daily_goal_minutes"] == 75
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_admin_user_is_protected_from_student_controls(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        users_response = client.get("/api/v1/admin/users")
        assert users_response.status_code == 200
        admin = next(user for user in api_data(users_response)["items"] if user["role"] == "admin")

        response = client.patch(f"/api/v1/admin/users/{admin['id']}", json={"streak_days": 10})

        assert response.status_code == 409
        assert response.json()["success"] is False
        assert response.json()["error"] == "admin_user_protected"
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_admin_can_delete_student(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        create_response = client.post(
            "/api/v1/auth/register",
            json={"name": "Aluno Delete", "email": "delete-admin@test.com", "password": "senha1234"},
        )
        assert create_response.status_code == 201
        user_id = api_data(create_response)["user"]["id"]
        csrf_token = create_response.cookies.get("csrf_token")

        response = client.delete(f"/api/v1/admin/users/{user_id}", headers={"X-CSRF-Token": csrf_token})

        assert response.status_code == 200
        assert api_data(response) == {"action": "deleted", "user_id": user_id}
    finally:
        app.dependency_overrides.pop(require_admin, None)
