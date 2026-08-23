from __future__ import annotations

import json
import logging
import threading
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from src.config.settings import settings
from src.middlewares.errors import AppError
from src.models import AIJob


logger = logging.getLogger("src.queues.jobs")

# Compartilhado entre requests (mesmo processo worker) — capa quantas correcoes sincronas de
# fallback rodam ao mesmo tempo no threadpool do FastAPI. Ver settings.ai_sync_fallback_max_concurrency.
_sync_fallback_semaphore = threading.BoundedSemaphore(settings.ai_sync_fallback_max_concurrency)


class AIJobService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self, *, user_id: int, kind: str, request_payload: dict, idempotency_key: str | None = None, attempt: int = 1
    ) -> AIJob:
        job = AIJob(
            id=str(uuid.uuid4()),
            user_id=user_id,
            kind=kind,
            status="queued",
            request_payload=request_payload,
            idempotency_key=idempotency_key,
            attempt=attempt,
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        self.publish(job)
        return job

    def get_for_user(self, *, job_id: str, user_id: int) -> AIJob:
        job = self.db.get(AIJob, job_id)
        if not job or job.user_id != user_id:
            raise AppError("Job de IA não encontrado.", status_code=404, code="ai_job_not_found")
        return expire_stale_job(self.db, job)

    def get_active_for_essay(self, *, user_id: int, essay_id: int, kind: str = "essay_correction") -> AIJob | None:
        # Idempotencia: evita criar um job novo (e rodar o pipeline de IA de novo) se ja existe
        # um em andamento para a mesma redacao — ver nota sobre corrida em submits concorrentes.
        active_statuses = ("queued", "running")
        jobs = (
            self.db.query(AIJob)
            .filter(AIJob.user_id == user_id, AIJob.kind == kind, AIJob.status.in_(active_statuses))
            .order_by(AIJob.created_at.desc())
            .all()
        )
        return next(
            (job for job in jobs if int((job.request_payload or {}).get("essay_id", -1)) == essay_id),
            None,
        )

    def get_by_idempotency_key(self, *, user_id: int, kind: str, idempotency_key: str | None) -> AIJob | None:
        """REQ-9 (P2b): job repetido com a mesma chave e reaproveitado independente do status —
        cobre o fallback sincrono, onde `get_active_for_essay` (so queued/running) ja nao pega
        mais o job assim que ele termina."""
        if not idempotency_key:
            return None
        return (
            self.db.query(AIJob)
            .filter(AIJob.user_id == user_id, AIJob.kind == kind, AIJob.idempotency_key == idempotency_key)
            .order_by(AIJob.created_at.desc())
            .first()
        )

    def next_attempt_number(self, *, user_id: int, kind: str, essay_id: int) -> int:
        """REQ-7 (P2b): quantas vezes essa redacao ja foi submetida/reprocessada — usado como
        `attempt` do proximo AIJob."""
        prior = (
            self.db.query(AIJob)
            .filter(AIJob.user_id == user_id, AIJob.kind == kind)
            .all()
        )
        count = sum(1 for job in prior if int((job.request_payload or {}).get("essay_id", -1)) == essay_id)
        return count + 1

    def mark_running(self, job: AIJob) -> None:
        job.status = "running"
        self.db.commit()
        self.db.refresh(job)
        self.publish(job)

    def mark_completed(self, job: AIJob, result: dict) -> None:
        job.status = "completed"
        job.result_payload = result
        job.error = None
        job.finished_at = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(job)
        self.publish(job)

    def mark_failed(self, job: AIJob, error: str) -> None:
        job.status = "failed"
        job.error = error[:4000]
        job.finished_at = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(job)
        self.publish(job)

    def publish(self, job: AIJob) -> None:
        try:
            import redis

            client = redis.from_url(settings.redis_url, socket_connect_timeout=0.2, socket_timeout=0.2)
            client.publish(f"ai-job:{job.id}", json.dumps(job_payload(job)))
        except Exception as exc:
            # Publicação é best-effort: se o Redis estiver fora, o job continua
            # funcionando via polling — mas a falha precisa ficar visível nos logs.
            logger.warning(
                "Falha ao publicar job %s no Redis (pub/sub degradado, seguindo via polling): %s: %s",
                job.id,
                type(exc).__name__,
                exc,
            )


def expire_stale_job(db: Session, job: AIJob) -> AIJob:
    """Job async 'queued'/'running' parado por mais tempo que `ai_job_stale_seconds` e considerado
    travado (Redis vivo mas worker Celery morto: `enqueue_correct_essay` reporta sucesso pelo
    `.ping()`/`.delay()`, mas ninguem consome a fila) — marca failed em vez de deixar poll/SSE
    esperando pra sempre."""
    if job.status not in ("queued", "running"):
        return job
    age_seconds = (datetime.now(UTC) - job.created_at).total_seconds()
    if age_seconds <= settings.ai_job_stale_seconds:
        return job
    logger.warning("Job %s parado ha %.0fs sem concluir (worker provavelmente morto/travado) — marcando failed.", job.id, age_seconds)
    job.status = "failed"
    job.error = "Tempo de processamento excedido. Tente reenviar a redação."
    job.finished_at = datetime.now(UTC)
    db.commit()
    db.refresh(job)
    return job


def job_payload(job: AIJob) -> dict:
    return {
        "job_id": job.id,
        "status": job.status,
        "kind": job.kind,
        "result": job.result_payload,
        "error": job.error,
    }


def acquire_sync_fallback_slot() -> bool:
    """Non-blocking: True se havia vaga (chamador DEVE chamar release_sync_fallback_slot() depois),
    False se o teto de correcoes sincronas simultaneas ja foi atingido."""
    return _sync_fallback_semaphore.acquire(blocking=False)


def release_sync_fallback_slot() -> None:
    _sync_fallback_semaphore.release()


def enqueue_correct_essay(job_id: str) -> bool:
    try:
        import redis
        from src.queues.tasks import correct_essay_task

        if correct_essay_task is None:
            logger.error(
                "SYNC_FALLBACK_TRIGGERED job=%s reason=celery_unavailable — correcao vai rodar dentro da request HTTP.",
                job_id,
            )
            return False
        redis.from_url(settings.redis_url, socket_connect_timeout=0.2, socket_timeout=0.2).ping()
        correct_essay_task.delay(job_id)
        return True
    except Exception as exc:
        logger.error(
            "SYNC_FALLBACK_TRIGGERED job=%s reason=enqueue_failed error=%s: %s — correcao vai rodar dentro da request HTTP.",
            job_id,
            type(exc).__name__,
            exc,
        )
        return False
