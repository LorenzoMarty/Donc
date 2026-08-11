"""P2b Bloco 1 (REQ-1/REQ-2) — AIInteractionLog linka content_id/content_type do que gerou."""

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


def test_build_interaction_log_accepts_content_id_and_type():
    log = build_interaction_log(
        workflow="admin_game_generation",
        agent="GameGeneratorAgent",
        user_id=1,
        content_id=42,
        content_type="AIGeneratedGame",
    )
    assert log.content_id == 42
    assert log.content_type == "AIGeneratedGame"


def test_build_interaction_log_content_fields_default_none():
    log = build_interaction_log(workflow="essay_correction", agent="ThesisAgent", user_id=1)
    assert log.content_id is None
    assert log.content_type is None


def test_build_interaction_log_accepts_template_version():
    log = build_interaction_log(
        workflow="admin_game_generation", agent="GameGeneratorAgent", user_id=1, template_version="v3"
    )
    assert log.template_version == "v3"


def test_record_ai_interaction_persists_content_link():
    db = _session()
    record_ai_interaction(
        db,
        workflow="admin_game_generation",
        agent="GameGeneratorAgent",
        user_id=1,
        content_id=7,
        content_type="AIGeneratedGame",
        commit=True,
    )
    row = db.query(AIInteractionLog).one()
    assert row.content_id == 7
    assert row.content_type == "AIGeneratedGame"
