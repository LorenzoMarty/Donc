"""P2c Bloco 4 (REQ-14) — AdminAdaptiveHealthService: saude do sistema adaptativo, com listas
concretas e acionaveis (nao so contagem agregada)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.models import Exercise, Lesson, Module, RecommendationLog, StudentLearningProfile, User, UserRole
from src.services.admin_adaptive_health_service import AdminAdaptiveHealthService

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_student(db, email) -> User:
    user = User(name="Aluno", email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user


def test_student_without_any_profile_is_listed_as_without_diagnosis():
    db = _session()
    student = _make_student(db, "no-profile@test.com")
    db.commit()

    report = AdminAdaptiveHealthService(db).report()

    assert any(item["user_id"] == student.id for item in report.students_without_diagnosis)


def test_student_with_empty_cognitive_issues_is_listed_as_without_diagnosis():
    db = _session()
    student = _make_student(db, "empty-issues@test.com")
    db.add(StudentLearningProfile(user_id=student.id, cognitive_issues={}))
    db.commit()

    report = AdminAdaptiveHealthService(db).report()

    assert any(item["user_id"] == student.id for item in report.students_without_diagnosis)


def test_student_with_cognitive_issues_is_not_listed_as_without_diagnosis():
    db = _session()
    student = _make_student(db, "has-issues@test.com")
    db.add(
        StudentLearningProfile(
            user_id=student.id, cognitive_issues={"C3_LOW": {"state": "DETECTED", "negative_count": 1, "positive_streak": 0}}
        )
    )
    db.commit()

    report = AdminAdaptiveHealthService(db).report()

    assert all(item["user_id"] != student.id for item in report.students_without_diagnosis)


def test_student_with_issues_but_no_recommendation_log_is_listed():
    db = _session()
    student = _make_student(db, "no-rec-log@test.com")
    db.add(
        StudentLearningProfile(
            user_id=student.id, cognitive_issues={"C3_LOW": {"state": "DETECTED", "negative_count": 1, "positive_streak": 0}}
        )
    )
    db.commit()

    report = AdminAdaptiveHealthService(db).report()

    assert any(item["user_id"] == student.id for item in report.students_without_recommendation)


def test_student_with_recommendation_log_is_not_listed():
    db = _session()
    student = _make_student(db, "has-rec-log@test.com")
    db.add(
        StudentLearningProfile(
            user_id=student.id, cognitive_issues={"C3_LOW": {"state": "DETECTED", "negative_count": 1, "positive_streak": 0}}
        )
    )
    db.add(RecommendationLog(user_id=student.id, action_type="GAME", target_issue="C3_LOW", target_hub="perde-na-c3"))
    db.commit()

    report = AdminAdaptiveHealthService(db).report()

    assert all(item["user_id"] != student.id for item in report.students_without_recommendation)


def test_recommendation_without_content_target_is_listed():
    db = _session()
    student = _make_student(db, "essay-fallback@test.com")
    db.add(RecommendationLog(user_id=student.id, action_type="ESSAY", target_issue=None))
    db.commit()

    report = AdminAdaptiveHealthService(db).report()

    assert len(report.recommendations_without_content) == 1


def test_issue_with_no_content_targeting_it_is_listed():
    db = _session()
    module = Module(title="Mod", slug="mod", description="d" * 15, order=1)
    db.add(module)
    db.flush()
    # Nenhuma Lesson/Exercise/AIGeneratedGame com targets=["WEAK_THESIS"] — deve aparecer.
    db.commit()

    report = AdminAdaptiveHealthService(db).report()

    assert "WEAK_THESIS" in report.issues_without_content


def test_issue_with_exercise_targeting_it_is_not_listed():
    db = _session()
    module = Module(title="Mod2", slug="mod2", description="d" * 15, order=1)
    db.add(module)
    db.flush()
    db.add(
        Exercise(
            module_id=module.id,
            statement="s" * 25,
            options=["A", "B", "C", "D", "E"],
            correct_answer="A",
            explanation="e" * 25,
            skill="c3",
            targets=["WEAK_THESIS"],
        )
    )
    db.commit()

    report = AdminAdaptiveHealthService(db).report()

    assert "WEAK_THESIS" not in report.issues_without_content


def test_stale_issue_not_updated_in_a_long_time_is_listed():
    db = _session()
    student = _make_student(db, "stale-issue@test.com")
    old = (datetime.now(UTC) - timedelta(days=90)).isoformat()
    db.add(
        StudentLearningProfile(
            user_id=student.id,
            cognitive_issues={"C3_LOW": {"state": "TRAINING", "negative_count": 2, "positive_streak": 0, "updated_at": old}},
        )
    )
    db.commit()

    report = AdminAdaptiveHealthService(db).report()

    assert any(item["user_id"] == student.id and item["code"] == "C3_LOW" for item in report.issues_without_progress)


def test_recently_updated_issue_is_not_listed_as_stale():
    db = _session()
    student = _make_student(db, "fresh-issue@test.com")
    recent = datetime.now(UTC).isoformat()
    db.add(
        StudentLearningProfile(
            user_id=student.id,
            cognitive_issues={"C3_LOW": {"state": "TRAINING", "negative_count": 2, "positive_streak": 0, "updated_at": recent}},
        )
    )
    db.commit()

    report = AdminAdaptiveHealthService(db).report()

    assert all(not (item["user_id"] == student.id and item["code"] == "C3_LOW") for item in report.issues_without_progress)


def test_mastered_issue_is_not_listed_as_stale_even_if_old():
    db = _session()
    student = _make_student(db, "mastered-issue@test.com")
    old = (datetime.now(UTC) - timedelta(days=90)).isoformat()
    db.add(
        StudentLearningProfile(
            user_id=student.id,
            cognitive_issues={"C3_LOW": {"state": "MASTERED", "negative_count": 0, "positive_streak": 3, "updated_at": old}},
        )
    )
    db.commit()

    report = AdminAdaptiveHealthService(db).report()

    assert all(not (item["user_id"] == student.id and item["code"] == "C3_LOW") for item in report.issues_without_progress)
