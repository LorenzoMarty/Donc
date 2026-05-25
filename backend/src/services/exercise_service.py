from sqlalchemy.orm import Session

from src.middlewares.errors import AppError
from src.models import ExerciseAnswer, User
from src.repositories.learning import LearningRepository
from src.schemas.exercises import ExerciseRead
from src.services.rank_service import allowed_difficulties_for_user, level_for_xp, next_difficulty_after_answer


class ExerciseService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = LearningRepository(db)

    def list_exercises(self, user: User) -> list[ExerciseRead]:
        allowed_difficulties = set(allowed_difficulties_for_user(user))
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
            if exercise.difficulty in allowed_difficulties
        ]

    def submit(self, *, user: User, exercise_id: int, selected_answer: str) -> dict[str, object]:
        exercise = self.repo.get_exercise(exercise_id)
        if not exercise:
            raise AppError("Exercicio nao encontrado.", status_code=404, code="exercise_not_found")

        is_correct = selected_answer == exercise.correct_answer
        xp_earned = 18 if is_correct else 5
        answer = ExerciseAnswer(
            user_id=user.id,
            exercise_id=exercise.id,
            selected_answer=selected_answer,
            is_correct=is_correct,
        )
        user.xp += xp_earned
        user.level = max(user.level, level_for_xp(user.xp))
        self.db.add(answer)
        self.db.commit()

        next_difficulty = next_difficulty_after_answer(current=exercise.difficulty, is_correct=is_correct, xp=user.xp)

        return {
            "exercise_id": exercise.id,
            "selected_answer": selected_answer,
            "correct_answer": exercise.correct_answer,
            "is_correct": is_correct,
            "explanation": exercise.explanation,
            "next_difficulty": next_difficulty.value,
            "xp_earned": xp_earned,
        }

