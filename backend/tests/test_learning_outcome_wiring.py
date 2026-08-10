"""P2a Bloco 1 — REQ-2/REQ-3: os 3 canais gravam LearningOutcome; atividade sem sinal cognitivo
(aula concluida) nao gera evidencia."""

from sqlalchemy import select

from src.database.session import SessionLocal
from src.models import Difficulty, Exercise, LearningOutcome, Lesson, Module, User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def _demo_user_id() -> int:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        return user.id
    finally:
        db.close()


def _count_outcomes(user_id: int, code: str | None = None) -> int:
    db = SessionLocal()
    try:
        query = select(LearningOutcome).where(LearningOutcome.user_id == user_id)
        if code:
            query = query.where(LearningOutcome.cognitive_issue_code == code)
        return len(list(db.scalars(query)))
    finally:
        db.close()


def test_game_complete_records_learning_outcome(client):
    user_id = _demo_user_id()
    before = _count_outcomes(user_id, "WEAK_THESIS")

    client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "p2a-outcome-game",
            "score": 3,
            "total": 10,
            "duration_seconds": 40,
            "cognitive_outcomes": [{"hub": "introducao-sem-tese", "event": "VAGUE_THESIS", "severity": 0.7}],
        },
    )

    after = _count_outcomes(user_id, "WEAK_THESIS")
    assert after == before + 1

    db = SessionLocal()
    try:
        row = db.scalars(
            select(LearningOutcome).where(LearningOutcome.user_id == user_id, LearningOutcome.cognitive_issue_code == "WEAK_THESIS")
        ).all()[-1]
        assert row.source == "GAME"
        assert row.direction == "negative"
        assert row.weight == 1
    finally:
        db.close()


def test_exercise_submit_records_learning_outcome(client):
    user_id = _demo_user_id()
    db = SessionLocal()
    try:
        module = db.scalar(select(Module))
        assert module is not None
        exercise = Exercise(
            module_id=module.id,
            statement="Enunciado valido para teste de learning outcome de exercicio.",
            options=["A", "B", "C", "D", "E"],
            correct_answer="A",
            explanation="Explicacao valida com mais de vinte caracteres.",
            skill="c3",
            difficulty=Difficulty.MEDIUM,
            targets=["C3_LOW"],
        )
        db.add(exercise)
        db.commit()
        db.refresh(exercise)
        exercise_id = exercise.id
    finally:
        db.close()

    before = _count_outcomes(user_id, "C3_LOW")

    client.post(f"/api/v1/exercises/{exercise_id}/submit", json={"selected_answer": "B"})

    after = _count_outcomes(user_id, "C3_LOW")
    assert after == before + 1

    db = SessionLocal()
    try:
        row = db.scalars(
            select(LearningOutcome).where(LearningOutcome.user_id == user_id, LearningOutcome.cognitive_issue_code == "C3_LOW")
        ).all()[-1]
        assert row.source == "EXERCISE"
        assert row.direction == "negative"
        assert row.weight == 1
    finally:
        db.close()


def test_lesson_completion_does_not_record_learning_outcome(client):
    user_id = _demo_user_id()
    db = SessionLocal()
    try:
        lesson = db.scalar(select(Lesson))
        assert lesson is not None
        lesson_id = lesson.id
    finally:
        db.close()

    db = SessionLocal()
    try:
        total_before = len(list(db.scalars(select(LearningOutcome).where(LearningOutcome.user_id == user_id))))
    finally:
        db.close()

    client.put(f"/api/v1/lessons/{lesson_id}/progress", json={"progress_percent": 100, "last_position_seconds": 600, "completed": True})

    db = SessionLocal()
    try:
        total_after = len(list(db.scalars(select(LearningOutcome).where(LearningOutcome.user_id == user_id))))
    finally:
        db.close()

    assert total_after == total_before
