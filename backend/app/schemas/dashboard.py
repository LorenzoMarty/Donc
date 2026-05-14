from pydantic import BaseModel


class TrendPoint(BaseModel):
    label: str
    score: int


class RecentLesson(BaseModel):
    id: int
    title: str
    module: str
    progress_percent: int


class PendingExercise(BaseModel):
    id: int
    skill: str
    difficulty: str


class RecentExam(BaseModel):
    id: int
    title: str
    score: int


class GoalRead(BaseModel):
    id: int
    title: str
    current: int
    target: int
    unit: str
    completed: bool


class AchievementRead(BaseModel):
    id: int
    title: str
    description: str
    icon: str


class DashboardResponse(BaseModel):
    progress_general: int
    essay_average: int
    streak_days: int
    xp: int
    level: int
    completed_lessons: int
    correct_exercises_rate: int
    essays_written: int
    trend: list[TrendPoint]
    recent_lessons: list[RecentLesson]
    pending_exercises: list[PendingExercise]
    recent_exams: list[RecentExam]
    goals: list[GoalRead]
    achievements: list[AchievementRead]

