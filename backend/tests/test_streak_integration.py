"""REQ-48: GET autenticado nao incrementa; atividade pedagogica valida incrementa; multiplas
atividades no mesmo dia nao duplicam.

O usuario demo (aluno@demo.com) e compartilhado por toda a suite (mesmo arquivo sqlite) — outros
testes (ex.: admin sobrescrevendo streak_days, jogos/redacoes tocando last_activity_at) mudam seu
estado antes destes testes rodarem. Por isso cada teste normaliza o estado de streak do usuario
diretamente no banco antes de agir, em vez de assumir um valor de seed fixo.
"""

from sqlalchemy import select

from src.database.session import SessionLocal
from src.models import User


def _reset_streak_state() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        user.streak_days = 0
        user.last_activity_at = None
        db.commit()
    finally:
        db.close()


def _streak_days() -> int:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        return user.streak_days
    finally:
        db.close()


def test_get_requests_do_not_increment_streak(client):
    _reset_streak_state()
    client.get("/api/v1/auth/me")
    client.get("/api/v1/dashboard")
    client.get("/api/v1/essays/history")
    assert _streak_days() == 0


def test_login_does_not_increment_streak(client):
    _reset_streak_state()
    response = client.post("/api/v1/auth/login", json={"email": "aluno@demo.com", "password": "12345678"})
    assert response.status_code == 200
    assert _streak_days() == 0


def test_exercise_submission_increments_streak(client):
    _reset_streak_state()
    exercises = client.get("/api/v1/exercises").json()["data"]
    assert exercises, "seed deveria ter ao menos um exercicio"
    exercise = exercises[0]

    client.post(f"/api/v1/exercises/{exercise['id']}/submit", json={"selected_answer": "A"})

    assert _streak_days() == 1


def test_multiple_activities_same_day_do_not_duplicate_streak(client):
    _reset_streak_state()
    exercises = client.get("/api/v1/exercises").json()["data"]
    exercise = exercises[0]

    client.post(f"/api/v1/exercises/{exercise['id']}/submit", json={"selected_answer": "A"})
    after_first = _streak_days()
    assert after_first == 1

    client.post(f"/api/v1/exercises/{exercise['id']}/submit", json={"selected_answer": "B"})
    after_second = _streak_days()

    assert after_second == after_first
