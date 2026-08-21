from collections import Counter
from datetime import date, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, load_only, selectinload

from src.memory.profile import get_or_create_learning_profile
from src.models import Essay, EssayStatus, Exercise, ExerciseAnswer, Goal, Lesson, LessonProgress, Module, User
from src.middlewares.errors import AppError
from src.schemas.dashboard import DashboardResponse, GoalRead, MasteryPoint, NextActionRead, PendingExercise, RecentEssay, RecentLesson, TrendPoint
from src.services.recommendation_service import RecommendationEngine


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, user_id: int) -> DashboardResponse:
        user = self.db.get(User, user_id)
        total_lessons = self.db.scalar(select(func.count(Lesson.id))) or 0
        completed_lessons = self.db.scalar(
            select(func.count(LessonProgress.id)).where(
                LessonProgress.user_id == user_id, LessonProgress.completed.is_(True)
            )
        ) or 0
        answers = list(self.db.scalars(select(ExerciseAnswer).where(ExerciseAnswer.user_id == user_id)))
        correct_rate = int(sum(1 for answer in answers if answer.is_correct) / len(answers) * 100) if answers else 0
        essays = list(
            self.db.scalars(
                select(Essay)
                .options(
                    load_only(Essay.id, Essay.title, Essay.status, Essay.word_count, Essay.score, Essay.created_at, Essay.updated_at),
                    selectinload(Essay.correction),
                    selectinload(Essay.theme),
                )
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
                .where(
                    LessonProgress.user_id == user_id,
                    or_(
                        LessonProgress.progress_percent > 0,
                        LessonProgress.last_position_seconds > 0,
                        LessonProgress.completed.is_(True),
                    ),
                )
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
                select(Exercise).where(~Exercise.id.in_(answered_ids), Exercise.archived.is_(False)).limit(5)
            )
        ]

        recent_essays = [
            RecentEssay(
                id=essay.id,
                title=essay.title,
                theme_title=essay.theme.title,
                status=essay.status.value if hasattr(essay.status, "value") else str(essay.status),
                word_count=essay.word_count,
                score=essay.score,
                updated_at=essay.updated_at,
            )
            for essay in sorted(essays, key=lambda item: item.updated_at, reverse=True)
            if essay.status != EssayStatus.DRAFT or essay.word_count > 0
        ][:5]

        goals = [
            GoalRead(
                id=goal.id,
                title=goal.title,
                current=goal.current,
                target=goal.target,
                unit=goal.unit,
                completed=goal.completed,
                due_date=goal.due_date,
            )
            for goal in self.db.scalars(
                select(Goal)
                .where(
                    Goal.user_id == user_id,
                    Goal.due_date >= self._week_start(),
                    Goal.due_date <= self._week_end(),
                )
                .order_by(Goal.completed, Goal.id.desc())
                .limit(6)
            )
        ]

        trend = [
            TrendPoint(label=essay.created_at.strftime("%d/%m"), score=essay.score or 0)
            for essay in corrected[-6:]
        ]

        streak = user.streak_days if user else 0

        profile = get_or_create_learning_profile(self.db, user_id)
        next_action = RecommendationEngine(self.db).recommend(profile, user_id=user_id)[0]

        return DashboardResponse(
            progress_general=progress_general,
            essay_average=essay_average,
            best_essay_score=best_essay_score,
            streak_days=streak,
            completed_lessons=completed_lessons,
            correct_exercises_rate=correct_rate,
            essays_written=len(essays),
            exercises_answered=len(answers) > 0,
            mastery_map=mastery_map,
            recurrent_errors=recurrent_errors,
            trend=trend,
            recent_lessons=recent_lessons,
            pending_exercises=pending_exercises,
            recent_essays=recent_essays,
            suggested_lessons=suggested_lessons,
            goals=goals,
            next_action=NextActionRead(
                type=next_action.type,
                target_issue=next_action.target_issue,
                target=next_action.target,
                reason=next_action.reason,
                estimated_minutes=next_action.estimated_minutes,
            ),
        )

    def create_goal(self, *, user_id: int, title: str, target: int, unit: str) -> GoalRead:
        goal = Goal(
            user_id=user_id,
            title=title.strip(),
            target=target,
            current=0,
            unit=unit.strip() or "vez",
            due_date=self._week_end(),
            completed=False,
        )
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return self._goal_read(goal)

    def update_goal(self, *, goal_id: int, user_id: int, completed: bool | None = None, current: int | None = None) -> GoalRead:
        goal = self._get_goal(goal_id=goal_id, user_id=user_id)
        if current is not None:
            goal.current = min(current, goal.target)
            goal.completed = goal.current >= goal.target
        if completed is not None:
            goal.completed = completed
            goal.current = goal.target if completed else 0
        self.db.commit()
        self.db.refresh(goal)
        return self._goal_read(goal)

    def delete_goal(self, *, goal_id: int, user_id: int) -> None:
        goal = self._get_goal(goal_id=goal_id, user_id=user_id)
        self.db.delete(goal)
        self.db.commit()

    def _get_goal(self, *, goal_id: int, user_id: int) -> Goal:
        goal = self.db.get(Goal, goal_id)
        if not goal or goal.user_id != user_id:
            raise AppError("Desafio não encontrado.", status_code=404, code="goal_not_found")
        return goal

    def _goal_read(self, goal: Goal) -> GoalRead:
        return GoalRead(
            id=goal.id,
            title=goal.title,
            current=goal.current,
            target=goal.target,
            unit=goal.unit,
            completed=goal.completed,
            due_date=goal.due_date,
        )

    def _week_start(self) -> date:
        today = date.today()
        return today - timedelta(days=today.weekday())

    def _week_end(self) -> date:
        return self._week_start() + timedelta(days=6)

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
                "Ainda faltam correções suficientes para detectar padrões.",
                "Envie novas redações para mapear erros recorrentes por competência.",
            ]
        return [item for item, _ in counter.most_common(4)]

    def _suggest_lessons(self, *, completed_lesson_ids: set[int], progress_by_lesson: dict[int, int]) -> list[RecentLesson]:
        query = (
            select(Lesson)
            .options(selectinload(Lesson.module))
            .join(Lesson.module)
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
