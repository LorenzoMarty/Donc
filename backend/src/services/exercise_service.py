from sqlalchemy.orm import Session

from src.middlewares.errors import AppError
from src.models import Difficulty, ExerciseAnswer, User
from src.repositories.learning import LearningRepository
from src.schemas.exercises import ExerciseRead


class ExerciseService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = LearningRepository(db)

    def list_exercises(self) -> list[ExerciseRead]:
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
        user.level = max(user.level, user.xp // 250 + 1)
        self.db.add(answer)
        self.db.commit()

        next_difficulty = Difficulty.HARD.value if is_correct and exercise.difficulty != Difficulty.HARD else Difficulty.MEDIUM.value
        if not is_correct:
            next_difficulty = Difficulty.EASY.value

        return {
            "exercise_id": exercise.id,
            "selected_answer": selected_answer,
            "correct_answer": exercise.correct_answer,
            "is_correct": is_correct,
            "explanation": exercise.explanation,
            "next_difficulty": next_difficulty,
            "xp_earned": xp_earned,
        }

