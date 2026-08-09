from sqlalchemy.orm import Session

from src.memory.cognitive_issues import apply_cognitive_signal
from src.memory.profile import get_or_create_learning_profile
from src.middlewares.errors import AppError
from src.models import ExerciseAnswer, User
from src.repositories.learning import LearningRepository
from src.schemas.exercises import ExerciseRead


class ExerciseService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = LearningRepository(db)

    def list_exercises(self, user: User) -> list[ExerciseRead]:
        return [
            ExerciseRead(
                id=exercise.id,
                statement=exercise.statement,
                options=exercise.options,
                skill=exercise.skill,
                difficulty=exercise.difficulty.value,
                module_id=exercise.module_id,
                lesson_id=exercise.lesson_id,
            )
            for exercise in self.repo.list_exercises()
        ]

    def submit(self, *, user: User, exercise_id: int, selected_answer: str) -> dict[str, object]:
        exercise = self.repo.get_exercise(exercise_id)
        if not exercise:
            raise AppError("Exercício não encontrado.", status_code=404, code="exercise_not_found")

        is_correct = selected_answer == exercise.correct_answer
        answer = ExerciseAnswer(
            user_id=user.id,
            exercise_id=exercise.id,
            selected_answer=selected_answer,
            is_correct=is_correct,
        )
        self.db.add(answer)

        if exercise.targets:
            profile = get_or_create_learning_profile(self.db, user.id)
            issues = profile.cognitive_issues
            direction = "positive" if is_correct else "negative"
            for code in exercise.targets:
                issues = apply_cognitive_signal(issues, code, direction)
            profile.cognitive_issues = issues

        self.db.commit()

        return {
            "exercise_id": exercise.id,
            "selected_answer": selected_answer,
            "correct_answer": exercise.correct_answer,
            "is_correct": is_correct,
            "explanation": exercise.explanation,
        }

