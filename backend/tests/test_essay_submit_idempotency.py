"""P2b Bloco 3 (REQ-9) — idempotency key no submit de redacao cobre tambem o fallback sincrono
(get_active_for_essay() sozinho so protege enquanto o job anterior ainda esta queued/running —
apos o fallback sincrono completar, o job ja nao esta mais ativo, entao um segundo submit com a
mesma chave nao pode disparar outra correcao)."""

from __future__ import annotations

import pytest
from sqlalchemy import select

from src.database.session import SessionLocal
from src.models import AIJob, Essay, EssayTheme, User

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
            user_id=user.id, theme_id=theme.id, title=title, content=ESSAY_CONTENT,
            word_count=200, line_count=6, paragraph_count=3,
        )
        db.add(essay)
        db.commit()
        return essay.id
    finally:
        db.close()


@pytest.fixture()
def _force_synchronous_celery(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("src.routes.essays.enqueue_correct_essay", lambda _job_id: False)


def api_data(response):
    payload = response.json()
    assert payload["success"] is True, payload
    return payload["data"]


def test_repeated_submit_with_same_idempotency_key_after_sync_completion_reuses_job(client, _force_synchronous_celery):
    essay_id = _create_theme_and_essay(title="Tema idempotencia submit")

    first = api_data(client.post(f"/api/v1/essays/{essay_id}/submit?idempotency_key=submit-key-1"))
    # Job ja terminou (fallback sincrono) — get_active_for_essay() sozinho nao pega mais isso.
    db = SessionLocal()
    try:
        job = db.get(AIJob, first["job_id"])
        assert job is not None
        assert job.status in ("completed", "failed")
    finally:
        db.close()

    second = api_data(client.post(f"/api/v1/essays/{essay_id}/submit?idempotency_key=submit-key-1"))

    assert second["job_id"] == first["job_id"]

    db = SessionLocal()
    try:
        job_count = len(
            list(
                db.scalars(
                    select(AIJob).where(AIJob.idempotency_key == "submit-key-1")
                )
            )
        )
    finally:
        db.close()
    assert job_count == 1
