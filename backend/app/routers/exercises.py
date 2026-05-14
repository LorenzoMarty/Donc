from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.exercises import ExerciseRead, ExerciseSubmitRequest, ExerciseSubmitResponse
from app.services.exercise_service import ExerciseService


router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseRead])
def list_exercises(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[ExerciseRead]:
    return ExerciseService(db).list_exercises()


@router.post("/{exercise_id}/submit", response_model=ExerciseSubmitResponse)
def submit_exercise(
    exercise_id: int,
    payload: ExerciseSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    return ExerciseService(db).submit(user=current_user, exercise_id=exercise_id, selected_answer=payload.selected_answer)

