"""LGPD: exportação dos dados do titular e exclusão/anonimização da conta."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash, verify_password
from src.database.session import Base
from src.middlewares.errors import AppError
from src.models import (
    AIInteractionLog,
    AIJob,
    Essay,
    EssayTheme,
    Goal,
    PlanCycle,
    RefreshToken,
    Subscription,
    SubscriptionStatus,
    User,
    UserRole,
)
from src.services.account_data_service import AccountDataService

pytestmark = pytest.mark.unit


def _setup():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    user = User(name="Maria Silva", email="maria@test.com", hashed_password=get_password_hash("senha1234"), role=UserRole.STUDENT)
    other = User(name="Outro", email="outro@test.com", hashed_password=get_password_hash("senha1234"), role=UserRole.STUDENT)
    theme = EssayTheme(title="Tema", context="c", source="s", is_active=True)
    db.add_all([user, other, theme])
    db.flush()
    db.add_all(
        [
            Essay(user_id=user.id, theme_id=theme.id, title="Minha redação", content="texto da Maria"),
            Essay(user_id=other.id, theme_id=theme.id, title="De outro", content="texto do outro"),
            Goal(user_id=user.id, title="Meta", target=3, unit="redacoes"),
            AIJob(id="job-1", user_id=user.id, kind="essay_correction", status="completed", request_payload={"content": "texto da Maria"}),
            AIInteractionLog(user_id=user.id, workflow="essay_correction", agent="A", status="success", cost_micro_usd=500),
            RefreshToken(user_id=user.id, token_hash="h" * 64, expires_at=datetime.now(UTC) + timedelta(days=1)),
            Subscription(
                user_id=user.id, cycle=PlanCycle.MONTHLY, status=SubscriptionStatus.ACTIVE,
                mp_preapproval_id="mp-123", price_charged_cents=5900, current_period_end=datetime.now(UTC) + timedelta(days=20),
            ),
        ]
    )
    db.commit()
    return db, user, other


def test_export_has_only_own_data_and_no_secrets():
    db, user, _ = _setup()
    data = AccountDataService(db).export(user)

    assert data["account"]["email"] == "maria@test.com"
    assert "hashed_password" not in data["account"]
    assert [e["content"] for e in data["essays"]] == ["texto da Maria"]
    assert data["essays"][0]["theme"] == "Tema"
    assert len(data["goals"]) == 1
    assert "mp_preapproval_id" not in data["subscription"][0]
    assert "texto do outro" not in str(data)


def test_delete_requires_correct_password():
    db, user, _ = _setup()
    with pytest.raises(AppError) as exc:
        AccountDataService(db).delete_account(user, password="errada")
    assert exc.value.code == "invalid_current_password"
    assert user.deleted_at is None


def test_delete_anonymizes_user_removes_content_and_cancels_subscription(monkeypatch):
    db, user, other = _setup()
    monkeypatch.setattr("src.services.subscription_service.SubscriptionService.cancel", lambda self, u: None)
    version_before = user.session_version

    AccountDataService(db).delete_account(user, password="senha1234")

    db.refresh(user)
    assert user.deleted_at is not None
    assert user.email == f"deleted-{user.id}@deleted.invalid"
    assert user.name == "Conta excluída"
    assert not verify_password("senha1234", user.hashed_password)
    assert user.session_version == version_before + 1

    assert db.scalars(select(Essay).where(Essay.user_id == user.id)).all() == []
    assert db.scalars(select(Goal).where(Goal.user_id == user.id)).all() == []
    assert db.scalars(select(AIJob).where(AIJob.user_id == user.id)).all() == []
    assert db.scalars(select(RefreshToken).where(RefreshToken.user_id == user.id)).all() == []
    # custo de IA fica, desvinculado do titular
    log = db.scalar(select(AIInteractionLog))
    assert log.user_id is None and log.cost_micro_usd == 500
    # cobrança fica (obrigação fiscal), mas sem acesso
    subscription = db.scalar(select(Subscription).where(Subscription.user_id == user.id))
    assert subscription.status == SubscriptionStatus.CANCELED
    # dados de outro aluno intactos
    assert len(db.scalars(select(Essay).where(Essay.user_id == other.id)).all()) == 1
