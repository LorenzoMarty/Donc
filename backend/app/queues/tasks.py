from __future__ import annotations

from app.core.database import SessionLocal
from app.middlewares.errors import AppError
from app.models import AIJob, User
from app.queues.celery_app import celery_app
from app.queues.jobs import AIJobService
from app.schemas.essays import EssayRead
from app.services.essay_service import EssayService


def run_correct_essay_job(job_id: str) -> dict:
    db = SessionLocal()
    try:
        jobs = AIJobService(db)
        job = db.get(AIJob, job_id)
        if not job:
            raise AppError("Job de IA nao encontrado.", status_code=404, code="ai_job_not_found")
        jobs.mark_running(job)
        user = db.get(User, job.user_id)
        if not user:
            raise AppError("Usuario do job nao encontrado.", status_code=404, code="user_not_found")
        essay_id = int(job.request_payload.get("essay_id"))
        essay = EssayService(db).submit_for_correction(essay_id=essay_id, user=user, job_id=job.id)
        result = EssayRead.model_validate(essay).model_dump(mode="json")
        jobs.mark_completed(job, result)
        return result
    except Exception as exc:
        job = db.get(AIJob, job_id)
        if job:
            error = exc.message if isinstance(exc, AppError) else str(exc)
            AIJobService(db).mark_failed(job, error)
        raise
    finally:
        db.close()


if celery_app is not None:
    correct_essay_task = celery_app.task(name="app.queues.tasks.correct_essay")(run_correct_essay_job)
else:
    correct_essay_task = None
