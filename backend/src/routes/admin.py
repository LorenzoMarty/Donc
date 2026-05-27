from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user, require_admin
from src.models import User
from src.schemas.admin import (
    AdminMetricsResponse,
    AdminUserRead,
    AIGeneratedGameRead,
    AITelemetryResponse,
    GenerateGameRequest,
    ReviewGameRequest,
    TrackEventRequest,
    UserActivityResponse,
)
from src.schemas.common import ApiResponse, success_response
from src.services.admin_service import AdminService


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/metrics", response_model=ApiResponse[AdminMetricsResponse])
def metrics(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[AdminMetricsResponse]:
    return success_response(AdminService(db).metrics())


@router.get("/users", response_model=ApiResponse[list[AdminUserRead]])
def users(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[list[AdminUserRead]]:
    return success_response(AdminService(db).users_list())


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
