"""Regressao de N+1 no AdminUserService: listagem e lookup de usuario unico nao podem
mais disparar uma query por usuario (essays=len(user.essays)) nem recalcular a lista
inteira so para achar um registro."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.models import Essay, EssayTheme, User, UserRole
from src.services.admin_user_service import AdminUserService

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db, *, name: str, email: str) -> User:
    user = User(name=name, email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user


def _make_essay(db, *, user: User, theme: EssayTheme) -> Essay:
    essay = Essay(user_id=user.id, theme_id=theme.id, title="Redacao", content="conteudo", word_count=100)
    db.add(essay)
    return essay


def _count_queries(db, fn):
    counter = {"count": 0}

    def _on_execute(*_args, **_kwargs):
        counter["count"] += 1

    event.listen(db.bind, "before_cursor_execute", _on_execute)
    try:
        result = fn()
    finally:
        event.remove(db.bind, "before_cursor_execute", _on_execute)
    return result, counter["count"]


def test_users_list_reports_correct_essay_count_per_user():
    db = _session()
    theme = EssayTheme(title="Tema", context="Contexto")
    db.add(theme)
    db.flush()

    with_essays = _make_user(db, name="Com redacoes", email="com@teste.com")
    without_essays = _make_user(db, name="Sem redacoes", email="sem@teste.com")
    _make_essay(db, user=with_essays, theme=theme)
    _make_essay(db, user=with_essays, theme=theme)
    db.commit()

    result = AdminUserService(db).users_list()
    by_id = {row.id: row for row in result.items}
    assert by_id[with_essays.id].essays == 2
    assert by_id[without_essays.id].essays == 0


def test_users_list_query_count_does_not_grow_with_essay_count():
    db = _session()
    theme = EssayTheme(title="Tema", context="Contexto")
    db.add(theme)
    db.flush()

    users = [_make_user(db, name=f"Aluno {i}", email=f"aluno{i}@teste.com") for i in range(5)]
    for user in users:
        for _ in range(4):
            _make_essay(db, user=user, theme=theme)
    db.commit()

    service = AdminUserService(db)
    _, query_count = _count_queries(db, service.users_list)

    # Contagem total (paginacao) + lista de usuarios + 3 agregacoes (essays, tokens, events) —
    # nao uma query por usuario.
    assert query_count <= 6


def test_update_student_does_not_recompute_full_user_list():
    db = _session()
    theme = EssayTheme(title="Tema", context="Contexto")
    db.add(theme)
    db.flush()

    target = _make_user(db, name="Alvo", email="alvo@teste.com")
    others = [_make_user(db, name=f"Outro {i}", email=f"outro{i}@teste.com") for i in range(20)]
    for other in others:
        _make_essay(db, user=other, theme=theme)
    db.commit()

    service = AdminUserService(db)
    _, query_count = _count_queries(db, lambda: service.update_student(user_id=target.id, streak_days=3))

    # Sem N+1: nao deve escalar com o numero de outros usuarios no banco.
    assert query_count <= 6


def test_user_detail_reports_correct_essay_count_for_single_user():
    db = _session()
    theme = EssayTheme(title="Tema", context="Contexto")
    db.add(theme)
    db.flush()

    target = _make_user(db, name="Alvo", email="alvo2@teste.com")
    _make_essay(db, user=target, theme=theme)
    other = _make_user(db, name="Outro", email="outro2@teste.com")
    _make_essay(db, user=other, theme=theme)
    _make_essay(db, user=other, theme=theme)
    db.commit()

    detail = AdminUserService(db).user_detail(target.id)
    assert detail.user.essays == 1
