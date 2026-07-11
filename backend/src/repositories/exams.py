from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.models import MockExam, MockExamAttempt


class ExamRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_exams(self) -> list[MockExam]:
        return list(self.db.scalars(select(MockExam).options(selectinload(MockExam.questions)).order_by(MockExam.id)))

    def get_exam(self, exam_id: int) -> MockExam | None:
        stmt = select(MockExam).options(selectinload(MockExam.questions)).where(MockExam.id == exam_id)
        return self.db.scalar(stmt)

    def list_attempts(self, user_id: int) -> list[MockExamAttempt]:
        stmt = (
            select(MockExamAttempt)
            .options(selectinload(MockExamAttempt.exam))
            .where(MockExamAttempt.user_id == user_id)
            .order_by(MockExamAttempt.started_at.desc())
        )
        return list(self.db.scalars(stmt))

    def get_attempt(self, attempt_id: int, user_id: int) -> MockExamAttempt | None:
        stmt = (
            select(MockExamAttempt)
            .options(selectinload(MockExamAttempt.exam).selectinload(MockExam.questions))
            .where(MockExamAttempt.id == attempt_id, MockExamAttempt.user_id == user_id)
        )
        return self.db.scalar(stmt)

