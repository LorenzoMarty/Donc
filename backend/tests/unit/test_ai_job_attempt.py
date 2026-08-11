"""P2b Bloco 3 (REQ-7) — AIJob grava o numero da tentativa (quantas vezes essa redacao ja foi
submetida/reprocessada)."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.models import User, UserRole
from src.queues.jobs import AIJobService

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db, email="job-attempt-test@test.com") -> int:
    user = User(name="Aluno", email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user.id


def test_first_job_for_an_essay_is_attempt_one():
    db = _session()
    user_id = _make_user(db)
    jobs = AIJobService(db)
    attempt = jobs.next_attempt_number(user_id=user_id, kind="essay_correction", essay_id=42)
    assert attempt == 1


def test_second_job_for_the_same_essay_is_attempt_two():
    db = _session()
    user_id = _make_user(db)
    jobs = AIJobService(db)
    jobs.create(user_id=user_id, kind="essay_correction", request_payload={"essay_id": 42}, attempt=1)

    attempt = jobs.next_attempt_number(user_id=user_id, kind="essay_correction", essay_id=42)
    assert attempt == 2


def test_attempt_counting_is_scoped_per_essay():
    db = _session()
    user_id = _make_user(db)
    jobs = AIJobService(db)
    jobs.create(user_id=user_id, kind="essay_correction", request_payload={"essay_id": 42}, attempt=1)

    attempt = jobs.next_attempt_number(user_id=user_id, kind="essay_correction", essay_id=999)
    assert attempt == 1
