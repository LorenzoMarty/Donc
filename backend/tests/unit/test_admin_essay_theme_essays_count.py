"""AdminContentService.list_essay_themes anexa essays_count — dado que a fila de admin usa pra
avisar quantas redações dependem de um tema antes de excluir (achado #6.1 da auditoria de UX)."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.database.session import Base
from src.models import Essay, EssayTheme, User, UserRole
from src.config.security import get_password_hash
from src.services.admin_content_service import AdminContentService

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_list_essay_themes_reports_correct_essays_count_per_theme():
    db = _session()
    user = User(name="Aluno", email="aluno@teste.com", hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    theme_with_essays = EssayTheme(title="Tema com redacoes", context="Contexto suficientemente longo para o teste.")
    theme_without_essays = EssayTheme(title="Tema sem redacoes", context="Contexto suficientemente longo para o teste.")
    db.add_all([user, theme_with_essays, theme_without_essays])
    db.flush()
    db.add_all(
        [
            Essay(user_id=user.id, theme_id=theme_with_essays.id, title="R1", content="c"),
            Essay(user_id=user.id, theme_id=theme_with_essays.id, title="R2", content="c"),
        ]
    )
    db.commit()

    themes = AdminContentService(db).list_essay_themes()

    counts = {theme.id: theme.essays_count for theme in themes}
    assert counts[theme_with_essays.id] == 2
    assert counts[theme_without_essays.id] == 0
