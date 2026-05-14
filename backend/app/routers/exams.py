from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.exams import MockExamRead, MockExamSubmitRequest, MockExamSubmitResponse
from app.services.exam_service import ExamService


router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("", response_model=list[MockExamRead])
def exams(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ExamService(db).list_exams()


@router.post("/{exam_id}/submit", response_model=MockExamSubmitResponse)
def submit_exam(
    exam_id: int,
    payload: MockExamSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ExamService(db).submit(user=current_user, exam_id=exam_id, answers=payload.answers)

