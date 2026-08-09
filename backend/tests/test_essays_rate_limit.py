"""Confirma que /essays/{id}/submit e /reprocess passam pelo mesmo limitador central de /ai/*
(REQ-28..30: nao existe bypass do rate limit de IA usando a rota de essays)."""

from __future__ import annotations

import pytest
from sqlalchemy import select

from src.database.session import SessionLocal
from src.models import Essay, EssayTheme, User
from src.utils import rate_limit

ESSAY_CONTENT = (
    "A desigualdade no acesso a saneamento basico ainda atinge milhoes de brasileiros e compromete "
    "a saude publica em regioes vulneraveis. O poder publico, historicamente, concentrou investimentos "
    "em centros urbanos, deixando areas rurais e periferias a margem de politicas essenciais.\n\n"
    "Nesse cenario, cabe ao Estado ampliar recursos do orcamento federal para saneamento, em parceria "
    "com municipios, alem de fiscalizar a execucao das obras por meio de auditorias independentes, "
    "garantindo transparencia e continuidade dos projetos ao longo de diferentes gestoes.\n\n"
    "Somente com planejamento de longo prazo e participacao social sera possivel reduzir as "
    "desigualdades regionais e assegurar dignidade basica a toda populacao brasileira."
)


def _create_theme_and_essay(*, title: str) -> int:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        theme = EssayTheme(title=title, context="Contexto de teste.", source="Teste", is_active=True)
        db.add(theme)
        db.flush()
        essay = Essay(
            user_id=user.id,
            theme_id=theme.id,
            title=title,
            content=ESSAY_CONTENT,
            word_count=200,
            line_count=6,
            paragraph_count=3,
        )
        db.add(essay)
        db.commit()
        return essay.id
    finally:
        db.close()


@pytest.fixture()
def _low_rate_limit(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(rate_limit.settings, "ai_rate_limit_per_minute", 1)
    monkeypatch.setattr(rate_limit, "_increment_redis", lambda key: None)
    rate_limit._memory_counters.clear()
    yield
    rate_limit._memory_counters.clear()


@pytest.fixture()
def _force_synchronous_celery(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("src.routes.essays.enqueue_correct_essay", lambda _job_id: False)


def test_submit_is_blocked_after_rate_limit_exhausted(client, _low_rate_limit, _force_synchronous_celery):
    essay_id = _create_theme_and_essay(title="Tema rate limit submit")

    first = client.post(f"/api/v1/essays/{essay_id}/submit")
    assert first.status_code == 200

    other_essay_id = _create_theme_and_essay(title="Tema rate limit submit 2")
    second = client.post(f"/api/v1/essays/{other_essay_id}/submit")
    assert second.status_code == 429
    assert second.json()["error"] == "rate_limited"


def test_reprocess_is_covered_by_the_same_limit(client, _low_rate_limit, _force_synchronous_celery):
    essay_id = _create_theme_and_essay(title="Tema rate limit reprocess")

    # A primeira chamada de IA do teste ja consome a unica cota liberada.
    first = client.post(f"/api/v1/essays/{essay_id}/submit")
    assert first.status_code == 200

    new_version = client.post(f"/api/v1/essays/{essay_id}/new-version")
    assert new_version.status_code == 200
    autosave = client.put(
        f"/api/v1/essays/{essay_id}/autosave",
        json={"title": "Tema rate limit reprocess", "content": ESSAY_CONTENT + "\n\nEdicao extra."},
    )
    assert autosave.status_code == 200

    reprocess = client.post(f"/api/v1/essays/{essay_id}/reprocess")
    assert reprocess.status_code == 429
    assert reprocess.json()["error"] == "rate_limited"
