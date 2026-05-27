from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


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
    essays: int
    last_seen_at: datetime | None = None
    total_tokens: int = 0
    event_count: int = 0


# ── AI Telemetry ─────────────────────────────────────────────────────────────

class AgentStats(BaseModel):
    agent: str
    workflow: str
    total_calls: int
    success_calls: int
    error_calls: int
    total_tokens: int
    avg_latency_ms: int
    cost_usd_cents: int


class DailyUsage(BaseModel):
    date: str
    total_tokens: int
    total_calls: int
    error_calls: int
    cost_usd_cents: int


class AITelemetryResponse(BaseModel):
    period_days: int
    total_tokens: int
    total_calls: int
    error_calls: int
    cost_usd_cents: int
    agents: list[AgentStats]
    daily: list[DailyUsage]
    top_users: list[dict]


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


# ── Event Tracking ────────────────────────────────────────────────────────────

class TrackEventRequest(BaseModel):
    event_type: str = Field(min_length=3, max_length=60)
    entity_id: str | None = Field(default=None, max_length=120)
    entity_type: str | None = Field(default=None, max_length=60)
    duration_ms: int | None = Field(default=None, ge=0)
    meta: dict = Field(default_factory=dict)
