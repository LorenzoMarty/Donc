"""Falhas de Redis (pub/sub de job e rate limit) precisam ficar visiveis nos logs
em vez de serem engolidas silenciosamente — o fallback (polling / contador em
memoria) continua funcionando, mas agora com log."""

from __future__ import annotations

import logging

import pytest

from src.middlewares.errors import AppError
from src.queues.jobs import AIJobService, enqueue_correct_essay
from src.utils.rate_limit import check_ai_rate_limit

pytestmark = pytest.mark.unit


class _FakeJob:
    id = "job-123"


def test_publish_logs_warning_when_redis_unavailable(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    def _boom(*_args, **_kwargs):
        raise ConnectionError("redis indisponivel")

    monkeypatch.setattr("redis.from_url", _boom)

    with caplog.at_level(logging.WARNING, logger="src.queues.jobs"):
        # Nao deve levantar excecao — publicacao continua best-effort.
        AIJobService.publish(AIJobService.__new__(AIJobService), _FakeJob())

    assert any("Falha ao publicar job" in record.message for record in caplog.records)
    assert any(record.levelno == logging.WARNING for record in caplog.records)


def test_publish_log_does_not_leak_job_payload_content(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    def _boom(*_args, **_kwargs):
        raise ConnectionError("redis indisponivel")

    monkeypatch.setattr("redis.from_url", _boom)

    with caplog.at_level(logging.WARNING, logger="src.queues.jobs"):
        AIJobService.publish(AIJobService.__new__(AIJobService), _FakeJob())

    logged_text = " ".join(record.message for record in caplog.records)
    assert "redacao" not in logged_text.lower()
    assert "senha" not in logged_text.lower()


def test_enqueue_correct_essay_logs_and_returns_false_on_redis_failure(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    def _boom(*_args, **_kwargs):
        raise ConnectionError("redis indisponivel")

    monkeypatch.setattr("redis.from_url", _boom)
    monkeypatch.setattr("src.queues.tasks.correct_essay_task", object(), raising=False)

    with caplog.at_level(logging.WARNING, logger="src.queues.jobs"):
        result = enqueue_correct_essay("job-456")

    assert result is False
    assert any("Falha ao enfileirar job" in record.message for record in caplog.records)


def test_check_ai_rate_limit_logs_when_redis_fails_but_falls_back_to_memory(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    def _boom(*_args, **_kwargs):
        raise ConnectionError("redis indisponivel")

    monkeypatch.setattr("redis.from_url", _boom)
    monkeypatch.setattr("src.utils.rate_limit.settings.ai_rate_limit_per_minute", 100)

    with caplog.at_level(logging.WARNING, logger="src.utils.rate_limit"):
        # Nao deve levantar — cai no contador em memoria (fallback preservado).
        check_ai_rate_limit(user_id=1)

    assert any("Falha ao incrementar rate limit" in record.message for record in caplog.records)


def test_check_ai_rate_limit_still_blocks_via_memory_fallback_when_redis_down(monkeypatch: pytest.MonkeyPatch) -> None:
    def _boom(*_args, **_kwargs):
        raise ConnectionError("redis indisponivel")

    monkeypatch.setattr("redis.from_url", _boom)
    monkeypatch.setattr("src.utils.rate_limit.settings.ai_rate_limit_per_minute", 2)
    monkeypatch.setattr("src.utils.rate_limit._memory_counters", {})

    check_ai_rate_limit(user_id=42)
    check_ai_rate_limit(user_id=42)
    with pytest.raises(AppError) as exc_info:
        check_ai_rate_limit(user_id=42)

    assert exc_info.value.code == "rate_limited"
