from datetime import UTC, datetime

from sqlalchemy.orm import Session

from src.middlewares.errors import AppError
from src.models import MockExamAttempt, User
from src.repositories.exams import ExamRepository


class ExamService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = ExamRepository(db)

    def list_exams(self):
        return self.repo.list_exams()

    def submit(self, *, user: User, exam_id: int, answers: dict[str, str]) -> dict[str, object]:
        exam = self.repo.get_exam(exam_id)
        if not exam:
            raise AppError("Simulado nao encontrado.", status_code=404, code="exam_not_found")

        correct = 0
        performance: dict[str, int] = {}
        totals: dict[str, int] = {}
        for question in exam.questions:
            key = str(question.id)
            totals[question.skill] = totals.get(question.skill, 0) + 1
            if answers.get(key) == question.correct_answer:
                correct += 1
                performance[question.skill] = performance.get(question.skill, 0) + 1

        score = int(correct / len(exam.questions) * 100) if exam.questions else 0
        normalized = {skill: int(performance.get(skill, 0) / total * 100) for skill, total in totals.items()}
        finished_at = datetime.now(UTC)
        attempt = MockExamAttempt(user_id=user.id, exam_id=exam.id, answers=answers, score=score, finished_at=finished_at)
        user.xp += 80 + correct * 10
        user.level = max(user.level, user.xp // 250 + 1)
        self.db.add(attempt)
        self.db.commit()
        self.db.refresh(attempt)

        return {
            "attempt_id": attempt.id,
            "exam_id": exam.id,
            "score": score,
            "total_questions": len(exam.questions),
            "correct_answers": correct,
            "finished_at": finished_at,
            "performance_by_skill": normalized,
        }

