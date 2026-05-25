from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user
from src.models import User
from src.schemas.common import ApiResponse, success_response
from src.schemas.exercises import ExerciseRead, ExerciseSubmitRequest, ExerciseSubmitResponse
from src.services.exercise_service import ExerciseService


router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=ApiResponse[list[ExerciseRead]])
def list_exercises(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[list[ExerciseRead]]:
    return success_response(ExerciseService(db).list_exercises(current_user))


@router.post("/{exercise_id}/submit", response_model=ApiResponse[ExerciseSubmitResponse])
def submit_exercise(
    exercise_id: int,
    payload: ExerciseSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[dict[str, object]]:
    return success_response(ExerciseService(db).submit(user=current_user, exercise_id=exercise_id, selected_answer=payload.selected_answer))

