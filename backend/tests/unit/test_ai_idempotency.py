"""P2b Bloco 3 (REQ-8) — find_cached_generation: requisicao repetida com a mesma chave reaproveita
o resultado ja gravado em vez de disparar geracao de IA de novo."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.database.session import Base
from src.models import AIInteractionLog
from src.utils.ai_idempotency import find_cached_generation

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_returns_none_when_no_key_given():
    db = _session()
    assert find_cached_generation(db, user_id=1, workflow="admin_game_generation", idempotency_key=None) is None


def test_returns_none_when_key_never_used():
    db = _session()
    assert find_cached_generation(db, user_id=1, workflow="admin_game_generation", idempotency_key="unused") is None


def test_returns_matching_log_for_same_user_workflow_and_key():
    db = _session()
    db.add(
        AIInteractionLog(
            user_id=1, workflow="admin_game_generation", agent="X", status="success",
            idempotency_key="key-1", content_id=42, content_type="AIGeneratedGame",
        )
    )
    db.commit()

    found = find_cached_generation(db, user_id=1, workflow="admin_game_generation", idempotency_key="key-1")
    assert found is not None
    assert found.content_id == 42


def test_does_not_match_different_user_with_same_key():
    db = _session()
    db.add(AIInteractionLog(user_id=1, workflow="admin_game_generation", agent="X", status="success", idempotency_key="key-1"))
    db.commit()

    assert find_cached_generation(db, user_id=2, workflow="admin_game_generation", idempotency_key="key-1") is None


def test_does_not_match_different_workflow_with_same_key():
    db = _session()
    db.add(AIInteractionLog(user_id=1, workflow="admin_game_generation", agent="X", status="success", idempotency_key="key-1"))
    db.commit()

    assert find_cached_generation(db, user_id=1, workflow="admin_theme_generation", idempotency_key="key-1") is None


def test_does_not_match_a_failed_generation():
    db = _session()
    db.add(AIInteractionLog(user_id=1, workflow="admin_game_generation", agent="X", status="error", idempotency_key="key-1"))
    db.commit()

    assert find_cached_generation(db, user_id=1, workflow="admin_game_generation", idempotency_key="key-1") is None
