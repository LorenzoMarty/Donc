from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user
from src.models import User
from src.schemas.common import ApiResponse, success_response
from src.schemas.exams import MockExamRead, MockExamSubmitRequest, MockExamSubmitResponse
from src.services.exam_service import ExamService


router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("", response_model=ApiResponse[list[MockExamRead]])
def exams(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return success_response(ExamService(db).list_exams())


@router.post("/{exam_id}/submit", response_model=ApiResponse[MockExamSubmitResponse])
def submit_exam(
    exam_id: int,
    payload: MockExamSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return success_response(ExamService(db).submit(user=current_user, exam_id=exam_id, answers=payload.answers))
