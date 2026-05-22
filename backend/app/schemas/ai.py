from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.agents.schemas import DifficultyLevel


class AICorrectRequest(BaseModel):
    essay_id: int = Field(gt=0)
    async_mode: bool = False


class AIJobResponse(BaseModel):
    job_id: str
    status: str
    kind: str = "essay_correction"
    result: dict | None = None
    error: str | None = None


class AIGenerateExerciseRequest(BaseModel):
    focus: str | None = Field(default=None, max_length=160)
    difficulty: DifficultyLevel = "medium"
    count: int = Field(default=3, ge=1, le=5)


class AIAnalyzeRequest(BaseModel):
    include_history: bool = True


class AIRecommendRequest(BaseModel):
    context: str | None = Field(default=None, max_length=1000)


class AIStudyPlanRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=30)
    minutes_per_day: int = Field(default=45, ge=10, le=180)
    intensity: Literal["leve", "normal", "intenso"] = "normal"

