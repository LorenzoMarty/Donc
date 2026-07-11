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
            "questions": self._question_reviews(exam.questions, answers),
        }

    def list_attempts(self, user_id: int) -> list[dict[str, object]]:
        attempts = self.repo.list_attempts(user_id)
        return [
            {
                "attempt_id": attempt.id,
                "exam_id": attempt.exam_id,
                "exam_title": attempt.exam.title if attempt.exam else "Simulado",
                "score": attempt.score,
                "total_questions": len(attempt.exam.questions) if attempt.exam else 0,
                "correct_answers": round(attempt.score / 100 * len(attempt.exam.questions)) if attempt.exam and attempt.exam.questions else 0,
                "finished_at": attempt.finished_at,
            }
            for attempt in attempts
        ]

    def get_attempt_detail(self, *, attempt_id: int, user_id: int) -> dict[str, object]:
        attempt = self.repo.get_attempt(attempt_id, user_id)
        if not attempt or not attempt.exam:
            raise AppError("Tentativa nao encontrada.", status_code=404, code="exam_attempt_not_found")

        exam = attempt.exam
        correct = sum(1 for q in exam.questions if attempt.answers.get(str(q.id)) == q.correct_answer)
        performance: dict[str, int] = {}
        totals: dict[str, int] = {}
        for question in exam.questions:
            totals[question.skill] = totals.get(question.skill, 0) + 1
            if attempt.answers.get(str(question.id)) == question.correct_answer:
                performance[question.skill] = performance.get(question.skill, 0) + 1
        normalized = {skill: int(performance.get(skill, 0) / total * 100) for skill, total in totals.items()}

        return {
            "attempt_id": attempt.id,
            "exam_id": exam.id,
            "score": attempt.score,
            "total_questions": len(exam.questions),
            "correct_answers": correct,
            "finished_at": attempt.finished_at,
            "performance_by_skill": normalized,
            "questions": self._question_reviews(exam.questions, attempt.answers),
        }

    def _question_reviews(self, questions, answers: dict[str, str]) -> list[dict[str, object]]:
        return [
            {
                "id": question.id,
                "statement": question.statement,
                "options": question.options,
                "skill": question.skill,
                "correct_answer": question.correct_answer,
                "explanation": question.explanation,
                "user_answer": answers.get(str(question.id)),
                "correct": answers.get(str(question.id)) == question.correct_answer,
            }
            for question in questions
        ]
