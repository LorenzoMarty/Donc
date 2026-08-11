"""P2c Bloco 2 (REQ-6) — ContentVersion: estrutura simples de historico de versoes."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.models import ContentVersion, User, UserRole
from src.services.content_versioning import list_versions, record_version

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db, email="version-test@test.com") -> int:
    user = User(name="Admin", email=email, hashed_password=get_password_hash("12345678"), role=UserRole.ADMIN)
    db.add(user)
    db.flush()
    return user.id


def test_record_version_persists_snapshot():
    db = _session()
    user_id = _make_user(db)
    record_version(
        db,
        content_type="AIGeneratedGame",
        content_id=1,
        snapshot={"name": "Nome antigo", "questions": []},
        edited_by=user_id,
        reason="edicao manual",
    )
    db.commit()

    row = db.query(ContentVersion).one()
    assert row.content_type == "AIGeneratedGame"
    assert row.content_id == 1
    assert row.snapshot == {"name": "Nome antigo", "questions": []}
    assert row.edited_by == user_id
    assert row.reason == "edicao manual"


def test_list_versions_orders_most_recent_first():
    db = _session()
    user_id = _make_user(db)
    record_version(db, content_type="EssayTheme", content_id=5, snapshot={"title": "v1"}, edited_by=user_id)
    db.commit()
    record_version(db, content_type="EssayTheme", content_id=5, snapshot={"title": "v2"}, edited_by=user_id)
    db.commit()

    versions = list_versions(db, content_type="EssayTheme", content_id=5)
    assert [v.snapshot["title"] for v in versions] == ["v2", "v1"]


def test_list_versions_scoped_by_content_type_and_id():
    db = _session()
    user_id = _make_user(db)
    record_version(db, content_type="EssayTheme", content_id=1, snapshot={"title": "theme"}, edited_by=user_id)
    record_version(db, content_type="AIGeneratedGame", content_id=1, snapshot={"name": "game"}, edited_by=user_id)
    db.commit()

    versions = list_versions(db, content_type="EssayTheme", content_id=1)
    assert len(versions) == 1
    assert versions[0].snapshot == {"title": "theme"}
