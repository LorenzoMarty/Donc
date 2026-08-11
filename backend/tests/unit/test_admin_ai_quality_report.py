"""P2b Bloco 4 (REQ-11) — AdminTelemetryService.ai_quality_report: gerados/aprovados/rejeitados/
editados por tipo de conteudo, sem estatistica inventada."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.models import AIGeneratedGame, AIInteractionLog, EssayTheme, User, UserRole
from src.services.admin_telemetry_service import AdminTelemetryService

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db, email="ai-quality-test@test.com") -> int:
    user = User(name="Admin", email=email, hashed_password=get_password_hash("12345678"), role=UserRole.ADMIN)
    db.add(user)
    db.flush()
    return user.id


def test_empty_state_returns_empty_report():
    db = _session()
    report = AdminTelemetryService(db).ai_quality_report()
    assert report == []


def test_counts_generated_approved_rejected_edited_games():
    db = _session()
    user_id = _make_user(db)
    now = datetime.now(UTC)

    approved = AIGeneratedGame(name="A", category="c", skill="s", difficulty="medium", questions=[], status="approved", targets=["C3_LOW"])
    rejected = AIGeneratedGame(name="B", category="c", skill="s", difficulty="medium", questions=[], status="rejected", targets=[])
    edited = AIGeneratedGame(
        name="C", category="c", skill="s", difficulty="medium", questions=[], status="approved", targets=["C3_LOW"],
        edited_after_generation=True,
    )
    db.add_all([approved, rejected, edited])
    db.flush()

    for game in (approved, rejected, edited):
        db.add(
            AIInteractionLog(
                user_id=user_id, workflow="admin_game_generation", agent="GameGeneratorAgent", status="success",
                content_id=game.id, content_type="AIGeneratedGame", created_at=now,
            )
        )
    db.commit()

    report = AdminTelemetryService(db).ai_quality_report()

    row = next(item for item in report if item.content_type == "AIGeneratedGame")
    assert row.generated == 3
    assert row.approved == 2
    assert row.rejected == 1
    assert row.edited == 1


def test_essay_theme_has_no_fake_approval_stats():
    db = _session()
    user_id = _make_user(db)
    theme = EssayTheme(title="Tema X que tem mais de oito caracteres", context="c" * 30, source="IA Donc", is_active=True)
    db.add(theme)
    db.flush()
    db.add(
        AIInteractionLog(
            user_id=user_id, workflow="admin_theme_generation", agent="ThemeGeneratorAgent", status="success",
            content_id=theme.id, content_type="EssayTheme",
        )
    )
    db.commit()

    report = AdminTelemetryService(db).ai_quality_report()

    row = next(item for item in report if item.content_type == "EssayTheme")
    assert row.generated == 1
    assert row.approved == 0
    assert row.rejected == 0
    assert row.edited == 0


def test_respects_period_days_window():
    db = _session()
    user_id = _make_user(db)
    game = AIGeneratedGame(name="Old", category="c", skill="s", difficulty="medium", questions=[], status="pending", targets=[])
    db.add(game)
    db.flush()
    db.add(
        AIInteractionLog(
            user_id=user_id, workflow="admin_game_generation", agent="GameGeneratorAgent", status="success",
            content_id=game.id, content_type="AIGeneratedGame",
            created_at=datetime.now(UTC) - timedelta(days=40),
        )
    )
    db.commit()

    report = AdminTelemetryService(db).ai_quality_report(period_days=30)

    assert report == []
