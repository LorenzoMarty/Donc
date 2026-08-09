"""REQ-11: POST /games/complete inclui issue_updates na resposta.

O usuario demo (aluno@demo.com) e compartilhado por toda a suite — outros testes podem ja ter
tocado WEAK_THESIS antes destes rodarem. Cada teste reseta cognitive_issues no banco antes de
agir, em vez de assumir estado zerado por sorte de ordem de execucao.
"""

from sqlalchemy import select

from src.database.session import SessionLocal
from src.models import StudentLearningProfile, User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def _reset_weak_thesis_issue() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        profile = db.scalar(select(StudentLearningProfile).where(StudentLearningProfile.user_id == user.id))
        if profile:
            issues = dict(profile.cognitive_issues)
            issues.pop("WEAK_THESIS", None)
            profile.cognitive_issues = issues
            db.commit()
    finally:
        db.close()


def test_response_includes_issue_updates_for_touched_issue(client):
    _reset_weak_thesis_issue()
    response = client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "issue-updates-drill",
            "score": 3,
            "total": 10,
            "duration_seconds": 60,
            "cognitive_outcomes": [{"hub": "introducao-sem-tese", "event": "VAGUE_THESIS", "severity": 0.7}],
        },
    )
    assert response.status_code == 200
    data = api_data(response)
    assert data["issue_updates"] == [{"code": "WEAK_THESIS", "previous_state": None, "new_state": "DETECTED"}]


def test_response_has_empty_issue_updates_when_no_outcomes(client):
    response = client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "issue-updates-no-outcome",
            "score": 5,
            "total": 10,
            "duration_seconds": 30,
            "cognitive_outcomes": [],
        },
    )
    assert response.status_code == 200
    assert api_data(response)["issue_updates"] == []


def test_issue_transitions_from_detected_to_training_on_second_call(client):
    _reset_weak_thesis_issue()
    payload_negative = {
        "game_id": "issue-updates-progression",
        "score": 3,
        "total": 10,
        "duration_seconds": 60,
        "cognitive_outcomes": [{"hub": "introducao-sem-tese", "event": "VAGUE_THESIS", "severity": 0.7}],
    }
    first = api_data(client.post("/api/v1/games/complete", json=payload_negative))
    assert first["issue_updates"][0]["new_state"] == "DETECTED"

    payload_positive = dict(payload_negative)
    payload_positive["cognitive_outcomes"] = [{"hub": "introducao-sem-tese", "event": "SHARP_THESIS", "severity": 0.6}]
    second = api_data(client.post("/api/v1/games/complete", json=payload_positive))
    assert second["issue_updates"] == [{"code": "WEAK_THESIS", "previous_state": "DETECTED", "new_state": "TRAINING"}]
