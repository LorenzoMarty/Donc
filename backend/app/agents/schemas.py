from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


DifficultyLevel = Literal["easy", "medium", "hard"]


class ThesisAnalysis(BaseModel):
    thesis_present: bool
    thesis: str
    clarity_score: int = Field(ge=0, le=100)
    argument_strength: int = Field(ge=0, le=100)
    issues: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)


class GrammarAnalysis(BaseModel):
    grammar_score: int = Field(ge=0, le=100)
    cohesion_score: int = Field(ge=0, le=100)
    formality_score: int = Field(ge=0, le=100)
    repeated_terms: list[str] = Field(default_factory=list)
    mistakes: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


class RepertoireAnalysis(BaseModel):
    repertoire_score: int = Field(ge=0, le=100)
    repertories_found: list[str] = Field(default_factory=list)
    weak_connections: list[str] = Field(default_factory=list)
    suggested_repertories: list[str] = Field(default_factory=list)
    sociocultural_links: list[str] = Field(default_factory=list)


class ENEMCompetencyAnalysis(BaseModel):
    c1: int = Field(ge=0, le=200)
    c2: int = Field(ge=0, le=200)
    c3: int = Field(ge=0, le=200)
    c4: int = Field(ge=0, le=200)
    c5: int = Field(ge=0, le=200)
    justifications: dict[str, str] = Field(default_factory=dict)
    pedagogical_feedback: list[str] = Field(default_factory=list)
    weak_competencies: list[str] = Field(default_factory=list)


class EssayCorrectionResult(BaseModel):
    total_score: int = Field(ge=0, le=1000)
    competency_1: int = Field(ge=0, le=200)
    competency_2: int = Field(ge=0, le=200)
    competency_3: int = Field(ge=0, le=200)
    competency_4: int = Field(ge=0, le=200)
    competency_5: int = Field(ge=0, le=200)
    strengths: list[str] = Field(min_length=1)
    errors: list[str] = Field(min_length=1)
    suggestions: list[str] = Field(min_length=1)
    feedback: str = Field(min_length=20)
    recurrent_patterns: list[str] = Field(default_factory=list)


class GeneratedQuizQuestion(BaseModel):
    statement: str = Field(min_length=20, max_length=900)
    options: list[str] = Field(min_length=5, max_length=5)
    correct_answer: Literal["A", "B", "C", "D", "E"]
    explanation: str = Field(min_length=20)
    skill: str = Field(min_length=3)
    difficulty: DifficultyLevel


class ExerciseGenerationResult(BaseModel):
    focus: str
    difficulty: DifficultyLevel
    questions: list[GeneratedQuizQuestion] = Field(min_length=1)
    adaptation_reason: str


class AnalyticsResult(BaseModel):
    summary: str
    estimated_level: str
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    recurrent_patterns: list[str] = Field(default_factory=list)
    next_focuses: list[str] = Field(default_factory=list)


class RecommendationResult(BaseModel):
    lessons: list[str] = Field(default_factory=list)
    games: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    difficulty: DifficultyLevel
    rationale: str


class StudyPlanDay(BaseModel):
    day: int = Field(ge=1)
    focus: str
    activities: list[str] = Field(min_length=1)
    minutes: int = Field(ge=10, le=180)
    expected_outcome: str


class StudyPlanResult(BaseModel):
    horizon_days: int = Field(ge=1, le=30)
    weekly_goal: str
    days: list[StudyPlanDay] = Field(min_length=1)
    review_strategy: str

