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
    EssayThemeGenerateRequest,
    EssayThemeRead,
    JobStatusRead,
)
from src.services.essay_service import EssayService
from src.services.streak_service import touch_daily_streak
from src.utils.ai_quota import require_ai_daily_quota
from src.utils.rate_limit import require_ai_rate_limit


router = APIRouter(prefix="/essays", tags=["essays"])


@router.get("/themes", response_model=ApiResponse[list[EssayThemeRead]])
def themes(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[list[EssayThemeRead]]:
    return success_response(EssayService(db).list_themes())


@router.post("/themes/generate", response_model=ApiResponse[list[EssayThemeRead]])
def draw_random_themes(
    payload: EssayThemeGenerateRequest,  # noqa: ARG001
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[list[EssayThemeRead]]:
    # Apesar do path (/themes/generate, mantido por compatibilidade com o frontend), isto NAO
    # gera tema via IA — so sorteia entre temas ja cadastrados. Geracao real por IA existe em
    # POST /admin/essay-themes/generate (ThemeGeneratorAgent, uso exclusivo do admin).
    return success_response(EssayService(db).list_random_themes(limit=4), "4 temas sorteados do banco.")


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


@router.post(
    "/{essay_id}/submit",
    response_model=ApiResponse[EssaySubmitResponse],
    dependencies=[Depends(require_ai_rate_limit), Depends(require_ai_daily_quota("essay_correction"))],
)
def submit_essay(
    essay_id: int,
    idempotency_key: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[EssaySubmitResponse]:
    essay = EssayService(db).get(essay_id=essay_id, user_id=current_user.id)
    jobs = AIJobService(db)
    active_job = jobs.get_active_for_essay(user_id=current_user.id, essay_id=essay_id)
    if active_job:
        # Evita duplo-clique/retry disparando um novo pipeline de IA enquanto o anterior ainda
        # esta rodando para a mesma redacao — devolve o job ja em andamento em vez de criar outro.
        return success_response(EssaySubmitResponse(job_id=active_job.id, essay_id=essay.id), "Correcao ja em andamento.")
    # REQ-9 (P2b): cobre tambem o caso do fallback sincrono, onde o job ja terminou (completed/
    # failed) antes do retry chegar — get_active_for_essay() sozinho nao pega mais isso.
    cached_job = jobs.get_by_idempotency_key(user_id=current_user.id, kind="essay_correction", idempotency_key=idempotency_key)
    if cached_job and int((cached_job.request_payload or {}).get("essay_id", -1)) == essay_id:
        return success_response(EssaySubmitResponse(job_id=cached_job.id, essay_id=essay.id), "Correcao ja processada.")
    job = jobs.create(
        user_id=current_user.id,
        kind="essay_correction",
        request_payload={"essay_id": essay_id},
        idempotency_key=idempotency_key,
        attempt=jobs.next_attempt_number(user_id=current_user.id, kind="essay_correction", essay_id=essay_id),
    )
    essay.last_ai_job_id = job.id
    db.commit()
    enqueued = enqueue_correct_essay(job.id)
    if not enqueued:
        run_correct_essay_job(job.id)
    touch_daily_streak(db, current_user)
    return success_response(EssaySubmitResponse(job_id=job.id, essay_id=essay.id), "Correcao iniciada.")


@router.get("/{essay_id}/job", response_model=ApiResponse[JobStatusRead])
def essay_job_status(essay_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[JobStatusRead]:
    # `essay.last_ai_job_id` é gravado no momento em que o job é criado (submit/reprocess) —
    # não precisa inferir "o job mais recente" via ordenação: `ai_jobs.id` é UUID (sem ordem
    # temporal) e `created_at` pode colidir entre o job antigo e o novo de um reprocess rápido.
    essay = EssayService(db).get(essay_id=essay_id, user_id=current_user.id)
    job = db.get(AIJob, essay.last_ai_job_id) if essay.last_ai_job_id else None
    if not job or job.user_id != current_user.id:
        from src.middlewares.errors import AppError
        raise AppError("Nenhum job encontrado para essa redação.", status_code=404, code="ai_job_not_found")
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


@router.post(
    "/{essay_id}/reprocess",
    response_model=ApiResponse[EssaySubmitResponse],
    dependencies=[Depends(require_ai_rate_limit), Depends(require_ai_daily_quota("essay_correction"))],
)
def reprocess_essay(
    essay_id: int,
    idempotency_key: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[EssaySubmitResponse]:
    essay = EssayService(db).get(essay_id=essay_id, user_id=current_user.id)
    jobs = AIJobService(db)
    active_job = jobs.get_active_for_essay(user_id=current_user.id, essay_id=essay_id)
    if active_job:
        return success_response(EssaySubmitResponse(job_id=active_job.id, essay_id=essay.id), "Correcao ja em andamento.")
    cached_job = jobs.get_by_idempotency_key(user_id=current_user.id, kind="essay_correction", idempotency_key=idempotency_key)
    if cached_job and int((cached_job.request_payload or {}).get("essay_id", -1)) == essay_id:
        return success_response(EssaySubmitResponse(job_id=cached_job.id, essay_id=essay.id), "Correcao ja processada.")
    job = jobs.create(
        user_id=current_user.id,
        kind="essay_correction",
        request_payload={"essay_id": essay_id},
        idempotency_key=idempotency_key,
        attempt=jobs.next_attempt_number(user_id=current_user.id, kind="essay_correction", essay_id=essay_id),
    )
    essay.last_ai_job_id = job.id
    db.commit()
    enqueued = enqueue_correct_essay(job.id)
    if not enqueued:
        run_correct_essay_job(job.id)
    return success_response(EssaySubmitResponse(job_id=job.id, essay_id=essay.id), "Reprocessamento iniciado.")


@router.delete("/{essay_id}", response_model=ApiResponse[MessageResponse])
def delete_essay(essay_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[MessageResponse]:
    EssayService(db).delete(essay_id=essay_id, user_id=current_user.id)
    return success_response(MessageResponse(message="Redacao excluida."), "Redacao excluida.")
