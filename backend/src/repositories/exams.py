from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.models import MockExam


class ExamRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_exams(self) -> list[MockExam]:
        return list(self.db.scalars(select(MockExam).options(selectinload(MockExam.questions)).order_by(MockExam.id)))

    def get_exam(self, exam_id: int) -> MockExam | None:
        stmt = select(MockExam).options(selectinload(MockExam.questions)).where(MockExam.id == exam_id)
        return self.db.scalar(stmt)

