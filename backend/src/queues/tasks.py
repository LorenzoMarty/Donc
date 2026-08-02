from __future__ import annotations

from src.database.session import SessionLocal
from src.middlewares.errors import AppError
from src.models import AIJob, User
from src.queues.celery_app import celery_app
from src.queues.jobs import AIJobService
from src.schemas.essays import EssayRead
from src.services.essay_service import EssayService
from src.telemetry import flush_ai_telemetry


def run_correct_essay_job(job_id: str) -> dict:
    db = SessionLocal()
    try:
        jobs = AIJobService(db)
        job = db.get(AIJob, job_id)
        if not job:
            raise AppError("Job de IA não encontrado.", status_code=404, code="ai_job_not_found")
        jobs.mark_running(job)
        user = db.get(User, job.user_id)
        if not user:
            raise AppError("Usuário do job não encontrado.", status_code=404, code="user_not_found")
        essay_id = int(job.request_payload.get("essay_id"))
        essay = EssayService(db).submit_for_correction(essay_id=essay_id, user=user, job_id=job.id)
        result = EssayRead.model_validate(essay).model_dump(mode="json")
        jobs.mark_completed(job, result)
        return result
    except Exception as exc:
        # Se a excecao veio de uma escrita que falhou (ex.: IntegrityError nao tratada em algum
        # ponto), a sessao fica com uma transacao pendente de rollback — sem isso, o db.get()
        # abaixo tambem falha (PendingRollbackError) e o job nunca e marcado como failed, ficando
        # preso em "running" para sempre.
        db.rollback()
        job = db.get(AIJob, job_id)
        if job:
            error = exc.message if isinstance(exc, AppError) else str(exc)
            AIJobService(db).mark_failed(job, error)
        raise
    finally:
        flush_ai_telemetry()
        db.close()


if celery_app is not None:
    correct_essay_task = celery_app.task(name="src.queues.tasks.correct_essay")(run_correct_essay_job)
else:
    correct_essay_task = None
