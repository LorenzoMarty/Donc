"""Cota mensal de correcoes de redacao: limite, falha nao conta e virada de mes."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.config.settings import settings
from src.database.session import Base
from src.middlewares.errors import AppError
from src.models import AIJob, User, UserRole
from src.utils.essay_quota import check_essay_monthly_quota, essay_corrections_this_month, month_bounds_utc

pytestmark = pytest.mark.unit

NOW = datetime(2026, 3, 15, 12, tzinfo=UTC)


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _user(db, role=UserRole.STUDENT) -> User:
    user = User(name="Aluno", email=f"q-{role.value}@test.com", hashed_password=get_password_hash("12345678"), role=role)
    db.add(user)
    db.flush()
    return user


def _job(db, user, *, created_at, status="completed", kind="essay_correction", n=[0]):
    n[0] += 1
    db.add(AIJob(id=f"job-{n[0]}", user_id=user.id, kind=kind, status=status, created_at=created_at))
    db.flush()


def test_no_limit_by_default(monkeypatch):
    monkeypatch.setattr(settings, "essay_monthly_quota", 0)
    db = _session()
    user = _user(db)
    for _ in range(5):
        _job(db, user, created_at=NOW)
    check_essay_monthly_quota(db, user, NOW)


def test_blocks_at_limit_but_failed_and_other_kinds_do_not_count(monkeypatch):
    monkeypatch.setattr(settings, "essay_monthly_quota", 2)
    db = _session()
    user = _user(db)
    _job(db, user, created_at=NOW)
    _job(db, user, created_at=NOW, status="failed")
    _job(db, user, created_at=NOW, kind="other")
    check_essay_monthly_quota(db, user, NOW)  # 1 de 2
    _job(db, user, created_at=NOW, status="queued")
    with pytest.raises(AppError) as exc:
        check_essay_monthly_quota(db, user, NOW)
    assert exc.value.code == "quota_exceeded"
    assert exc.value.status_code == 429


def test_month_rollover_resets_count(monkeypatch):
    monkeypatch.setattr(settings, "essay_monthly_quota", 1)
    db = _session()
    user = _user(db)
    _job(db, user, created_at=datetime(2026, 2, 28, 23, 59, tzinfo=UTC))
    assert essay_corrections_this_month(db, user.id, NOW) == 0
    check_essay_monthly_quota(db, user, NOW)
    assert month_bounds_utc(datetime(2026, 12, 31, tzinfo=UTC))[1] == datetime(2027, 1, 1, tzinfo=UTC)


def test_admin_is_exempt(monkeypatch):
    monkeypatch.setattr(settings, "essay_monthly_quota", 1)
    db = _session()
    admin = _user(db, UserRole.ADMIN)
    _job(db, admin, created_at=NOW)
    _job(db, admin, created_at=NOW)
    check_essay_monthly_quota(db, admin, NOW)
