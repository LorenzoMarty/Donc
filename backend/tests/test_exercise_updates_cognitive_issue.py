"""REQ-12: resposta de exercicio aplica sinal cognitivo nos issues declarados em Exercise.targets."""

from sqlalchemy import select

from src.database.session import SessionLocal
from src.models import Difficulty, Exercise, Module, StudentLearningProfile, User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def _reset_c3_low_issue() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        profile = db.scalar(select(StudentLearningProfile).where(StudentLearningProfile.user_id == user.id))
        if profile:
            issues = dict(profile.cognitive_issues)
            issues.pop("C3_LOW", None)
            profile.cognitive_issues = issues
            db.commit()
    finally:
        db.close()


def _seed_targeted_exercise(*, correct_answer="A", targets=None) -> int:
    db = SessionLocal()
    try:
        module = db.scalar(select(Module))
        assert module is not None
        exercise = Exercise(
            module_id=module.id,
            statement="Enunciado valido para teste de targeting cognitivo aqui.",
            options=["A", "B", "C", "D", "E"],
            correct_answer=correct_answer,
            explanation="Explicacao valida com mais de vinte caracteres.",
            skill="c3",
            difficulty=Difficulty.MEDIUM,
            targets=targets or [],
        )
        db.add(exercise)
        db.commit()
        db.refresh(exercise)
        return exercise.id
    finally:
        db.close()


def _learning_profile(client):
    return api_data(client.get("/api/v1/ai/learning-profile"))


def test_incorrect_answer_detects_targeted_issue(client):
    _reset_c3_low_issue()
    exercise_id = _seed_targeted_exercise(correct_answer="A", targets=["C3_LOW"])

    response = client.post(f"/api/v1/exercises/{exercise_id}/submit", json={"selected_answer": "B"})
    assert response.status_code == 200
    assert api_data(response)["is_correct"] is False

    profile = _learning_profile(client)
    assert profile["cognitive_issues"]["C3_LOW"]["state"] == "DETECTED"


def test_exercise_without_targets_does_not_touch_profile(client):
    exercise_id = _seed_targeted_exercise(correct_answer="A", targets=[])
    before = _learning_profile(client)["cognitive_issues"]

    client.post(f"/api/v1/exercises/{exercise_id}/submit", json={"selected_answer": "B"})

    after = _learning_profile(client)["cognitive_issues"]
    assert after == before


def test_single_correct_answer_does_not_create_issue_out_of_nothing(client):
    _reset_c3_low_issue()
    exercise_id = _seed_targeted_exercise(correct_answer="A", targets=["C3_LOW"])

    client.post(f"/api/v1/exercises/{exercise_id}/submit", json={"selected_answer": "A"})

    profile = _learning_profile(client)
    assert "C3_LOW" not in profile["cognitive_issues"]
