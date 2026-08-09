"""REQ-13: concluir aula registra atividade (streak), mas NAO aplica sinal de CognitiveIssue —
assistir aula e atividade, nao evidencia de dominio."""

from sqlalchemy import select

from src.database.session import SessionLocal
from src.models import Lesson, StudentLearningProfile, User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def _first_lesson_id() -> int:
    db = SessionLocal()
    try:
        lesson = db.scalar(select(Lesson))
        assert lesson is not None
        return lesson.id
    finally:
        db.close()


def _profile_cognitive_issues() -> dict:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        profile = db.scalar(select(StudentLearningProfile).where(StudentLearningProfile.user_id == user.id))
        return dict(profile.cognitive_issues) if profile else {}
    finally:
        db.close()


def test_completing_lesson_does_not_change_cognitive_issues(client):
    lesson_id = _first_lesson_id()
    before = _profile_cognitive_issues()

    response = client.put(
        f"/api/v1/lessons/{lesson_id}/progress",
        json={"progress_percent": 100, "last_position_seconds": 600, "completed": True},
    )
    assert response.status_code == 200
    assert api_data(response)["completed"] is True

    after = _profile_cognitive_issues()
    assert after == before
