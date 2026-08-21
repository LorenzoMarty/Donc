from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


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


class RecentEssay(BaseModel):
    id: int
    title: str
    theme_title: str
    status: str
    word_count: int
    score: int | None
    updated_at: datetime


class GoalRead(BaseModel):
    id: int
    title: str
    current: int
    target: int
    unit: str
    completed: bool
    due_date: date | None = None


class GoalCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    target: int = Field(default=1, ge=1, le=999)
    unit: str = Field(default="vez", min_length=1, max_length=40)


class GoalUpdateRequest(BaseModel):
    completed: bool | None = None
    current: int | None = Field(default=None, ge=0, le=999)


class MasteryPoint(BaseModel):
    competency: str
    label: str
    value: int


class NextActionRead(BaseModel):
    type: Literal["LESSON", "EXERCISE", "GAME", "ESSAY"]
    target_issue: str | None = None
    target: str | None = None
    reason: str
    estimated_minutes: int


class DashboardResponse(BaseModel):
    progress_general: int
    essay_average: int
    best_essay_score: int
    streak_days: int
    completed_lessons: int
    correct_exercises_rate: int
    essays_written: int
    exercises_answered: bool
    mastery_map: list[MasteryPoint]
    recurrent_errors: list[str]
    trend: list[TrendPoint]
    recent_lessons: list[RecentLesson]
    pending_exercises: list[PendingExercise]
    recent_essays: list[RecentEssay]
    suggested_lessons: list[RecentLesson]
    goals: list[GoalRead]
    next_action: NextActionRead

