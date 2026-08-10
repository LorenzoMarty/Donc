from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user, require_admin
from src.models import User
from src.schemas.admin import (
    AdminContentActionResponse,
    AdminContentQualityResponse,
    AdminActivityCreateRequest,
    AdminActivityGenerateRequest,
    AdminActivityRead,
    AdminActivityUpdateRequest,
    AdminEssayThemeActionResponse,
    AdminEssayThemeGenerateRequest,
    AdminEssayThemeUpdateRequest,
    AdminLessonCreateRequest,
    AdminLessonRead,
    AdminLessonUpdateRequest,
    AdminModuleUpdateRequest,
    AdminMoveRequest,
    AdminPedagogicalMetricsResponse,
    AdminUserActionResponse,
    AdminUserDetailResponse,
    AdminMetricsResponse,
    AdminModuleCreateRequest,
    AdminModuleRead,
    AdminUserRead,
    AdminUserUpdateRequest,
    AIGameActionResponse,
    AIGeneratedGameRead,
    AITelemetryResponse,
    GenerateGameRequest,
    ReviewGameRequest,
    TrackEventRequest,
    UpdateGameRequest,
    UserActivityResponse,
)
from src.schemas.common import ApiResponse, success_response
from src.schemas.essays import EssayThemeRead
from src.services.admin_content_quality_service import AdminContentQualityService
from src.services.admin_content_service import AdminContentService
from src.services.admin_game_review_service import AdminGameReviewService
from src.services.admin_metrics_service import AdminMetricsService
from src.services.admin_pedagogical_metrics_service import AdminPedagogicalMetricsService
from src.services.admin_telemetry_service import AdminTelemetryService
from src.services.admin_user_service import AdminUserService
from src.utils.ai_security import contains_prompt_injection, sanitize_ai_text
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


@router.get("/pedagogical-metrics", response_model=ApiResponse[AdminPedagogicalMetricsResponse])
def pedagogical_metrics(
    _: User = Depends(require_admin), db: Session = Depends(get_db)
) -> ApiResponse[AdminPedagogicalMetricsResponse]:
    return success_response(AdminPedagogicalMetricsService(db).report())


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
    dependencies=[Depends(require_ai_rate_limit)],
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
        ),
        "Tema gerado.",
    )


@router.patch("/essay-themes/{theme_id}", response_model=ApiResponse[EssayThemeRead])
def update_essay_theme(
    theme_id: int,
    payload: AdminEssayThemeUpdateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[EssayThemeRead]:
    return success_response(
        AdminContentService(db).update_essay_theme(
            theme_id=theme_id,
            title=payload.title,
            context=payload.context,
            supporting_texts=[item.model_dump() for item in payload.supporting_texts] if payload.supporting_texts is not None else None,
        ),
        "Tema atualizado.",
    )


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
    response_model=ApiResponse[list[AdminActivityRead]],
    dependencies=[Depends(require_ai_rate_limit)],
)
def generate_activity_draft(
    module_id: int,
    payload: AdminActivityGenerateRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminActivityRead]]:
    return success_response(
        AdminContentService(db).generate_activity_drafts(
            module_id=module_id,
            lesson_ids=payload.lesson_ids,
            difficulty=payload.difficulty,
            count=payload.count,
            focus=payload.focus,
            admin_user_id=current_admin.id,
        ),
        "Atividade gerada para revisão.",
    )


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
    _: User = Depends(require_admin),
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
    dependencies=[Depends(require_ai_rate_limit)],
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
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGeneratedGameRead]:
    game = AdminGameReviewService(db).update_game(
        game_id,
        name=payload.name,
        questions=[q.model_dump() for q in payload.questions] if payload.questions else None,
        targets=payload.targets,
    )
    return success_response(game, "Jogo atualizado.")


@router.delete("/ai-games/{game_id}", response_model=ApiResponse[AIGameActionResponse])
def delete_game(
    game_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGameActionResponse]:
    AdminGameReviewService(db).delete_game(game_id)
    return success_response(AIGameActionResponse(action="deleted", game_id=game_id), "Jogo excluido.")
