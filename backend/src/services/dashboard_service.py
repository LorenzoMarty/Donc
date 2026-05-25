from collections import Counter

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from src.models import Course, Essay, Exercise, ExerciseAnswer, Goal, Lesson, LessonProgress, MockExamAttempt, Module, User
from src.schemas.dashboard import DashboardResponse, GoalRead, MasteryPoint, PendingExercise, RecentExam, RecentLesson, TrendPoint


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, user_id: int) -> DashboardResponse:
        total_lessons = self.db.scalar(
            select(func.count(Lesson.id)).join(Lesson.module).join(Module.course).where(Course.slug == "destrave-redacao")
        ) or 0
        completed_lessons = self.db.scalar(
            select(func.count(LessonProgress.id))
            .join(LessonProgress.lesson)
            .join(Lesson.module)
            .join(Module.course)
            .where(LessonProgress.user_id == user_id, LessonProgress.completed.is_(True), Course.slug == "destrave-redacao")
        ) or 0
        answers = list(self.db.scalars(select(ExerciseAnswer).where(ExerciseAnswer.user_id == user_id)))
        correct_rate = int(sum(1 for answer in answers if answer.is_correct) / len(answers) * 100) if answers else 0
        essays = list(
            self.db.scalars(
                select(Essay)
                .options(selectinload(Essay.correction), selectinload(Essay.theme))
                .where(Essay.user_id == user_id)
                .order_by(Essay.created_at)
            )
        )
        corrected = [essay for essay in essays if essay.correction]
        essay_average = int(sum(essay.score or 0 for essay in corrected) / len(corrected)) if corrected else 0
        best_essay_score = max((essay.score or 0 for essay in corrected), default=0)
        mastery_map = self._mastery_map(corrected)
        recurrent_errors = self._recurrent_errors(corrected)
        progress_general = min(
            100,
            int(((completed_lessons / total_lessons) * 45 if total_lessons else 0) + min(len(corrected) * 8, 30) + correct_rate * 0.25),
        )

        all_lesson_progress = list(
            self.db.scalars(
                select(LessonProgress)
                .options(selectinload(LessonProgress.lesson).selectinload(Lesson.module))
                .join(LessonProgress.lesson)
                .join(Lesson.module)
                .join(Module.course)
                .where(LessonProgress.user_id == user_id, Course.slug == "destrave-redacao")
                .order_by(LessonProgress.updated_at.desc())
            )
        )
        lesson_progress = all_lesson_progress[:4]
        recent_lessons = [
            RecentLesson(
                id=item.lesson.id,
                title=item.lesson.title,
                module=item.lesson.module.title,
                progress_percent=item.progress_percent,
            )
            for item in lesson_progress
        ]

        progress_by_lesson = {item.lesson_id: item.progress_percent for item in all_lesson_progress}
        completed_lesson_ids = {item.lesson_id for item in all_lesson_progress if item.completed}
        suggested_lessons = self._suggest_lessons(completed_lesson_ids=completed_lesson_ids, progress_by_lesson=progress_by_lesson)

        answered_ids = {answer.exercise_id for answer in answers}
        pending_exercises = [
            PendingExercise(id=exercise.id, skill=exercise.skill, difficulty=exercise.difficulty.value)
            for exercise in self.db.scalars(
                select(Exercise)
                .join(Exercise.module)
                .join(Module.course)
                .where(~Exercise.id.in_(answered_ids), Course.slug == "destrave-redacao")
                .limit(5)
            )
        ]

        attempts = list(
            self.db.scalars(
                select(MockExamAttempt)
                .options(selectinload(MockExamAttempt.exam))
                .where(MockExamAttempt.user_id == user_id)
                .order_by(MockExamAttempt.finished_at.desc())
                .limit(3)
            )
        )
        recent_exams = [RecentExam(id=attempt.exam_id, title=attempt.exam.title, score=attempt.score) for attempt in attempts]

        goals = [
            GoalRead(id=goal.id, title=goal.title, current=goal.current, target=goal.target, unit=goal.unit, completed=goal.completed)
            for goal in self.db.scalars(select(Goal).where(Goal.user_id == user_id).limit(4))
        ]

        trend = [
            TrendPoint(label=essay.created_at.strftime("%d/%m"), score=essay.score or 0)
            for essay in corrected[-6:]
        ] or [
            TrendPoint(label="Semana 1", score=640),
            TrendPoint(label="Semana 2", score=720),
            TrendPoint(label="Semana 3", score=780),
        ]

        user_xp = 0
        user_level = 1
        streak = 0
        user = self.db.get(User, user_id)
        if user:
            user_xp = user.xp
            user_level = user.level
            streak = user.streak_days

        return DashboardResponse(
            progress_general=progress_general,
            essay_average=essay_average,
            best_essay_score=best_essay_score,
            streak_days=streak,
            xp=user_xp,
            level=user_level,
            completed_lessons=completed_lessons,
            correct_exercises_rate=correct_rate,
            essays_written=len(essays),
            mastery_map=mastery_map,
            recurrent_errors=recurrent_errors,
            trend=trend,
            recent_lessons=recent_lessons,
            pending_exercises=pending_exercises,
            recent_exams=recent_exams,
            suggested_lessons=suggested_lessons,
            goals=goals,
        )

    def _mastery_map(self, corrected: list[Essay]) -> list[MasteryPoint]:
        labels = {
            "C1": "Norma-padrao",
            "C2": "Tema e genero",
            "C3": "Argumentacao",
            "C4": "Coesao",
            "C5": "Intervencao",
        }
        fields = {
            "C1": "competency_1",
            "C2": "competency_2",
            "C3": "competency_3",
            "C4": "competency_4",
            "C5": "competency_5",
        }
        points: list[MasteryPoint] = []
        for competency, field in fields.items():
            value = int(sum(getattr(essay.correction, field) for essay in corrected) / len(corrected)) if corrected else 0
            points.append(MasteryPoint(competency=competency, label=labels[competency], value=value))
        return points

    def _recurrent_errors(self, corrected: list[Essay]) -> list[str]:
        counter: Counter[str] = Counter()
        for essay in corrected:
            correction = essay.correction
            if correction is None:
                continue
            for pattern in correction.recurrent_patterns or []:
                if pattern:
                    counter[pattern] += 2
            for error in correction.errors or []:
                if error:
                    counter[error] += 1
        if not counter:
            return [
                "Ainda faltam correcoes suficientes para detectar padroes.",
                "Envie novas redacoes para mapear erros recorrentes por competencia.",
            ]
        return [item for item, _ in counter.most_common(4)]

    def _suggest_lessons(self, *, completed_lesson_ids: set[int], progress_by_lesson: dict[int, int]) -> list[RecentLesson]:
        query = (
            select(Lesson)
            .options(selectinload(Lesson.module))
            .join(Lesson.module)
            .join(Module.course)
            .where(Course.slug == "destrave-redacao")
            .order_by(Module.order, Lesson.order)
            .limit(3)
        )
        if completed_lesson_ids:
            query = query.where(~Lesson.id.in_(completed_lesson_ids))
        return [
            RecentLesson(
                id=lesson.id,
                title=lesson.title,
                module=lesson.module.title,
                progress_percent=progress_by_lesson.get(lesson.id, 0),
            )
            for lesson in self.db.scalars(query)
        ]
