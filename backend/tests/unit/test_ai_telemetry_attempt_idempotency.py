"""P2b Bloco 3 (REQ-7/REQ-8) — attempt e idempotency_key em AIInteractionLog."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.database.session import Base
from src.models import AIInteractionLog
from src.services.ai_telemetry import build_interaction_log, record_ai_interaction

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_attempt_defaults_to_one():
    log = build_interaction_log(workflow="essay_correction", agent="ThesisAgent", user_id=1)
    assert log.attempt == 1


def test_attempt_can_be_set_explicitly():
    log = build_interaction_log(workflow="essay_correction", agent="ThesisAgent", user_id=1, attempt=3)
    assert log.attempt == 3


def test_idempotency_key_defaults_to_none():
    log = build_interaction_log(workflow="admin_game_generation", agent="GameGeneratorAgent", user_id=1)
    assert log.idempotency_key is None


def test_idempotency_key_persists():
    db = _session()
    record_ai_interaction(
        db,
        workflow="admin_game_generation",
        agent="GameGeneratorAgent",
        user_id=1,
        idempotency_key="client-key-abc",
        commit=True,
    )
    row = db.query(AIInteractionLog).one()
    assert row.idempotency_key == "client-key-abc"
