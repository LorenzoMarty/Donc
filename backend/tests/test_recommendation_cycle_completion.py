"""P2a Bloco 5 (REQ-16..REQ-18) — completar recomendacao ao concluir jogo/exercicio/aula."""

from sqlalchemy import select

from src.database.session import SessionLocal
from src.memory.profile import get_or_create_learning_profile
from src.models import Difficulty, Exercise, LearningOutcome, Lesson, Module, RecommendationLog, User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def _reset_all_cognitive_issues() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        profile = get_or_create_learning_profile(db, user.id)
        profile.cognitive_issues = {}
        db.commit()
    finally:
        db.close()


def _demo_user_id() -> int:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        return user.id
    finally:
        db.close()


def test_game_complete_with_recommendation_log_id_closes_the_cycle(client):
    _reset_all_cognitive_issues()
    client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "daily-fill",
            "score": 2,
            "total": 10,
            "duration_seconds": 45,
            "cognitive_outcomes": [{"hub": "perde-na-c3", "event": "WEAK_PROGRESSION", "severity": 0.8}],
        },
    )
    actions = api_data(client.get("/api/v1/ai/recommended-actions"))
    game_action = next(a for a in actions if a["type"] == "GAME")
    log_id = game_action["recommendation_log_id"]
    client.post(f"/api/v1/ai/recommendations/{log_id}/start")

    client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "daily-order",
            "score": 8,
            "total": 10,
            "duration_seconds": 45,
            "cognitive_outcomes": [{"hub": "perde-na-c3", "event": "GOOD_PROGRESSION", "severity": 0.2}],
            "recommendation_log_id": log_id,
        },
    )

    db = SessionLocal()
    try:
        row = db.get(RecommendationLog, log_id)
        assert row.completed_at is not None
        assert row.learning_outcome_id is not None
        outcome = db.get(LearningOutcome, row.learning_outcome_id)
        assert outcome is not None
        assert outcome.cognitive_issue_code == "C3_LOW"
    finally:
        db.close()


def test_game_complete_without_recommendation_log_id_still_works(client):
    response = client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "daily-mixed-rush",
            "score": 5,
            "total": 10,
            "duration_seconds": 30,
            "cognitive_outcomes": [],
        },
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_exercise_submit_with_recommendation_log_id_closes_the_cycle(client):
    user_id = _demo_user_id()
    db = SessionLocal()
    try:
        module = db.scalar(select(Module))
        assert module is not None
        exercise = Exercise(
            module_id=module.id,
            statement="Enunciado valido para teste de fechamento de ciclo de recomendacao.",
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

        from src.memory.recommendation_log import record_shown

        log = record_shown(db, user_id=user_id, action_type="EXERCISE", target_issue="C3_LOW", target=str(exercise_id))
        db.commit()
        log_id = log.id
    finally:
        db.close()

    client.post(f"/api/v1/exercises/{exercise_id}/submit", json={"selected_answer": "B", "recommendation_log_id": log_id})

    db = SessionLocal()
    try:
        row = db.get(RecommendationLog, log_id)
        assert row.completed_at is not None
        assert row.learning_outcome_id is not None
    finally:
        db.close()


def test_lesson_progress_completion_with_recommendation_log_id_closes_the_cycle(client):
    user_id = _demo_user_id()
    db = SessionLocal()
    try:
        lesson = db.scalar(select(Lesson))
        assert lesson is not None
        lesson_id = lesson.id

        from src.memory.recommendation_log import record_shown

        log = record_shown(db, user_id=user_id, action_type="LESSON", target_issue="WEAK_THESIS", target=str(lesson_id))
        db.commit()
        log_id = log.id
    finally:
        db.close()

    client.put(
        f"/api/v1/lessons/{lesson_id}/progress",
        json={"progress_percent": 100, "last_position_seconds": 600, "completed": True, "recommendation_log_id": log_id},
    )

    db = SessionLocal()
    try:
        row = db.get(RecommendationLog, log_id)
        assert row.completed_at is not None
        assert row.learning_outcome_id is None
    finally:
        db.close()
