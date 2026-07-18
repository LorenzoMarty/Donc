from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user
from src.models import User
from src.schemas.common import ApiResponse, success_response
from src.schemas.lessons import LessonProgressRead, LessonProgressUpdate, LessonRead, ModuleRead
from src.services.lesson_service import LessonService


router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get("/modules", response_model=ApiResponse[list[ModuleRead]])
def modules(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[list[ModuleRead]]:
    return success_response(LessonService(db).list_modules(current_user.id))


@router.get("/{lesson_id}", response_model=ApiResponse[LessonRead])
def lesson(lesson_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[LessonRead]:
    return success_response(LessonService(db).get_lesson(lesson_id, current_user.id))


@router.put("/{lesson_id}/progress", response_model=ApiResponse[LessonProgressRead])
def update_progress(
    lesson_id: int,
    payload: LessonProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[LessonProgressRead]:
    return success_response(LessonService(db).update_progress(
        lesson_id,
        current_user.id,
        progress_percent=payload.progress_percent,
        last_position_seconds=payload.last_position_seconds,
        completed=payload.completed,
    ))
