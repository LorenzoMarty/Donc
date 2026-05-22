from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Achievement, Course, Essay, Exercise, ExerciseAnswer, Goal, Lesson, LessonProgress, MockExamAttempt, Module, User, UserAchievement
from app.schemas.dashboard import AchievementRead, DashboardResponse, GoalRead, PendingExercise, RecentExam, RecentLesson, TrendPoint


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
                select(Essay).options(selectinload(Essay.correction), selectinload(Essay.theme)).where(Essay.user_id == user_id).order_by(Essay.created_at)
            )
        )
        corrected = [essay for essay in essays if essay.correction]
        essay_average = int(sum(essay.score or 0 for essay in corrected) / len(corrected)) if corrected else 0
        progress_general = min(
            100,
            int(((completed_lessons / total_lessons) * 45 if total_lessons else 0) + min(len(corrected) * 8, 30) + correct_rate * 0.25),
        )

        recent_progress = list(
            self.db.scalars(
                select(LessonProgress)
                .options(selectinload(LessonProgress.lesson).selectinload(Lesson.module))
                .join(LessonProgress.lesson)
                .join(Lesson.module)
                .join(Module.course)
                .where(LessonProgress.user_id == user_id, Course.slug == "destrave-redacao")
                .order_by(LessonProgress.updated_at.desc())
                .limit(4)
            )
        )
        recent_lessons = [
            RecentLesson(
                id=item.lesson.id,
                title=item.lesson.title,
                module=item.lesson.module.title,
                progress_percent=item.progress_percent,
            )
            for item in recent_progress
        ]

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
        achievements = [
            AchievementRead(
                id=earned.achievement.id,
                title=earned.achievement.title,
                description=earned.achievement.description,
                icon=earned.achievement.icon,
            )
            for earned in self.db.scalars(
                select(UserAchievement).options(selectinload(UserAchievement.achievement)).where(UserAchievement.user_id == user_id).limit(4)
            )
        ]
        if not achievements:
            achievements = [
                AchievementRead(id=item.id, title=item.title, description=item.description, icon=item.icon)
                for item in self.db.scalars(select(Achievement).limit(3))
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
            streak_days=streak,
            xp=user_xp,
            level=user_level,
            completed_lessons=completed_lessons,
            correct_exercises_rate=correct_rate,
            essays_written=len(essays),
            trend=trend,
            recent_lessons=recent_lessons,
            pending_exercises=pending_exercises,
            recent_exams=recent_exams,
            goals=goals,
            achievements=achievements,
        )
