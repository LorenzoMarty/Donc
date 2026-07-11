"""Testes de integração do fluxo submit -> correção assíncrona (Celery) -> polling."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from src.database.session import SessionLocal
from src.models import Essay, EssayTheme, User

pytestmark = pytest.mark.integration

# Conteúdo com bastante palavras para passar do mínimo de 80 exigido por submit_for_correction.
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

EDITED_ESSAY_CONTENT = ESSAY_CONTENT + "\n\nEdicao adicional para permitir reprocessamento apos a correcao inicial."


def _get_demo_user() -> User:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        return user
    finally:
        db.close()


def _create_theme_and_essay() -> tuple[int, int]:
    """Cria um tema e uma redação (com conteúdo suficiente) para o aluno demo. Retorna (theme_id, essay_id)."""
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        theme = EssayTheme(
            title="Saneamento basico no Brasil",
            context="Texto motivador sobre desigualdade no acesso a saneamento.",
            source="Teste de integracao",
            is_active=True,
        )
        db.add(theme)
        db.flush()
        essay = Essay(
            user_id=user.id,
            theme_id=theme.id,
            title="Redacao sobre saneamento",
            content=ESSAY_CONTENT,
            word_count=200,
            line_count=6,
            paragraph_count=3,
        )
        db.add(essay)
        db.commit()
        return theme.id, essay.id
    finally:
        db.close()


def _user_xp() -> int:
    return _get_demo_user().xp


@pytest.fixture()
def _force_synchronous_celery(monkeypatch: pytest.MonkeyPatch) -> None:
    """Garante execução síncrona do job (sem depender de Redis/worker disponíveis no ambiente de teste)."""
    monkeypatch.setattr("src.routes.essays.enqueue_correct_essay", lambda _job_id: False)


def test_submit_essay_enqueues_job_and_returns_expected_shape(client: TestClient, _force_synchronous_celery: None) -> None:
    _, essay_id = _create_theme_and_essay()

    res = client.post(f"/api/v1/essays/{essay_id}/submit")

    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    data = body["data"]
    assert data["essay_id"] == essay_id
    assert isinstance(data["job_id"], str) and data["job_id"]


def test_submit_then_poll_job_reaches_completed_with_corrected_essay(client: TestClient, _force_synchronous_celery: None) -> None:
    _, essay_id = _create_theme_and_essay()
    xp_before = _user_xp()

    submit_res = client.post(f"/api/v1/essays/{essay_id}/submit")
    assert submit_res.status_code == 200
    job_id = submit_res.json()["data"]["job_id"]

    poll_res = client.get(f"/api/v1/essays/{essay_id}/job")
    assert poll_res.status_code == 200
    poll_body = poll_res.json()["data"]

    assert poll_body["job_id"] == job_id
    assert poll_body["status"] == "completed"
    assert poll_body["error"] is None

    essay_data = poll_body["essay"]
    assert essay_data is not None
    assert essay_data["id"] == essay_id
    assert essay_data["status"] == "corrected"
    assert essay_data["correction"] is not None
    correction = essay_data["correction"]
    assert correction["total_score"] >= 0
    assert correction["total_score"] == (
        correction["competency_1"]
        + correction["competency_2"]
        + correction["competency_3"]
        + correction["competency_4"]
        + correction["competency_5"]
    )
    assert correction["feedback"]

    # Submit awards points (award_points=True por padrão).
    assert _user_xp() == xp_before + 120


def test_reprocess_uses_same_async_flow_without_awarding_points_twice(client: TestClient, _force_synchronous_celery: None) -> None:
    _, essay_id = _create_theme_and_essay()
    xp_before = _user_xp()

    submit_res = client.post(f"/api/v1/essays/{essay_id}/submit")
    assert submit_res.status_code == 200
    first_job_id = submit_res.json()["data"]["job_id"]
    xp_after_submit = _user_xp()
    assert xp_after_submit == xp_before + 120

    # Redação corrigida fica travada para autosave; é preciso abrir nova versão (rascunho) antes
    # de editar e reprocessar (regra de negócio: edit_required).
    new_version_res = client.post(f"/api/v1/essays/{essay_id}/new-version")
    assert new_version_res.status_code == 200

    autosave_res = client.put(
        f"/api/v1/essays/{essay_id}/autosave",
        json={"title": "Redacao sobre saneamento", "content": EDITED_ESSAY_CONTENT},
    )
    assert autosave_res.status_code == 200

    reprocess_res = client.post(f"/api/v1/essays/{essay_id}/reprocess")
    assert reprocess_res.status_code == 200
    reprocess_body = reprocess_res.json()["data"]
    second_job_id = reprocess_body["job_id"]
    assert reprocess_body["essay_id"] == essay_id
    assert second_job_id != first_job_id

    poll_res = client.get(f"/api/v1/essays/{essay_id}/job")
    assert poll_res.status_code == 200
    poll_body = poll_res.json()["data"]
    # O polling filtra pelo job mais recente daquela redação -> reflete o reprocessamento.
    assert poll_body["job_id"] == second_job_id
    assert poll_body["status"] == "completed"
    assert poll_body["essay"]["content"] == EDITED_ESSAY_CONTENT

    # Reprocess usa award_points=False -> XP não deve aumentar de novo.
    assert _user_xp() == xp_after_submit
