from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import Essay, EssayCorrection, ExerciseAnswer, Module
from src.services.competency_stats import mean_competency

MODULE_MIN_ACTIVITY_ACCURACY = 0.7
COMPETENCY_MASTERY_THRESHOLD = 160

_COMPETENCY_LABELS = {
    "c1": "C1",
    "c2": "C2",
    "c3": "C3",
    "c4": "C4",
    "c5": "C5",
}
_COMPETENCY_FIELDS = {
    "c1": "competency_1",
    "c2": "competency_2",
    "c3": "competency_3",
    "c4": "competency_4",
    "c5": "competency_5",
}


@dataclass
class MasteryState:
    lessons_done: bool
    activity_passed: bool
    competency_clear: bool
    weak_competencies: list[str]

    @property
    def mastered(self) -> bool:
        return self.lessons_done and self.activity_passed and self.competency_clear


class ProgressionService:
    """Computes module mastery and unlock state. Nothing here is persisted:
    unlock is derived from Module.order + mastery of the previous module."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def unlock_map(self, all_modules: list[Module], user_id: int) -> dict[int, bool]:
        modules = sorted(all_modules, key=lambda module: module.order)
        result: dict[int, bool] = {}
        unlocked = True
        for module in modules:
            result[module.id] = unlocked
            unlocked = unlocked and self.module_mastery(module, user_id).mastered
        return result

    def module_mastery(self, module: Module, user_id: int) -> MasteryState:
        lessons_done = self._lessons_done(module, user_id)
        activity_passed = self._activity_passed(module, user_id)
        weak_competencies = self._weak_competencies(module, user_id)
        return MasteryState(
            lessons_done=lessons_done,
            activity_passed=activity_passed,
            competency_clear=not weak_competencies,
            weak_competencies=weak_competencies,
        )

    def pending_requirements(self, state: MasteryState) -> list[str]:
        requirements: list[str] = []
        if not state.lessons_done:
            requirements.append("Conclua todas as aulas do modulo")
        if not state.activity_passed:
            requirements.append(f"Atinja {int(MODULE_MIN_ACTIVITY_ACCURACY * 100)}% de acerto na atividade do modulo")
        for competency in state.weak_competencies:
            requirements.append(f"Melhore a competencia {_COMPETENCY_LABELS[competency]}")
        return requirements

    def _lessons_done(self, module: Module, user_id: int) -> bool:
        lessons = list(module.lessons)
        if not lessons:
            return True
        lesson_ids = {lesson.id for lesson in lessons}
        return self._completed_lesson_ids(lesson_ids, user_id) == lesson_ids

    def _completed_lesson_ids(self, lesson_ids: set[int], user_id: int) -> set[int]:
        from src.models import LessonProgress

        if not lesson_ids:
            return set()
        return set(
            self.db.scalars(
                select(LessonProgress.lesson_id).where(
                    LessonProgress.user_id == user_id,
                    LessonProgress.lesson_id.in_(lesson_ids),
                    LessonProgress.completed.is_(True),
                )
            )
        )

    def _activity_passed(self, module: Module, user_id: int) -> bool:
        exercise_ids = [exercise.id for exercise in module.exercises]
        if not exercise_ids:
            return True

        answers = list(
            self.db.scalars(
                select(ExerciseAnswer)
                .where(ExerciseAnswer.user_id == user_id, ExerciseAnswer.exercise_id.in_(exercise_ids))
                .order_by(ExerciseAnswer.answered_at)
            )
        )
        if not answers:
            return False

        latest_by_exercise: dict[int, bool] = {}
        for answer in answers:
            latest_by_exercise[answer.exercise_id] = answer.is_correct

        if not latest_by_exercise:
            return False

        accuracy = sum(1 for is_correct in latest_by_exercise.values() if is_correct) / len(latest_by_exercise)
        return accuracy >= MODULE_MIN_ACTIVITY_ACCURACY

    def _weak_competencies(self, module: Module, user_id: int) -> list[str]:
        targets = module.target_competencies or []
        if not targets:
            return []

        corrected = list(
            self.db.scalars(
                select(EssayCorrection).join(Essay).where(Essay.user_id == user_id)
            )
        )
        if not corrected:
            # Graceful degradation: student without any corrected essay yet is not
            # blocked by the competency gate — only lessons + activity apply.
            return []

        weak: list[str] = []
        for competency in targets:
            field = _COMPETENCY_FIELDS.get(competency)
            if not field:
                continue
            average = mean_competency(corrected, field)
            if average < COMPETENCY_MASTERY_THRESHOLD:
                weak.append(competency)
        return weak
