"""Lembrete de streak em risco: quem recebe, uma vez por dia, opt-out por token assinado."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.models import PlanCycle, Subscription, SubscriptionStatus, User, UserRole
from src.services.reminder_service import ReminderService, unsubscribe_token, user_id_from_unsubscribe_token

pytestmark = pytest.mark.unit

# 19h em Sao Paulo (UTC-3) de 2026-10-20
NOW = datetime(2026, 10, 20, 22, 0, tzinfo=UTC)
YESTERDAY = NOW - timedelta(days=1)


def _db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _student(db, email, *, streak=5, last_activity=YESTERDAY, subscribed=True, **extra):
    user = User(
        name=email.split("@")[0], email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT,
        streak_days=streak, last_activity_at=last_activity, **extra,
    )
    db.add(user)
    db.flush()
    if subscribed:
        db.add(
            Subscription(
                user_id=user.id, cycle=PlanCycle.MONTHLY, status=SubscriptionStatus.ACTIVE, price_charged_cents=5900,
                current_period_end=NOW + timedelta(days=10),
            )
        )
    db.commit()
    return user


def test_only_students_with_a_streak_at_risk_are_due():
    db = _db()
    at_risk = _student(db, "risco@t.com")
    _student(db, "hoje@t.com", last_activity=NOW - timedelta(hours=2))  # ja estudou hoje
    _student(db, "antigo@t.com", last_activity=NOW - timedelta(days=3))  # sequencia ja quebrou
    _student(db, "curta@t.com", streak=1)  # nada a perder ainda
    _student(db, "saiu@t.com", reminders_opt_out=True)
    _student(db, "semplano@t.com", subscribed=False)
    admin = _student(db, "admin@t.com", subscribed=False)
    admin.role = UserRole.ADMIN
    db.commit()

    assert [user.email for user in ReminderService(db).due_users(NOW)] == [at_risk.email]


def test_send_due_emails_once_per_day(monkeypatch):
    db = _db()
    user = _student(db, "risco@t.com", streak=7)
    sent: list[dict] = []
    monkeypatch.setattr("src.services.email_service.send_streak_reminder", lambda **kw: sent.append(kw) or True)

    assert ReminderService(db).send_due(NOW) == 1
    assert ReminderService(db).send_due(NOW) == 0  # mesmo dia: nao repete
    assert len(sent) == 1
    assert sent[0]["to"] == "risco@t.com" and sent[0]["streak_days"] == 7
    assert user_id_from_unsubscribe_token(sent[0]["unsubscribe_token"]) == user.id

    # no dia seguinte, quem voltou a falhar em estudar recebe de novo
    db.refresh(user)
    user.last_activity_at = NOW
    db.commit()
    assert ReminderService(db).send_due(NOW + timedelta(days=1)) == 1


def test_one_failing_email_does_not_block_the_rest(monkeypatch):
    db = _db()
    _student(db, "a@t.com")
    _student(db, "b@t.com")

    def flaky(**kw):
        if kw["to"] == "a@t.com":
            raise RuntimeError("smtp down")
        return True

    monkeypatch.setattr("src.services.email_service.send_streak_reminder", flaky)
    assert ReminderService(db).send_due(NOW) == 1


def test_unsubscribe_token_is_signed_and_opt_out_sticks():
    db = _db()
    user = _student(db, "risco@t.com")
    token = unsubscribe_token(user.id)

    assert user_id_from_unsubscribe_token(token) == user.id
    assert user_id_from_unsubscribe_token(f"{user.id}.{'0' * 32}") is None
    assert user_id_from_unsubscribe_token("abc") is None
    assert user_id_from_unsubscribe_token(f"{user.id + 1}.{token.partition('.')[2]}") is None  # assinatura de outro usuario

    assert ReminderService(db).opt_out(user.id) is True
    assert ReminderService(db).due_users(NOW) == []
    assert ReminderService(db).opt_out(999) is False
