from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user
from src.models import User
from src.schemas.common import ApiResponse, MessageResponse, success_response
from src.schemas.dashboard import DashboardResponse, GoalCreateRequest, GoalRead, GoalUpdateRequest
from src.services.dashboard_service import DashboardService


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=ApiResponse[DashboardResponse])
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[DashboardResponse]:
    return success_response(DashboardService(db).get(current_user.id))


@router.post("/challenges", response_model=ApiResponse[GoalRead], status_code=201)
def create_challenge(
    payload: GoalCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[GoalRead]:
    return success_response(
        DashboardService(db).create_goal(user_id=current_user.id, title=payload.title, target=payload.target, unit=payload.unit),
        "Desafio semanal criado.",
    )


@router.patch("/challenges/{goal_id}", response_model=ApiResponse[GoalRead])
def update_challenge(
    goal_id: int,
    payload: GoalUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[GoalRead]:
    return success_response(
        DashboardService(db).update_goal(goal_id=goal_id, user_id=current_user.id, completed=payload.completed, current=payload.current),
        "Desafio atualizado.",
    )


@router.delete("/challenges/{goal_id}", response_model=ApiResponse[MessageResponse])
def delete_challenge(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[MessageResponse]:
    DashboardService(db).delete_goal(goal_id=goal_id, user_id=current_user.id)
    return success_response(MessageResponse(message="Desafio excluido."), "Desafio excluido.")
