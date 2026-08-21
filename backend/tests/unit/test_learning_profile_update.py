"""Testes de update_learning_profile — integracao da correcao de redacao com CognitiveIssue."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.agents.schemas import EssayCorrectionResult
from src.config.security import get_password_hash
from src.database.session import Base
from sqlalchemy import select

from src.memory.profile import get_or_create_learning_profile, update_learning_profile
from src.models import LearningOutcome, User, UserRole

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db) -> int:
    user = User(name="Aluno Teste", email="aluno-profile-test@test.com", hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user.id


def _correction(**overrides) -> EssayCorrectionResult:
    base = dict(
        total_score=800,
        competency_1=160,
        competency_2=160,
        competency_3=160,
        competency_4=160,
        competency_5=160,
        strengths=["Boa argumentacao"],
        errors=["Nenhum erro grave"],
        suggestions=["Continue assim"],
        feedback="Redacao consistente, mantenha o padrao de organizacao textual demonstrado aqui.",
        recurrent_patterns=[],
    )
    base.update(overrides)
    return EssayCorrectionResult(**base)


def test_update_records_latest_competencies_and_trend():
    db = _session()
    user_id = _make_user(db)
    update_learning_profile(db, user_id=user_id, essay_id=1, correction=_correction(total_score=750, competency_1=140))
    db.commit()
    profile = get_or_create_learning_profile(db, user_id)
    assert profile.latest_competencies["c1"] == 140
    assert profile.score_trend[-1] == 750


def test_low_c3_detects_c3_low_issue():
    db = _session()
    user_id = _make_user(db)
    update_learning_profile(db, user_id=user_id, essay_id=1, correction=_correction(competency_3=120))
    db.commit()
    profile = get_or_create_learning_profile(db, user_id)
    assert profile.cognitive_issues["C3_LOW"]["state"] == "DETECTED"


def test_low_c2_detects_weak_thesis_issue():
    db = _session()
    user_id = _make_user(db)
    update_learning_profile(db, user_id=user_id, essay_id=1, correction=_correction(competency_2=100))
    db.commit()
    profile = get_or_create_learning_profile(db, user_id)
    assert profile.cognitive_issues["WEAK_THESIS"]["state"] == "DETECTED"


def test_low_c5_detects_formulaic_conclusion_issue():
    db = _session()
    user_id = _make_user(db)
    update_learning_profile(db, user_id=user_id, essay_id=1, correction=_correction(competency_5=80))
    db.commit()
    profile = get_or_create_learning_profile(db, user_id)
    assert profile.cognitive_issues["FORMULAIC_CONCLUSION"]["state"] == "DETECTED"


def test_healthy_scores_do_not_create_issues():
    db = _session()
    user_id = _make_user(db)
    update_learning_profile(db, user_id=user_id, essay_id=1, correction=_correction())
    db.commit()
    profile = get_or_create_learning_profile(db, user_id)
    assert profile.cognitive_issues == {}


def test_three_consecutive_low_c3_detects_shallow_argumentation():
    db = _session()
    user_id = _make_user(db)
    for _ in range(3):
        update_learning_profile(db, user_id=user_id, essay_id=1, correction=_correction(competency_3=100))
        db.commit()
    profile = get_or_create_learning_profile(db, user_id)
    assert profile.cognitive_issues["SHALLOW_ARGUMENTATION"]["state"] == "DETECTED"


def test_one_low_c3_does_not_yet_detect_shallow_argumentation():
    db = _session()
    user_id = _make_user(db)
    update_learning_profile(db, user_id=user_id, essay_id=1, correction=_correction(competency_3=100))
    db.commit()
    profile = get_or_create_learning_profile(db, user_id)
    assert "SHALLOW_ARGUMENTATION" not in profile.cognitive_issues


def test_low_c3_records_essay_learning_outcome_with_weight_two():
    db = _session()
    user_id = _make_user(db)
    update_learning_profile(db, user_id=user_id, essay_id=42, correction=_correction(competency_3=100))
    db.commit()
    row = db.scalars(
        select(LearningOutcome).where(LearningOutcome.user_id == user_id, LearningOutcome.cognitive_issue_code == "C3_LOW")
    ).one()
    assert row.source == "ESSAY"
    assert row.essay_id == 42
    assert row.direction == "negative"
    assert row.weight == 2
