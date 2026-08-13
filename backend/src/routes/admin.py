from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user, require_admin
from src.models import User
from src.schemas.admin import (
    AddGameQuestionRequest,
    AdminEssayThemeReviewRequest,
    ReorderGameQuestionsRequest,
    ReviewQueueItem,
    AdminContentActionResponse,
    AdminContentQualityResponse,
    AdminActivityCreateRequest,
    AdminActivityGenerateRequest,
    AdminActivityUpdateRequest,
    AdminEssayThemeActionResponse,
    AdminEssayThemeGenerateRequest,
    AdminEssayThemeUpdateRequest,
    AdminLessonCreateRequest,
    AdminLessonRead,
    AdminLessonUpdateRequest,
    AdminModuleUpdateRequest,
    AdminMoveRequest,
    AdminAdaptiveHealthResponse,
    AdminPedagogicalMetricsResponse,
    AIGenerationTraceRead,
    AIQualityReportRow,
    AIQuotaStatusRead,
    ContentVersionRead,
    AdminUserActionResponse,
    AdminUserDetailResponse,
    AdminMetricsResponse,
    AdminModuleCreateRequest,
    AdminModuleRead,
    AdminUserRead,
    AdminUserUpdateRequest,
    AIGameActionResponse,
    AIGeneratedExerciseRead,
    AIGeneratedGameRead,
    AITelemetryResponse,
    GenerateGameRequest,
    ReviewExerciseRequest,
    ReviewGameRequest,
    TrackEventRequest,
    UpdateGameRequest,
    UserActivityResponse,
)
from src.schemas.common import ApiResponse, success_response
from src.schemas.essays import EssayThemeRead
from src.services.admin_adaptive_health_service import AdminAdaptiveHealthService
from src.services.admin_content_quality_service import AdminContentQualityService
from src.services.admin_content_service import AdminContentService
from src.services.admin_game_review_service import AdminGameReviewService
from src.services.admin_metrics_service import AdminMetricsService
from src.services.admin_pedagogical_metrics_service import AdminPedagogicalMetricsService
from src.services.admin_review_queue_service import AdminReviewQueueService
from src.services.admin_telemetry_service import AdminTelemetryService
from src.services.admin_user_service import AdminUserService
from src.services.content_versioning import list_versions
from src.utils.ai_security import contains_prompt_injection, sanitize_ai_text
from src.utils.ai_quota import require_ai_daily_quota
from src.utils.rate_limit import require_ai_rate_limit


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/metrics", response_model=ApiResponse[AdminMetricsResponse])
def metrics(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[AdminMetricsResponse]:
    return success_response(AdminMetricsService(db).metrics())


@router.get("/users", response_model=ApiResponse[list[AdminUserRead]])
def users(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[list[AdminUserRead]]:
    return success_response(AdminUserService(db).users_list())


@router.get("/content-quality", response_model=ApiResponse[AdminContentQualityResponse])
def content_quality(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[AdminContentQualityResponse]:
    return success_response(AdminContentQualityService(db).report())


@router.get("/adaptive-health", response_model=ApiResponse[AdminAdaptiveHealthResponse])
def adaptive_health(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[AdminAdaptiveHealthResponse]:
    report = AdminAdaptiveHealthService(db).report()
    return success_response(
        AdminAdaptiveHealthResponse(
            students_without_diagnosis=report.students_without_diagnosis,
            students_without_recommendation=report.students_without_recommendation,
            recommendations_without_content=report.recommendations_without_content,
            issues_without_content=report.issues_without_content,
            issues_without_progress=report.issues_without_progress,
        )
    )


@router.get("/pedagogical-metrics", response_model=ApiResponse[AdminPedagogicalMetricsResponse])
def pedagogical_metrics(
    _: User = Depends(require_admin), db: Session = Depends(get_db)
) -> ApiResponse[AdminPedagogicalMetricsResponse]:
    return success_response(AdminPedagogicalMetricsService(db).report())


@router.get("/review-queue", response_model=ApiResponse[list[ReviewQueueItem]])
def review_queue(
    content_type: str | None = Query(default=None, pattern="^(game|exercise|theme)$"),
    status: str = Query(default="pending", pattern="^(pending|approved|rejected)$"),
    target: str | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    created_from: date | None = Query(default=None),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[ReviewQueueItem]]:
    items = AdminReviewQueueService(db).list_queue(
        content_type=content_type, status=status, target=target, difficulty=difficulty, created_from=created_from
    )
    return success_response(items)


@router.get("/content", response_model=ApiResponse[list[AdminModuleRead]])
def content(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[list[AdminModuleRead]]:
    return success_response(AdminContentService(db).content_tree())


@router.get("/essay-themes", response_model=ApiResponse[list[EssayThemeRead]])
def essay_themes(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[list[EssayThemeRead]]:
    return success_response(AdminContentService(db).list_essay_themes())


@router.post(
    "/essay-themes/generate",
    response_model=ApiResponse[EssayThemeRead],
    status_code=201,
    dependencies=[Depends(require_ai_rate_limit), Depends(require_ai_daily_quota("admin_theme_generation"))],
)
def generate_essay_theme(
    payload: AdminEssayThemeGenerateRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[EssayThemeRead]:
    focus = sanitize_ai_text(payload.focus or "", max_chars=160) or None
    if focus and contains_prompt_injection(focus):
        from src.middlewares.errors import AppError

        raise AppError("Entrada contém instruções indevidas para o agente.", status_code=422, code="prompt_injection_detected")
    requirements = {item.type: item.count for item in payload.supporting_text_requirements if item.count > 0}
    return success_response(
        AdminContentService(db).generate_essay_theme(
            focus=focus,
            admin_user_id=current_admin.id,
            supporting_text_requirements=requirements or None,
            idempotency_key=payload.idempotency_key,
        ),
        "Tema gerado.",
    )


@router.patch("/essay-themes/{theme_id}", response_model=ApiResponse[EssayThemeRead])
def update_essay_theme(
    theme_id: int,
    payload: AdminEssayThemeUpdateRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[EssayThemeRead]:
    return success_response(
        AdminContentService(db).update_essay_theme(
            theme_id=theme_id,
            title=payload.title,
            context=payload.context,
            supporting_texts=[item.model_dump() for item in payload.supporting_texts] if payload.supporting_texts is not None else None,
            admin_user_id=current_admin.id,
        ),
        "Tema atualizado.",
    )


@router.post("/essay-themes/{theme_id}/review", response_model=ApiResponse[EssayThemeRead])
def review_essay_theme(
    theme_id: int,
    payload: AdminEssayThemeReviewRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[EssayThemeRead]:
    theme = AdminContentService(db).review_essay_theme(theme_id=theme_id, action=payload.action, reviewer_id=current_admin.id)
    return success_response(theme, "Tema revisado.")


@router.delete("/essay-themes/{theme_id}", response_model=ApiResponse[AdminEssayThemeActionResponse])
def delete_essay_theme(
    theme_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminEssayThemeActionResponse]:
    AdminContentService(db).delete_essay_theme(theme_id=theme_id)
    return success_response(AdminEssayThemeActionResponse(action="deleted", theme_id=theme_id), "Tema excluido.")


@router.post("/modules", response_model=ApiResponse[list[AdminModuleRead]], status_code=201)
def create_module(
    payload: AdminModuleCreateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminModuleRead]]:
    return success_response(
        AdminContentService(db).create_module(
            title=payload.title,
            slug=payload.slug,
            description=payload.description,
            color=payload.color,
            order=payload.order,
        ),
        "Modulo criado.",
    )


@router.post("/modules/{module_id}/lessons", response_model=ApiResponse[AdminLessonRead], status_code=201)
def create_lesson(
    module_id: int,
    payload: AdminLessonCreateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminLessonRead]:
    return success_response(
        AdminContentService(db).create_lesson(
            module_id=module_id,
            title=payload.title,
            description=payload.description,
            thumbnail_url=payload.thumbnail_url,
            video_url=payload.video_url,
            pdf_url=payload.pdf_url,
            summary=payload.summary,
            duration_minutes=payload.duration_minutes,
            order=payload.order,
            targets=payload.targets,
        ),
        "Aula criada.",
    )


@router.post("/modules/{module_id}/activities", response_model=ApiResponse[list[AdminModuleRead]], status_code=201)
def create_activity(
    module_id: int,
    payload: AdminActivityCreateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminModuleRead]]:
    return success_response(
        AdminContentService(db).create_activity(
            module_id=module_id,
            statement=payload.statement,
            options=payload.options,
            correct_answer=payload.correct_answer,
            explanation=payload.explanation,
            skill=payload.skill,
            difficulty=payload.difficulty,
            lesson_id=payload.lesson_id,
            base_lesson_ids=payload.base_lesson_ids,
            order=payload.order,
            targets=payload.targets,
        ),
        "Atividade criada.",
    )


@router.post(
    "/modules/{module_id}/activities/generate",
    response_model=ApiResponse[list[AIGeneratedExerciseRead]],
    dependencies=[Depends(require_ai_rate_limit), Depends(require_ai_daily_quota("admin_activity_generation"))],
)
def generate_activity_draft(
    module_id: int,
    payload: AdminActivityGenerateRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AIGeneratedExerciseRead]]:
    return success_response(
        AdminContentService(db).generate_activity_drafts(
            module_id=module_id,
            lesson_ids=payload.lesson_ids,
            difficulty=payload.difficulty,
            count=payload.count,
            focus=payload.focus,
            admin_user_id=current_admin.id,
            idempotency_key=payload.idempotency_key,
        ),
        "Exercício gerado — revise antes de aprovar.",
    )


@router.get("/ai-exercises", response_model=ApiResponse[list[AIGeneratedExerciseRead]])
def list_ai_exercises(
    status: str | None = Query(default=None, pattern="^(pending|approved|rejected)$"),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AIGeneratedExerciseRead]]:
    return success_response(AdminContentService(db).list_ai_exercises(status=status))


@router.post("/ai-exercises/{ai_exercise_id}/review", response_model=ApiResponse[AIGeneratedExerciseRead])
def review_ai_exercise(
    ai_exercise_id: int,
    payload: ReviewExerciseRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGeneratedExerciseRead]:
    result = AdminContentService(db).review_ai_exercise(
        ai_exercise_id,
        action=payload.action,
        notes=payload.notes,
        statement=payload.statement,
        options=payload.options,
        correct_answer=payload.correct_answer,
        explanation=payload.explanation,
        skill=payload.skill,
        difficulty=payload.difficulty,
        lesson_id=payload.lesson_id,
        base_lesson_ids=payload.base_lesson_ids,
        order=payload.order,
        targets=payload.targets,
        reviewer_id=current_admin.id,
    )
    return success_response(result, "Exercício aprovado." if payload.action == "approve" else "Exercício rejeitado.")


@router.patch("/modules/{module_id}", response_model=ApiResponse[list[AdminModuleRead]])
def update_module(
    module_id: int,
    payload: AdminModuleUpdateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminModuleRead]]:
    return success_response(
        AdminContentService(db).update_module(module_id=module_id, title=payload.title, description=payload.description, color=payload.color),
        "Modulo atualizado.",
    )


@router.delete("/modules/{module_id}", response_model=ApiResponse[list[AdminModuleRead]])
def delete_module(
    module_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminModuleRead]]:
    return success_response(AdminContentService(db).delete_module(module_id=module_id), "Modulo excluido.")


@router.post("/modules/{module_id}/move", response_model=ApiResponse[list[AdminModuleRead]])
def move_module(
    module_id: int,
    payload: AdminMoveRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminModuleRead]]:
    return success_response(AdminContentService(db).move_module(module_id=module_id, direction=payload.direction), "Ordem atualizada.")


@router.patch("/lessons/{lesson_id}", response_model=ApiResponse[list[AdminModuleRead]])
def update_lesson(
    lesson_id: int,
    payload: AdminLessonUpdateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminModuleRead]]:
    return success_response(
        AdminContentService(db).update_lesson(
            lesson_id=lesson_id,
            title=payload.title,
            description=payload.description,
            summary=payload.summary,
            thumbnail_url=payload.thumbnail_url,
            video_url=payload.video_url,
            duration_minutes=payload.duration_minutes,
            targets=payload.targets,
        ),
        "Aula atualizada.",
    )


@router.delete("/lessons/{lesson_id}", response_model=ApiResponse[list[AdminModuleRead]])
def delete_lesson(
    lesson_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminModuleRead]]:
    return success_response(AdminContentService(db).delete_lesson(lesson_id=lesson_id), "Aula excluida.")


@router.post("/lessons/{lesson_id}/move", response_model=ApiResponse[list[AdminModuleRead]])
def move_lesson(
    lesson_id: int,
    payload: AdminMoveRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminModuleRead]]:
    return success_response(AdminContentService(db).move_lesson(lesson_id=lesson_id, direction=payload.direction), "Ordem atualizada.")


@router.patch("/activities/{activity_id}", response_model=ApiResponse[list[AdminModuleRead]])
def update_activity(
    activity_id: int,
    payload: AdminActivityUpdateRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminModuleRead]]:
    return success_response(
        AdminContentService(db).update_activity(
            activity_id=activity_id,
            statement=payload.statement,
            options=payload.options,
            correct_answer=payload.correct_answer,
            explanation=payload.explanation,
            skill=payload.skill,
            difficulty=payload.difficulty,
            lesson_id=payload.lesson_id,
            base_lesson_ids=payload.base_lesson_ids,
            targets=payload.targets,
            admin_user_id=current_admin.id,
        ),
        "Atividade atualizada.",
    )


@router.delete("/activities/{activity_id}", response_model=ApiResponse[list[AdminModuleRead]])
def delete_activity(
    activity_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminModuleRead]]:
    return success_response(AdminContentService(db).delete_activity(activity_id=activity_id), "Atividade excluida.")


@router.post("/activities/{activity_id}/archive", response_model=ApiResponse[list[AdminModuleRead]])
def archive_activity(
    activity_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminModuleRead]]:
    return success_response(AdminContentService(db).archive_activity(activity_id=activity_id), "Atividade arquivada.")


@router.post("/activities/{activity_id}/unarchive", response_model=ApiResponse[list[AdminModuleRead]])
def unarchive_activity(
    activity_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminModuleRead]]:
    return success_response(AdminContentService(db).unarchive_activity(activity_id=activity_id), "Atividade restaurada.")


@router.post("/module-items/{item_id}/move", response_model=ApiResponse[list[AdminModuleRead]])
def move_module_item(
    item_id: int,
    payload: AdminMoveRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminModuleRead]]:
    return success_response(AdminContentService(db).move_module_item(item_id=item_id, direction=payload.direction), "Ordem atualizada.")


@router.get("/users/{user_id}/detail", response_model=ApiResponse[AdminUserDetailResponse])
def user_detail(
    user_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminUserDetailResponse]:
    return success_response(AdminUserService(db).user_detail(user_id))


@router.patch("/users/{user_id}", response_model=ApiResponse[AdminUserRead])
def update_user(
    user_id: int,
    payload: AdminUserUpdateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminUserRead]:
    return success_response(
        AdminUserService(db).update_student(
            user_id=user_id,
            name=payload.name,
            streak_days=payload.streak_days,
            daily_goal_minutes=payload.daily_goal_minutes,
        ),
        "Aluno atualizado.",
    )


@router.delete("/users/{user_id}", response_model=ApiResponse[AdminUserActionResponse])
def delete_user(
    user_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminUserActionResponse]:
    AdminUserService(db).delete_student(user_id=user_id, admin_user_id=current_admin.id)
    return success_response(AdminUserActionResponse(action="deleted", user_id=user_id), "Aluno excluido.")


@router.get("/ai-telemetry", response_model=ApiResponse[AITelemetryResponse])
def ai_telemetry(
    days: int = Query(default=30, ge=1, le=90),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AITelemetryResponse]:
    return success_response(AdminTelemetryService(db).ai_telemetry(period_days=days))


@router.get("/ai-quota", response_model=ApiResponse[AIQuotaStatusRead])
def ai_quota_status(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[AIQuotaStatusRead]:
    return success_response(AdminTelemetryService(db).ai_quota_status())


@router.get("/ai-quality", response_model=ApiResponse[list[AIQualityReportRow]])
def ai_quality_report(
    days: int = Query(default=30, ge=1, le=90),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AIQualityReportRow]]:
    return success_response(AdminTelemetryService(db).ai_quality_report(period_days=days))


@router.get("/ai-generations/{content_type}/{content_id}", response_model=ApiResponse[list[AIGenerationTraceRead]])
def ai_generation_trace(
    content_type: str,
    content_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AIGenerationTraceRead]]:
    return success_response(AdminTelemetryService(db).generation_trace(content_type=content_type, content_id=content_id))


@router.get("/content-versions/{content_type}/{content_id}", response_model=ApiResponse[list[ContentVersionRead]])
def content_versions(
    content_type: str,
    content_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[ContentVersionRead]]:
    versions = list_versions(db, content_type=content_type, content_id=content_id)
    return success_response([ContentVersionRead.model_validate(v) for v in versions])


@router.get("/user-activity", response_model=ApiResponse[UserActivityResponse])
def user_activity(
    days: int = Query(default=7, ge=1, le=30),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[UserActivityResponse]:
    return success_response(AdminTelemetryService(db).user_activity(period_days=days))


@router.post("/events", response_model=ApiResponse[None])
def track_event(
    payload: TrackEventRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[None]:
    AdminTelemetryService(db).track_event(
        user_id=current_user.id,
        event_type=payload.event_type,
        entity_id=payload.entity_id,
        entity_type=payload.entity_type,
        duration_ms=payload.duration_ms,
        meta=payload.meta,
    )
    return success_response(None, "Evento registrado.")


@router.get("/ai-games", response_model=ApiResponse[list[AIGeneratedGameRead]])
def list_ai_games(
    status: str | None = Query(default=None, pattern="^(pending|approved|rejected)$"),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AIGeneratedGameRead]]:
    return success_response(AdminGameReviewService(db).list_ai_games(status=status))


@router.post(
    "/ai-games/generate",
    response_model=ApiResponse[AIGeneratedGameRead],
    dependencies=[Depends(require_ai_rate_limit), Depends(require_ai_daily_quota("admin_game_generation"))],
)
def generate_game(
    payload: GenerateGameRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGeneratedGameRead]:
    game = AdminGameReviewService(db).generate_game(
        skill=payload.skill,
        category=payload.category,
        difficulty=payload.difficulty,
        count=payload.count,
        name=payload.name,
        admin_user_id=current_admin.id,
        idempotency_key=payload.idempotency_key,
    )
    return success_response(game, "Jogo gerado com sucesso.")


@router.post("/ai-games/{game_id}/review", response_model=ApiResponse[AIGeneratedGameRead])
def review_game(
    game_id: int,
    payload: ReviewGameRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGeneratedGameRead]:
    game = AdminGameReviewService(db).review_game(
        game_id,
        action=payload.action,
        notes=payload.notes,
        questions=[q.model_dump() for q in payload.questions] if payload.questions else None,
        name=payload.name,
        targets=payload.targets,
        reviewer_id=current_admin.id,
    )
    return success_response(game, "Jogo atualizado.")


@router.patch("/ai-games/{game_id}", response_model=ApiResponse[AIGeneratedGameRead])
def update_game(
    game_id: int,
    payload: UpdateGameRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGeneratedGameRead]:
    game = AdminGameReviewService(db).update_game(
        game_id,
        name=payload.name,
        questions=[q.model_dump() for q in payload.questions] if payload.questions else None,
        targets=payload.targets,
        admin_user_id=current_admin.id,
    )
    return success_response(game, "Jogo atualizado.")


@router.post("/ai-games/{game_id}/questions", response_model=ApiResponse[AIGeneratedGameRead])
def add_game_question(
    game_id: int,
    payload: AddGameQuestionRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGeneratedGameRead]:
    game = AdminGameReviewService(db).add_question(
        game_id,
        prompt=payload.prompt,
        options=payload.options,
        answer_index=payload.answer_index,
        explanation=payload.explanation,
        admin_user_id=current_admin.id,
    )
    return success_response(game, "Pergunta adicionada.")


@router.delete("/ai-games/{game_id}/questions/{question_id}", response_model=ApiResponse[AIGeneratedGameRead])
def remove_game_question(
    game_id: int,
    question_id: str,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGeneratedGameRead]:
    game = AdminGameReviewService(db).remove_question(game_id, question_id=question_id, admin_user_id=current_admin.id)
    return success_response(game, "Pergunta removida.")


@router.post("/ai-games/{game_id}/questions/reorder", response_model=ApiResponse[AIGeneratedGameRead])
def reorder_game_questions(
    game_id: int,
    payload: ReorderGameQuestionsRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGeneratedGameRead]:
    game = AdminGameReviewService(db).reorder_questions(game_id, question_ids=payload.question_ids, admin_user_id=current_admin.id)
    return success_response(game, "Perguntas reordenadas.")


@router.post(
    "/ai-games/{game_id}/questions/{question_id}/regenerate",
    response_model=ApiResponse[AIGeneratedGameRead],
    dependencies=[Depends(require_ai_rate_limit), Depends(require_ai_daily_quota("admin_game_question_regeneration"))],
)
def regenerate_game_question(
    game_id: int,
    question_id: str,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGeneratedGameRead]:
    game = AdminGameReviewService(db).regenerate_question(game_id, question_id=question_id, admin_user_id=current_admin.id)
    return success_response(game, "Pergunta regenerada.")


@router.post("/ai-games/{game_id}/archive", response_model=ApiResponse[AIGeneratedGameRead])
def archive_game(
    game_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGeneratedGameRead]:
    return success_response(AdminGameReviewService(db).archive_game(game_id), "Jogo arquivado.")


@router.post("/ai-games/{game_id}/unarchive", response_model=ApiResponse[AIGeneratedGameRead])
def unarchive_game(
    game_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGeneratedGameRead]:
    return success_response(AdminGameReviewService(db).unarchive_game(game_id), "Jogo restaurado.")


@router.delete("/ai-games/{game_id}", response_model=ApiResponse[AIGameActionResponse])
def delete_game(
    game_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGameActionResponse]:
    AdminGameReviewService(db).delete_game(game_id)
    return success_response(AIGameActionResponse(action="deleted", game_id=game_id), "Jogo excluido.")
