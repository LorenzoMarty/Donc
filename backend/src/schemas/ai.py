from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from src.agents.schemas import DifficultyLevel


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


class AIEvaluateRewriteRequest(BaseModel):
    original: str = Field(min_length=3, max_length=800, description="Trecho original/degradado.")
    rewritten: str = Field(min_length=1, max_length=800, description="Reescrita do aluno.")
    criteria: str | None = Field(default=None, max_length=240, description="Criterio pedagogico avaliado.")


class CognitiveIssueRead(BaseModel):
    state: Literal["DETECTED", "TRAINING", "IMPROVING", "MASTERED"]
    negative_count: int = 0
    positive_streak: int = 0
    updated_at: str | None = None


class LearningProfileRead(BaseModel):
    weak_competencies: dict[str, int] = Field(default_factory=dict)
    recurring_errors: list[str] = Field(default_factory=list)
    repertories_used: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    latest_competencies: dict[str, int] = Field(default_factory=dict)
    score_trend: list[int] = Field(default_factory=list)
    cognitive_issues: dict[str, CognitiveIssueRead] = Field(default_factory=dict)
    has_data: bool = False

    @classmethod
    def from_payload(cls, payload: dict) -> "LearningProfileRead":
        weak = payload.get("weak_competencies") or {}
        errors = payload.get("recurring_errors") or []
        repertories = payload.get("repertories_used") or []
        recommendations = payload.get("recommendations") or []
        latest_competencies = payload.get("latest_competencies") or {}
        score_trend = payload.get("score_trend") or []
        cognitive_issues = payload.get("cognitive_issues") or {}
        has_data = bool(weak or errors or repertories or recommendations or cognitive_issues)
        return cls(
            weak_competencies=weak,
            recurring_errors=errors,
            repertories_used=repertories,
            recommendations=recommendations,
            latest_competencies=latest_competencies,
            score_trend=score_trend,
            cognitive_issues=cognitive_issues,
            has_data=has_data,
        )


class RecommendedActionRead(BaseModel):
    type: Literal["LESSON", "EXERCISE", "GAME", "ESSAY"]
    target_issue: str | None = None
    target: str | None = None
    reason: str
    estimated_minutes: int

