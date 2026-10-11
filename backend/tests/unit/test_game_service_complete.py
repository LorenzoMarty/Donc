"""GameService.complete: sinal positivo numa issue ainda nao detectada nao pode virar issue_update
com new_state=None (antes quebrava a rota com ValidationError, depois de a tentativa ja estar
commitada)."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.models import GameAttempt, User, UserRole
from src.routes.games import CognitiveOutcomeIn, GameCompleteRequest
from src.services.game_service import GameService

pytestmark = pytest.mark.unit


def _db_and_user():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    user = User(name="Aluno", email="svc-game@test.com", hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.commit()
    return db, user


def _payload(event: str) -> GameCompleteRequest:
    return GameCompleteRequest(
        game_id="fallacy-hunt",
        score=7,
        total=10,
        duration_seconds=90,
        cognitive_outcomes=[CognitiveOutcomeIn(hub="introducao-sem-tese", event=event, severity=0.6)],
    )


def test_positive_signal_on_untracked_issue_is_persisted_but_not_reported():
    db, user = _db_and_user()

    attempt, issue_updates = GameService(db).complete(user=user, payload=_payload("SHARP_THESIS"))

    assert issue_updates == []
    assert db.get(GameAttempt, attempt.id) is not None


def test_negative_signal_reports_detected_issue():
    db, user = _db_and_user()

    _, issue_updates = GameService(db).complete(user=user, payload=_payload("VAGUE_THESIS"))

    assert [(u["previous_state"], u["new_state"]) for u in issue_updates] == [(None, "DETECTED")]


def test_positive_signal_on_tracked_issue_is_reported_as_progress():
    db, user = _db_and_user()
    service = GameService(db)
    service.complete(user=user, payload=_payload("VAGUE_THESIS"))

    _, issue_updates = service.complete(user=user, payload=_payload("SHARP_THESIS"))

    assert [(u["previous_state"], u["new_state"]) for u in issue_updates] == [("DETECTED", "TRAINING")]
