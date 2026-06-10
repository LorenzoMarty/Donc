"""Telemetria de IA é não-crítica: uma falha de INSERT não pode quebrar a transação do caller."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.database.session import Base
from src.models import AIInteractionLog
from src.services.ai_telemetry import safe_persist_interaction

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_failed_telemetry_does_not_break_caller_transaction() -> None:
    db = _session()
    # Linha do caller (ex.: tema/correção) pendente na mesma sessão.
    caller_row = AIInteractionLog(workflow="op_do_usuario", agent="Caller", status="success")
    db.add(caller_row)

    # Log de telemetria inválido (workflow NOT NULL) → flush falha dentro do SAVEPOINT.
    bad_log = AIInteractionLog(workflow=None, agent="Bad", status="success")  # type: ignore[arg-type]
    safe_persist_interaction(db, bad_log)

    # A transação do caller sobrevive e commita.
    db.commit()

    rows = db.query(AIInteractionLog).all()
    assert len(rows) == 1
    assert rows[0].agent == "Caller"


def test_valid_telemetry_persists() -> None:
    db = _session()
    log = AIInteractionLog(workflow="essay_correction", agent="ThesisAgent", status="success", cost_micro_usd=1234)
    safe_persist_interaction(db, log, commit=True)

    rows = db.query(AIInteractionLog).all()
    assert len(rows) == 1
    assert rows[0].cost_micro_usd == 1234
