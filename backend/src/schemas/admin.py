from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class AdminMetricsResponse(BaseModel):
    users: int
    essays: int
    corrected_essays: int
    lessons: int
    exercises: int
    average_score: int
    active_themes: int


class AdminUserRead(BaseModel):
    id: int
    name: str
    email: str
    role: str
    xp: int
    level: int
    streak_days: int
    daily_goal_minutes: int
    essays: int
    last_seen_at: datetime | None = None
    total_tokens: int = 0
    event_count: int = 0


class AdminUserUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    xp: int | None = Field(default=None, ge=0, le=1_000_000)
    level: int | None = Field(default=None, ge=1, le=500)
    streak_days: int | None = Field(default=None, ge=0, le=3650)
    daily_goal_minutes: int | None = Field(default=None, ge=10, le=480)


class AdminUserActionResponse(BaseModel):
    action: Literal["deleted"]
    user_id: int


SupportingTextType = Literal["motivador", "perspectiva", "dados", "repertorio", "imagem"]


class AdminSupportingTextRequest(BaseModel):
    title: str = Field(min_length=4, max_length=120)
    content: str = Field(min_length=40, max_length=1200)
    type: SupportingTextType = "motivador"


class AdminSupportingTextRequirement(BaseModel):
    type: SupportingTextType
    count: int = Field(ge=0, le=5)


class AdminEssayThemeUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=8, max_length=220)
    context: str | None = Field(default=None, min_length=20, max_length=5000)
    supporting_texts: list[AdminSupportingTextRequest] | None = Field(default=None, max_length=8)


class AdminEssayThemeGenerateRequest(BaseModel):
    focus: str | None = Field(default=None, max_length=160)
    supporting_text_requirements: list[AdminSupportingTextRequirement] = Field(default_factory=list, max_length=5)

    @model_validator(mode="after")
    def ensure_requested_texts(self):
        total = sum(item.count for item in self.supporting_text_requirements)
        if total > 8:
            raise ValueError("A proposta pode ter no maximo 8 textos de apoio.")
        return self


class AdminEssayThemeActionResponse(BaseModel):
    action: Literal["deleted"]
    theme_id: int


class AdminLessonRead(BaseModel):
    id: int
    title: str
    description: str
    thumbnail_url: str
    video_url: str
    summary: str
    duration_minutes: int
    order: int


class AdminActivityRead(BaseModel):
    id: int
    statement: str
    options: list[str]
    correct_answer: str
    explanation: str
    skill: str
    difficulty: str
    lesson_id: int | None = None
    base_lesson_ids: list[int] = Field(default_factory=list)
    order: int


class AdminModuleItemRead(BaseModel):
    id: int
    kind: Literal["lesson", "activity"]
    order: int
    lesson: AdminLessonRead | None = None
    activity: AdminActivityRead | None = None


class AdminModuleRead(BaseModel):
    id: int
    title: str
    description: str
    order: int
    lessons: list[AdminLessonRead] = Field(default_factory=list)
    items: list[AdminModuleItemRead] = Field(default_factory=list)


class AdminCourseRead(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    color: str
    modules: list[AdminModuleRead] = Field(default_factory=list)


class AdminCourseCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    slug: str | None = Field(default=None, min_length=3, max_length=140)
    description: str = Field(min_length=10, max_length=1200)
    color: str = Field(default="#65BE02", max_length=40)


class AdminModuleCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=10, max_length=1200)
    order: int | None = Field(default=None, ge=1, le=999)


class AdminLessonCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=10, max_length=1200)
    thumbnail_url: str = Field(default="", max_length=500)
    video_url: str = Field(default="", max_length=500)
    summary: str = Field(min_length=10, max_length=5000)
    duration_minutes: int = Field(default=15, ge=1, le=600)
    order: int | None = Field(default=None, ge=1, le=999)


class AdminActivityCreateRequest(BaseModel):
    statement: str = Field(min_length=20, max_length=1200)
    options: list[str] = Field(min_length=5, max_length=5)
    correct_answer: str = Field(pattern="^[A-E]$")
    explanation: str = Field(min_length=20, max_length=1200)
    skill: str = Field(min_length=3, max_length=160)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    lesson_id: int | None = Field(default=None, gt=0)
    base_lesson_ids: list[int] = Field(default_factory=list, max_length=8)
    order: int | None = Field(default=None, ge=1, le=999)


class AdminActivityGenerateRequest(BaseModel):
    lesson_ids: list[int] = Field(min_length=1, max_length=8)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    count: int = Field(default=1, ge=1, le=3)
    focus: str | None = Field(default=None, max_length=160)


class AdminCourseUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=120)
    description: str | None = Field(default=None, min_length=10, max_length=1200)
    color: str | None = Field(default=None, max_length=40)


class AdminModuleUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=160)
    description: str | None = Field(default=None, min_length=10, max_length=1200)


class AdminLessonUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=180)
    description: str | None = Field(default=None, min_length=10, max_length=1200)
    thumbnail_url: str | None = Field(default=None, max_length=500)
    video_url: str | None = Field(default=None, max_length=500)
    summary: str | None = Field(default=None, min_length=10, max_length=5000)
    duration_minutes: int | None = Field(default=None, ge=1, le=600)


class AdminActivityUpdateRequest(BaseModel):
    statement: str | None = Field(default=None, min_length=20, max_length=1200)
    options: list[str] | None = Field(default=None, min_length=5, max_length=5)
    correct_answer: str | None = Field(default=None, pattern="^[A-E]$")
    explanation: str | None = Field(default=None, min_length=20, max_length=1200)
    skill: str | None = Field(default=None, min_length=3, max_length=160)
    difficulty: Literal["easy", "medium", "hard"] | None = None
    lesson_id: int | None = Field(default=None, gt=0)
    base_lesson_ids: list[int] | None = Field(default=None, max_length=8)


class AdminMoveRequest(BaseModel):
    direction: Literal["up", "down"]


class AdminContentActionResponse(BaseModel):
    action: Literal["deleted"]
    id: int
    kind: Literal["course", "module", "lesson", "activity"]


# ── User detail ──────────────────────────────────────────────────────────────

class MasteryPointRead(BaseModel):
    competency: str
    label: str
    value: int


class AdminUserProgress(BaseModel):
    progress_general: int
    essay_average: int
    best_essay_score: int
    completed_lessons: int
    correct_exercises_rate: int
    essays_written: int
    mastery_map: list[MasteryPointRead]
    recurrent_errors: list[str]


class AdminUserLearningProfile(BaseModel):
    weak_competencies: dict = Field(default_factory=dict)
    recurring_errors: list[str] = Field(default_factory=list)
    repertories_used: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


# ── AI Telemetry ─────────────────────────────────────────────────────────────

class AgentStats(BaseModel):
    agent: str
    workflow: str
    total_calls: int
    success_calls: int
    error_calls: int
    total_tokens: int
    avg_latency_ms: int
    cost_usd_cents: int  # legado (compat)
    cost_usd_micros: int = 0
    cost_brl_cents: int = 0


class WorkflowStats(BaseModel):
    workflow: str
    total_calls: int
    error_calls: int
    total_tokens: int
    cost_usd_micros: int
    cost_brl_cents: int
    avg_cost_brl_cents: int  # custo médio por chamada


class ModelStats(BaseModel):
    model: str
    total_calls: int
    total_tokens: int
    cost_usd_micros: int
    cost_brl_cents: int


class DailyUsage(BaseModel):
    date: str
    total_tokens: int
    total_calls: int
    error_calls: int
    cost_usd_cents: int  # legado (compat)
    cost_usd_micros: int = 0
    cost_brl_cents: int = 0


class AITelemetryResponse(BaseModel):
    period_days: int
    has_data: bool = False
    total_tokens: int
    total_calls: int
    error_calls: int
    cost_usd_cents: int  # legado (compat)
    cost_usd_micros: int = 0
    cost_brl_cents: int = 0
    usd_brl_rate: float = 0.0
    rate_source: str = ""
    agents: list[AgentStats]
    workflows: list[WorkflowStats] = Field(default_factory=list)
    models: list[ModelStats] = Field(default_factory=list)
    daily: list[DailyUsage]
    top_users: list[dict]


class AdminUserAIUsage(BaseModel):
    total_tokens: int
    total_calls: int
    error_calls: int
    cost_usd_cents: int  # legado (compat)
    cost_usd_micros: int = 0
    cost_brl_cents: int = 0
    usd_brl_rate: float = 0.0
    rate_source: str = ""
    agents: list[AgentStats]
    daily: list[DailyUsage]


class AdminUserDetailResponse(BaseModel):
    user: AdminUserRead
    progress: AdminUserProgress
    learning_profile: AdminUserLearningProfile
    ai_usage: AdminUserAIUsage


# ── User Activity ─────────────────────────────────────────────────────────────

class EventTypeSummary(BaseModel):
    event_type: str
    count: int


class UserActivityResponse(BaseModel):
    period_days: int
    total_events: int
    by_type: list[EventTypeSummary]
    online_now: int


# ── AI Generated Games ───────────────────────────────────────────────────────

class GameQuestionRead(BaseModel):
    prompt: str
    options: list[str]
    answer_index: int
    explanation: str


class AIGeneratedGameRead(BaseModel):
    id: int
    name: str
    category: str
    skill: str
    difficulty: str
    xp_reward: int
    questions: list[GameQuestionRead]
    status: str
    admin_notes: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None


class GenerateGameRequest(BaseModel):
    skill: str = Field(min_length=3, max_length=120)
    category: str = Field(min_length=3, max_length=60)
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    count: int = Field(default=5, ge=3, le=10)
    name: str | None = Field(default=None, max_length=120)


class ReviewGameRequest(BaseModel):
    action: str = Field(pattern="^(approve|reject)$")
    notes: str | None = Field(default=None, max_length=500)
    questions: list[GameQuestionRead] | None = None
    name: str | None = Field(default=None, max_length=120)
    xp_reward: int | None = Field(default=None, ge=10, le=200)


class UpdateGameRequest(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    xp_reward: int | None = Field(default=None, ge=10, le=200)
    questions: list[GameQuestionRead] | None = None


class AIGameActionResponse(BaseModel):
    action: Literal["deleted"]
    game_id: int


# ── Event Tracking ────────────────────────────────────────────────────────────

class TrackEventRequest(BaseModel):
    event_type: str = Field(min_length=3, max_length=60)
    entity_id: str | None = Field(default=None, max_length=120)
    entity_type: str | None = Field(default=None, max_length=60)
    duration_ms: int | None = Field(default=None, ge=0)
    meta: dict = Field(default_factory=dict)
