from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from src.config.settings import settings
from src.middlewares.errors import AppError
from src.models import AIJob


logger = logging.getLogger("src.queues.jobs")


class AIJobService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, *, user_id: int, kind: str, request_payload: dict) -> AIJob:
        job = AIJob(
            id=str(uuid.uuid4()),
            user_id=user_id,
            kind=kind,
            status="queued",
            request_payload=request_payload,
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        self.publish(job)
        return job

    def get_for_user(self, *, job_id: str, user_id: int) -> AIJob:
        job = self.db.get(AIJob, job_id)
        if not job or job.user_id != user_id:
            raise AppError("Job de IA nao encontrado.", status_code=404, code="ai_job_not_found")
        return job

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


def job_payload(job: AIJob) -> dict:
    return {
        "job_id": job.id,
        "status": job.status,
        "kind": job.kind,
        "result": job.result_payload,
        "error": job.error,
    }


def enqueue_correct_essay(job_id: str) -> bool:
    try:
        import redis
        from src.queues.tasks import correct_essay_task

        if correct_essay_task is None:
            logger.warning("Celery indisponivel para job %s (correct_essay_task=None); caindo para execucao sincrona.", job_id)
            return False
        redis.from_url(settings.redis_url, socket_connect_timeout=0.2, socket_timeout=0.2).ping()
        correct_essay_task.delay(job_id)
        return True
    except Exception as exc:
        logger.warning(
            "Falha ao enfileirar job %s no Celery/Redis (caindo para execucao sincrona): %s: %s",
            job_id,
            type(exc).__name__,
            exc,
        )
        return False
