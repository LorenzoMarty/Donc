from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user
from src.models import AIJob, User
from src.queues.jobs import AIJobService, enqueue_correct_essay
from src.queues.tasks import run_correct_essay_job
from src.schemas.common import ApiResponse, MessageResponse, success_response
from src.schemas.essays import (
    EssayAutosaveRequest,
    EssayCreateRequest,
    EssayHistoryResponse,
    EssayRead,
    EssaySubmitResponse,
    EssayThemeRead,
    JobStatusRead,
)
from src.services.essay_service import EssayService


router = APIRouter(prefix="/essays", tags=["essays"])


@router.get("/themes", response_model=ApiResponse[list[EssayThemeRead]])
def themes(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[list[EssayThemeRead]]:
    return success_response(EssayService(db).list_themes())


@router.get("/history", response_model=ApiResponse[EssayHistoryResponse])
def history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[EssayHistoryResponse]:
    return success_response(EssayService(db).history(current_user.id))


@router.get("/{essay_id}", response_model=ApiResponse[EssayRead])
def get_essay(essay_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[EssayRead]:
    return success_response(EssayService(db).get(essay_id=essay_id, user_id=current_user.id))


@router.post("", response_model=ApiResponse[EssayRead], status_code=201)
def create_essay(payload: EssayCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[EssayRead]:
    return success_response(
        EssayService(db).create(user_id=current_user.id, theme_id=payload.theme_id, title=payload.title, content=payload.content),
        "Redacao criada.",
    )


@router.put("/{essay_id}/autosave", response_model=ApiResponse[EssayRead])
def autosave(
    essay_id: int,
    payload: EssayAutosaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return success_response(
        EssayService(db).autosave(essay_id=essay_id, user_id=current_user.id, title=payload.title, content=payload.content),
        "Rascunho salvo.",
    )


@router.post("/{essay_id}/submit", response_model=ApiResponse[EssaySubmitResponse])
def submit_essay(essay_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[EssaySubmitResponse]:
    essay = EssayService(db).get(essay_id=essay_id, user_id=current_user.id)
    job = AIJobService(db).create(
        user_id=current_user.id,
        kind="essay_correction",
        request_payload={"essay_id": essay_id},
    )
    enqueued = enqueue_correct_essay(job.id)
    if not enqueued:
        run_correct_essay_job(job.id)
    return success_response(EssaySubmitResponse(job_id=job.id, essay_id=essay.id), "Correcao iniciada.")


@router.get("/{essay_id}/job", response_model=ApiResponse[JobStatusRead])
def essay_job_status(essay_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[JobStatusRead]:
    job = (
        db.query(AIJob)
        .filter(
            AIJob.user_id == current_user.id,
            AIJob.kind == "essay_correction",
        )
        .order_by(AIJob.created_at.desc())
        .first()
    )
    if not job:
        from src.middlewares.errors import AppError
        raise AppError("Nenhum job encontrado para essa redacao.", status_code=404, code="ai_job_not_found")
    essay_read: EssayRead | None = None
    if job.status == "completed" and job.result_payload:
        essay_read = EssayRead.model_validate(job.result_payload)
    return success_response(
        JobStatusRead(
            job_id=job.id,
            status=job.status,
            essay=essay_read,
            error=job.error,
        )
    )


@router.post("/{essay_id}/duplicate", response_model=ApiResponse[EssayRead])
def duplicate_essay(essay_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[EssayRead]:
    return success_response(EssayService(db).duplicate(essay_id=essay_id, user_id=current_user.id), "Redacao duplicada.")


@router.post("/{essay_id}/new-version", response_model=ApiResponse[EssayRead])
def create_essay_version(essay_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[EssayRead]:
    return success_response(EssayService(db).new_version(essay_id=essay_id, user_id=current_user.id), "Nova versao criada.")


@router.post("/{essay_id}/versions/{version_id}/rewrite", response_model=ApiResponse[EssayRead])
def rewrite_from_version(essay_id: int, version_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[EssayRead]:
    return success_response(
        EssayService(db).rewrite_from_version(essay_id=essay_id, version_id=version_id, user_id=current_user.id),
        "Versao restaurada como rascunho.",
    )


@router.post("/{essay_id}/reprocess", response_model=ApiResponse[EssayRead])
def reprocess_essay(essay_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[EssayRead]:
    return success_response(EssayService(db).reprocess(essay_id=essay_id, user=current_user), "Correcao reprocessada.")


@router.delete("/{essay_id}", response_model=ApiResponse[MessageResponse])
def delete_essay(essay_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[MessageResponse]:
    EssayService(db).delete(essay_id=essay_id, user_id=current_user.id)
    return success_response(MessageResponse(message="Redacao excluida."), "Redacao excluida.")

