from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.agents.game_generator import GameGeneratorAgent
from src.models import AIInteractionLog, Essay, EssayCorrection, EssayTheme, Exercise, Lesson, User
from src.models.events import AIGeneratedGame, UserEvent
from src.repositories.users import UserRepository
from src.schemas.admin import (
    AdminMetricsResponse,
    AdminUserRead,
    AgentStats,
    AIGeneratedGameRead,
    AITelemetryResponse,
    DailyUsage,
    EventTypeSummary,
    GameQuestionRead,
    UserActivityResponse,
)

# gpt-4o blended cost: ~$5 per 1M tokens → 0.5 cents per 1K tokens → 0.0005 cents per token
_COST_CENTS_PER_TOKEN = 0.0005


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

    # ── Existing ──────────────────────────────────────────────────────────────

    def metrics(self) -> AdminMetricsResponse:
        corrected = self.db.scalar(select(func.count(EssayCorrection.id))) or 0
        average = self.db.scalar(select(func.avg(EssayCorrection.total_score))) or 0
        return AdminMetricsResponse(
            users=self.db.scalar(select(func.count(User.id))) or 0,
            essays=self.db.scalar(select(func.count(Essay.id))) or 0,
            corrected_essays=corrected,
            lessons=self.db.scalar(select(func.count(Lesson.id))) or 0,
            exercises=self.db.scalar(select(func.count(Exercise.id))) or 0,
            average_score=int(average),
            active_themes=self.db.scalar(select(func.count(EssayTheme.id)).where(EssayTheme.is_active.is_(True))) or 0,
        )

    def users_list(self) -> list[AdminUserRead]:
        users = self.users.list_users()
        # aggregate tokens per user
        token_rows = self.db.execute(
            select(AIInteractionLog.user_id, func.sum(AIInteractionLog.token_count).label("total"))
            .where(AIInteractionLog.user_id.is_not(None))
            .group_by(AIInteractionLog.user_id)
        ).all()
        token_by_user = {row.user_id: int(row.total or 0) for row in token_rows}

        # aggregate event count per user
        event_rows = self.db.execute(
            select(UserEvent.user_id, func.count(UserEvent.id).label("cnt"))
            .where(UserEvent.user_id.is_not(None))
            .group_by(UserEvent.user_id)
        ).all()
        events_by_user = {row.user_id: int(row.cnt or 0) for row in event_rows}

        return [
            AdminUserRead(
                id=user.id,
                name=user.name,
                email=user.email,
                role=user.role.value,
                xp=user.xp,
                level=user.level,
                essays=len(user.essays),
                last_seen_at=user.last_seen_at,
                total_tokens=token_by_user.get(user.id, 0),
                event_count=events_by_user.get(user.id, 0),
            )
            for user in users
        ]

    # ── AI Telemetry ──────────────────────────────────────────────────────────

    def ai_telemetry(self, period_days: int = 30) -> AITelemetryResponse:
        since = datetime.now(timezone.utc) - timedelta(days=period_days)

        base = select(AIInteractionLog).where(AIInteractionLog.created_at >= since)
        logs = self.db.scalars(base).all()

        total_tokens = sum(log.token_count for log in logs)
        total_calls = len(logs)
        error_calls = sum(1 for log in logs if log.status == "error")
        cost_usd_cents = int(total_tokens * _COST_CENTS_PER_TOKEN)

        # per-agent aggregation
        agent_map: dict[str, dict] = {}
        for log in logs:
            key = f"{log.workflow}::{log.agent}"
            if key not in agent_map:
                agent_map[key] = {"agent": log.agent, "workflow": log.workflow, "calls": 0, "success": 0, "errors": 0, "tokens": 0, "latency_total": 0}
            agent_map[key]["calls"] += 1
            agent_map[key]["tokens"] += log.token_count
            agent_map[key]["latency_total"] += log.latency_ms
            if log.status == "error":
                agent_map[key]["errors"] += 1
            else:
                agent_map[key]["success"] += 1

        agents = [
            AgentStats(
                agent=v["agent"],
                workflow=v["workflow"],
                total_calls=v["calls"],
                success_calls=v["success"],
                error_calls=v["errors"],
                total_tokens=v["tokens"],
                avg_latency_ms=int(v["latency_total"] / v["calls"]) if v["calls"] else 0,
                cost_usd_cents=int(v["tokens"] * _COST_CENTS_PER_TOKEN),
            )
            for v in sorted(agent_map.values(), key=lambda x: x["tokens"], reverse=True)
        ]

        # daily aggregation
        day_map: dict[str, dict] = {}
        for log in logs:
            day = log.created_at.strftime("%Y-%m-%d") if log.created_at else "unknown"
            if day not in day_map:
                day_map[day] = {"tokens": 0, "calls": 0, "errors": 0}
            day_map[day]["tokens"] += log.token_count
            day_map[day]["calls"] += 1
            if log.status == "error":
                day_map[day]["errors"] += 1

        daily = [
            DailyUsage(
                date=day,
                total_tokens=v["tokens"],
                total_calls=v["calls"],
                error_calls=v["errors"],
                cost_usd_cents=int(v["tokens"] * _COST_CENTS_PER_TOKEN),
            )
            for day, v in sorted(day_map.items())
        ]

        # top users by token consumption
        top_rows = self.db.execute(
            select(AIInteractionLog.user_id, func.sum(AIInteractionLog.token_count).label("total"))
            .where(AIInteractionLog.created_at >= since, AIInteractionLog.user_id.is_not(None))
            .group_by(AIInteractionLog.user_id)
            .order_by(func.sum(AIInteractionLog.token_count).desc())
            .limit(10)
        ).all()
        user_ids = [row.user_id for row in top_rows]
        user_names: dict[int, str] = {}
        if user_ids:
            name_rows = self.db.execute(select(User.id, User.name, User.email).where(User.id.in_(user_ids))).all()
            user_names = {row.id: f"{row.name} ({row.email})" for row in name_rows}

        top_users = [
            {"user_id": row.user_id, "label": user_names.get(row.user_id, f"User {row.user_id}"), "total_tokens": int(row.total or 0), "cost_usd_cents": int((row.total or 0) * _COST_CENTS_PER_TOKEN)}
            for row in top_rows
        ]

        return AITelemetryResponse(
            period_days=period_days,
            total_tokens=total_tokens,
            total_calls=total_calls,
            error_calls=error_calls,
            cost_usd_cents=cost_usd_cents,
            agents=agents,
            daily=daily,
            top_users=top_users,
        )

    # ── User Activity ──────────────────────────────────────────────────────────

    def user_activity(self, period_days: int = 7) -> UserActivityResponse:
        since = datetime.now(timezone.utc) - timedelta(days=period_days)
        events = self.db.scalars(select(UserEvent).where(UserEvent.created_at >= since)).all()
        total_events = len(events)

        type_map: dict[str, int] = {}
        for ev in events:
            type_map[ev.event_type] = type_map.get(ev.event_type, 0) + 1

        by_type = [EventTypeSummary(event_type=k, count=v) for k, v in sorted(type_map.items(), key=lambda x: x[1], reverse=True)]

        online_cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
        online_now = self.db.scalar(
            select(func.count(User.id)).where(User.last_seen_at >= online_cutoff)
        ) or 0

        return UserActivityResponse(
            period_days=period_days,
            total_events=total_events,
            by_type=by_type,
            online_now=online_now,
        )

    # ── Event Tracking ────────────────────────────────────────────────────────

    def track_event(
        self,
        *,
        user_id: int | None,
        event_type: str,
        entity_id: str | None = None,
        entity_type: str | None = None,
        duration_ms: int | None = None,
        meta: dict | None = None,
    ) -> None:
        self.db.add(
            UserEvent(
                user_id=user_id,
                event_type=event_type,
                entity_id=entity_id,
                entity_type=entity_type,
                duration_ms=duration_ms,
                meta=meta or {},
            )
        )
        self.db.commit()

    # ── AI Game Generation ────────────────────────────────────────────────────

    def generate_game(
        self,
        *,
        skill: str,
        category: str,
        difficulty: str,
        count: int,
        name: str | None,
        admin_user_id: int,
    ) -> AIGeneratedGameRead:
        agent = GameGeneratorAgent()
        result = agent.generate(skill=skill, category=category, difficulty=difficulty, count=count, user_id=admin_user_id)
        game = AIGeneratedGame(
            name=name or result.name,
            category=category,
            skill=skill,
            difficulty=difficulty,
            xp_reward=40,
            questions=[{"prompt": q.prompt, "options": q.options, "answer_index": q.answer_index, "explanation": q.explanation} for q in result.questions],
            status="pending",
        )
        self.db.add(game)
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def list_ai_games(self, status: str | None = None) -> list[AIGeneratedGameRead]:
        query = select(AIGeneratedGame).order_by(AIGeneratedGame.created_at.desc())
        if status:
            query = query.where(AIGeneratedGame.status == status)
        games = self.db.scalars(query).all()
        return [self._game_to_read(g) for g in games]

    def review_game(
        self,
        game_id: int,
        *,
        action: str,
        notes: str | None,
        questions: list[dict] | None,
        name: str | None,
        xp_reward: int | None,
        reviewer_id: int,
    ) -> AIGeneratedGameRead:
        game = self.db.get(AIGeneratedGame, game_id)
        if not game:
            from src.middlewares.errors import AppError
            raise AppError("Jogo nao encontrado.", status_code=404, code="game_not_found")
        game.status = "approved" if action == "approve" else "rejected"
        game.reviewed_at = datetime.now(timezone.utc)
        game.reviewed_by = reviewer_id
        if notes is not None:
            game.admin_notes = notes
        if questions is not None:
            game.questions = questions
        if name is not None:
            game.name = name
        if xp_reward is not None:
            game.xp_reward = xp_reward
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def _game_to_read(self, game: AIGeneratedGame) -> AIGeneratedGameRead:
        questions = [
            GameQuestionRead(
                prompt=q.get("prompt", ""),
                options=q.get("options", []),
                answer_index=q.get("answer_index", 0),
                explanation=q.get("explanation", ""),
            )
            for q in (game.questions or [])
        ]
        return AIGeneratedGameRead(
            id=game.id,
            name=game.name,
            category=game.category,
            skill=game.skill,
            difficulty=game.difficulty,
            xp_reward=game.xp_reward,
            questions=questions,
            status=game.status,
            admin_notes=game.admin_notes,
            created_at=game.created_at,
            reviewed_at=game.reviewed_at,
        )
