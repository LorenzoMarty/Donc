from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user, require_admin
from src.models import User
from src.schemas.admin import (
    AdminContentActionResponse,
    AdminActivityCreateRequest,
    AdminActivityGenerateRequest,
    AdminActivityRead,
    AdminActivityUpdateRequest,
    AdminCourseCreateRequest,
    AdminCourseRead,
    AdminCourseUpdateRequest,
    AdminEssayThemeActionResponse,
    AdminEssayThemeGenerateRequest,
    AdminEssayThemeUpdateRequest,
    AdminLessonCreateRequest,
    AdminLessonRead,
    AdminLessonUpdateRequest,
    AdminModuleUpdateRequest,
    AdminMoveRequest,
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
from src.services.admin_service import AdminService
from src.utils.ai_security import contains_prompt_injection, sanitize_ai_text


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/metrics", response_model=ApiResponse[AdminMetricsResponse])
def metrics(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[AdminMetricsResponse]:
    return success_response(AdminService(db).metrics())


@router.get("/users", response_model=ApiResponse[list[AdminUserRead]])
def users(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[list[AdminUserRead]]:
    return success_response(AdminService(db).users_list())


@router.get("/content", response_model=ApiResponse[list[AdminCourseRead]])
def content(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[list[AdminCourseRead]]:
    return success_response(AdminService(db).content_tree())


@router.get("/essay-themes", response_model=ApiResponse[list[EssayThemeRead]])
def essay_themes(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[list[EssayThemeRead]]:
    return success_response(AdminService(db).list_essay_themes())


@router.post("/essay-themes/generate", response_model=ApiResponse[EssayThemeRead], status_code=201)
def generate_essay_theme(
    payload: AdminEssayThemeGenerateRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[EssayThemeRead]:
    focus = sanitize_ai_text(payload.focus or "", max_chars=160) or None
    if focus and contains_prompt_injection(focus):
        from src.middlewares.errors import AppError

        raise AppError("Entrada contem instrucoes indevidas para o agente.", status_code=422, code="prompt_injection_detected")
    requirements = {item.type: item.count for item in payload.supporting_text_requirements if item.count > 0}
    return success_response(
        AdminService(db).generate_essay_theme(
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
        AdminService(db).update_essay_theme(
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
    AdminService(db).delete_essay_theme(theme_id=theme_id)
    return success_response(AdminEssayThemeActionResponse(action="deleted", theme_id=theme_id), "Tema excluido.")


@router.post("/courses", response_model=ApiResponse[AdminCourseRead], status_code=201)
def create_course(
    payload: AdminCourseCreateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminCourseRead]:
    return success_response(
        AdminService(db).create_course(
            title=payload.title,
            slug=payload.slug,
            description=payload.description,
            color=payload.color,
        ),
        "Curso criado.",
    )


@router.post("/courses/{course_id}/modules", response_model=ApiResponse[AdminModuleRead], status_code=201)
def create_module(
    course_id: int,
    payload: AdminModuleCreateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminModuleRead]:
    return success_response(
        AdminService(db).create_module(
            course_id=course_id,
            title=payload.title,
            description=payload.description,
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
        AdminService(db).create_lesson(
            module_id=module_id,
            title=payload.title,
            description=payload.description,
            thumbnail_url=payload.thumbnail_url,
            video_url=payload.video_url,
            summary=payload.summary,
            duration_minutes=payload.duration_minutes,
            order=payload.order,
        ),
        "Aula criada.",
    )


@router.post("/modules/{module_id}/activities", response_model=ApiResponse[AdminCourseRead], status_code=201)
def create_activity(
    module_id: int,
    payload: AdminActivityCreateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminCourseRead]:
    return success_response(
        AdminService(db).create_activity(
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
        ),
        "Atividade criada.",
    )


@router.post("/modules/{module_id}/activities/generate", response_model=ApiResponse[list[AdminActivityRead]])
def generate_activity_draft(
    module_id: int,
    payload: AdminActivityGenerateRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AdminActivityRead]]:
    return success_response(
        AdminService(db).generate_activity_drafts(
            module_id=module_id,
            lesson_ids=payload.lesson_ids,
            difficulty=payload.difficulty,
            count=payload.count,
            focus=payload.focus,
            admin_user_id=current_admin.id,
        ),
        "Atividade gerada para revisão.",
    )


@router.patch("/courses/{course_id}", response_model=ApiResponse[AdminCourseRead])
def update_course(
    course_id: int,
    payload: AdminCourseUpdateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminCourseRead]:
    return success_response(
        AdminService(db).update_course(
            course_id=course_id,
            title=payload.title,
            description=payload.description,
            color=payload.color,
        ),
        "Curso atualizado.",
    )


@router.delete("/courses/{course_id}", response_model=ApiResponse[AdminContentActionResponse])
def delete_course(
    course_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminContentActionResponse]:
    AdminService(db).delete_course(course_id=course_id)
    return success_response(AdminContentActionResponse(action="deleted", id=course_id, kind="course"), "Curso excluido.")


@router.patch("/modules/{module_id}", response_model=ApiResponse[AdminCourseRead])
def update_module(
    module_id: int,
    payload: AdminModuleUpdateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminCourseRead]:
    return success_response(
        AdminService(db).update_module(module_id=module_id, title=payload.title, description=payload.description),
        "Modulo atualizado.",
    )


@router.delete("/modules/{module_id}", response_model=ApiResponse[AdminCourseRead])
def delete_module(
    module_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminCourseRead]:
    return success_response(AdminService(db).delete_module(module_id=module_id), "Modulo excluido.")


@router.post("/modules/{module_id}/move", response_model=ApiResponse[AdminCourseRead])
def move_module(
    module_id: int,
    payload: AdminMoveRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminCourseRead]:
    return success_response(AdminService(db).move_module(module_id=module_id, direction=payload.direction), "Ordem atualizada.")


@router.patch("/lessons/{lesson_id}", response_model=ApiResponse[AdminCourseRead])
def update_lesson(
    lesson_id: int,
    payload: AdminLessonUpdateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminCourseRead]:
    return success_response(
        AdminService(db).update_lesson(
            lesson_id=lesson_id,
            title=payload.title,
            description=payload.description,
            summary=payload.summary,
            thumbnail_url=payload.thumbnail_url,
            video_url=payload.video_url,
            duration_minutes=payload.duration_minutes,
        ),
        "Aula atualizada.",
    )


@router.delete("/lessons/{lesson_id}", response_model=ApiResponse[AdminCourseRead])
def delete_lesson(
    lesson_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminCourseRead]:
    return success_response(AdminService(db).delete_lesson(lesson_id=lesson_id), "Aula excluida.")


@router.post("/lessons/{lesson_id}/move", response_model=ApiResponse[AdminCourseRead])
def move_lesson(
    lesson_id: int,
    payload: AdminMoveRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminCourseRead]:
    return success_response(AdminService(db).move_lesson(lesson_id=lesson_id, direction=payload.direction), "Ordem atualizada.")


@router.patch("/activities/{activity_id}", response_model=ApiResponse[AdminCourseRead])
def update_activity(
    activity_id: int,
    payload: AdminActivityUpdateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminCourseRead]:
    return success_response(
        AdminService(db).update_activity(
            activity_id=activity_id,
            statement=payload.statement,
            options=payload.options,
            correct_answer=payload.correct_answer,
            explanation=payload.explanation,
            skill=payload.skill,
            difficulty=payload.difficulty,
            lesson_id=payload.lesson_id,
            base_lesson_ids=payload.base_lesson_ids,
        ),
        "Atividade atualizada.",
    )


@router.delete("/activities/{activity_id}", response_model=ApiResponse[AdminCourseRead])
def delete_activity(
    activity_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminCourseRead]:
    return success_response(AdminService(db).delete_activity(activity_id=activity_id), "Atividade excluida.")


@router.post("/module-items/{item_id}/move", response_model=ApiResponse[AdminCourseRead])
def move_module_item(
    item_id: int,
    payload: AdminMoveRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminCourseRead]:
    return success_response(AdminService(db).move_module_item(item_id=item_id, direction=payload.direction), "Ordem atualizada.")


@router.get("/users/{user_id}/detail", response_model=ApiResponse[AdminUserDetailResponse])
def user_detail(
    user_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminUserDetailResponse]:
    return success_response(AdminService(db).user_detail(user_id))


@router.patch("/users/{user_id}", response_model=ApiResponse[AdminUserRead])
def update_user(
    user_id: int,
    payload: AdminUserUpdateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminUserRead]:
    return success_response(
        AdminService(db).update_student(
            user_id=user_id,
            name=payload.name,
            xp=payload.xp,
            level=payload.level,
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
    AdminService(db).delete_student(user_id=user_id, admin_user_id=current_admin.id)
    return success_response(AdminUserActionResponse(action="deleted", user_id=user_id), "Aluno excluido.")


@router.get("/ai-telemetry", response_model=ApiResponse[AITelemetryResponse])
def ai_telemetry(
    days: int = Query(default=30, ge=1, le=90),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AITelemetryResponse]:
    return success_response(AdminService(db).ai_telemetry(period_days=days))


@router.get("/user-activity", response_model=ApiResponse[UserActivityResponse])
def user_activity(
    days: int = Query(default=7, ge=1, le=30),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[UserActivityResponse]:
    return success_response(AdminService(db).user_activity(period_days=days))


@router.post("/events", response_model=ApiResponse[None])
def track_event(
    payload: TrackEventRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[None]:
    AdminService(db).track_event(
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
    return success_response(AdminService(db).list_ai_games(status=status))


@router.post("/ai-games/generate", response_model=ApiResponse[AIGeneratedGameRead])
def generate_game(
    payload: GenerateGameRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGeneratedGameRead]:
    game = AdminService(db).generate_game(
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
    game = AdminService(db).review_game(
        game_id,
        action=payload.action,
        notes=payload.notes,
        questions=[q.model_dump() for q in payload.questions] if payload.questions else None,
        name=payload.name,
        xp_reward=payload.xp_reward,
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
    game = AdminService(db).update_game(
        game_id,
        name=payload.name,
        xp_reward=payload.xp_reward,
        questions=[q.model_dump() for q in payload.questions] if payload.questions else None,
    )
    return success_response(game, "Jogo atualizado.")


@router.delete("/ai-games/{game_id}", response_model=ApiResponse[AIGameActionResponse])
def delete_game(
    game_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AIGameActionResponse]:
    AdminService(db).delete_game(game_id)
    return success_response(AIGameActionResponse(action="deleted", game_id=game_id), "Jogo excluido.")
