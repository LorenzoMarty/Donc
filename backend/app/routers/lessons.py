from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.lessons import LessonProgressRead, LessonProgressUpdate, LessonRead, SubjectRead
from app.services.lesson_service import LessonService


router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get("/subjects", response_model=list[SubjectRead])
def subjects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[SubjectRead]:
    return LessonService(db).list_subjects(current_user.id)


@router.get("/{lesson_id}", response_model=LessonRead)
def lesson(lesson_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> LessonRead:
    return LessonService(db).get_lesson(lesson_id, current_user.id)


@router.put("/{lesson_id}/progress", response_model=LessonProgressRead)
def update_progress(
    lesson_id: int,
    payload: LessonProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LessonProgressRead:
    return LessonService(db).update_progress(
        lesson_id,
        current_user.id,
        progress_percent=payload.progress_percent,
        last_position_seconds=payload.last_position_seconds,
        completed=payload.completed,
    )

