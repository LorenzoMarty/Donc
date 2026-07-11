from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.memory.profile import get_learning_profile_payload
from src.middlewares.errors import AppError
from src.models import AIInteractionLog, User
from src.models.events import UserEvent
from src.repositories.users import UserRepository
from src.schemas.admin import (
    AdminUserAIUsage,
    AdminUserDetailResponse,
    AdminUserLearningProfile,
    AdminUserProgress,
    AdminUserRead,
    AgentStats,
    DailyUsage,
    MasteryPointRead,
)
from src.services.admin_cost_helpers import log_cost_micros, micros_to_brl_cents, micros_to_usd_cents
from src.services.dashboard_service import DashboardService
from src.services.fx_rate import get_usd_brl


class AdminUserService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

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
                streak_days=user.streak_days,
                daily_goal_minutes=user.daily_goal_minutes,
                essays=len(user.essays),
                last_seen_at=user.last_seen_at,
                total_tokens=token_by_user.get(user.id, 0),
                event_count=events_by_user.get(user.id, 0),
            )
            for user in users
        ]

    def update_student(
        self,
        *,
        user_id: int,
        name: str | None = None,
        xp: int | None = None,
        level: int | None = None,
        streak_days: int | None = None,
        daily_goal_minutes: int | None = None,
    ) -> AdminUserRead:
        user = self._get_student(user_id)
        if name is not None:
            user.name = name.strip()
        if xp is not None:
            user.xp = xp
        if level is not None:
            user.level = level
        if streak_days is not None:
            user.streak_days = streak_days
        if daily_goal_minutes is not None:
            user.daily_goal_minutes = daily_goal_minutes
        self.db.commit()
        return next(item for item in self.users_list() if item.id == user.id)

    def delete_student(self, *, user_id: int, admin_user_id: int) -> None:
        if user_id == admin_user_id:
            raise AppError("Voce nao pode excluir sua propria conta.", status_code=409, code="cannot_delete_self")
        user = self._get_student(user_id)
        self.db.delete(user)
        self.db.commit()

    def user_detail(self, user_id: int) -> AdminUserDetailResponse:
        user = self.db.get(User, user_id)
        if not user:
            raise AppError("Usuario nao encontrado.", status_code=404, code="user_not_found")

        summary = next((item for item in self.users_list() if item.id == user_id), None)
        if summary is None:
            raise AppError("Usuario nao encontrado.", status_code=404, code="user_not_found")

        dashboard = DashboardService(self.db).get(user_id)
        progress = AdminUserProgress(
            progress_general=dashboard.progress_general,
            essay_average=dashboard.essay_average,
            best_essay_score=dashboard.best_essay_score,
            completed_lessons=dashboard.completed_lessons,
            correct_exercises_rate=dashboard.correct_exercises_rate,
            essays_written=dashboard.essays_written,
            mastery_map=[
                MasteryPointRead(competency=point.competency, label=point.label, value=point.value)
                for point in dashboard.mastery_map
            ],
            recurrent_errors=dashboard.recurrent_errors,
        )

        profile_payload = get_learning_profile_payload(self.db, user_id)
        learning_profile = AdminUserLearningProfile(
            weak_competencies=profile_payload.get("weak_competencies") or {},
            recurring_errors=profile_payload.get("recurring_errors") or [],
            repertories_used=profile_payload.get("repertories_used") or [],
            recommendations=profile_payload.get("recommendations") or [],
        )

        ai_usage = self._user_ai_usage(user_id)

        return AdminUserDetailResponse(
            user=summary,
            progress=progress,
            learning_profile=learning_profile,
            ai_usage=ai_usage,
        )

    def _user_ai_usage(self, user_id: int) -> AdminUserAIUsage:
        logs = self.db.scalars(select(AIInteractionLog).where(AIInteractionLog.user_id == user_id)).all()
        fx = get_usd_brl()
        rate = fx.rate
        total_tokens = sum(log.token_count for log in logs)
        total_calls = len(logs)
        error_calls = sum(1 for log in logs if log.status == "error")
        total_micros = sum(log_cost_micros(log) for log in logs)

        agent_map: dict[str, dict] = {}
        day_map: dict[str, dict] = {}
        for log in logs:
            micros = log_cost_micros(log)
            is_error = log.status == "error"
            key = f"{log.workflow}::{log.agent}"
            agent = agent_map.setdefault(
                key,
                {"agent": log.agent, "workflow": log.workflow, "calls": 0, "success": 0, "errors": 0, "tokens": 0, "latency_total": 0, "micros": 0},
            )
            agent["calls"] += 1
            agent["tokens"] += log.token_count
            agent["latency_total"] += log.latency_ms
            agent["micros"] += micros
            agent["errors" if is_error else "success"] += 1

            day = log.created_at.strftime("%Y-%m-%d") if log.created_at else "unknown"
            bucket = day_map.setdefault(day, {"tokens": 0, "calls": 0, "errors": 0, "micros": 0})
            bucket["tokens"] += log.token_count
            bucket["calls"] += 1
            bucket["micros"] += micros
            if is_error:
                bucket["errors"] += 1

        agents = [
            AgentStats(
                agent=v["agent"],
                workflow=v["workflow"],
                total_calls=v["calls"],
                success_calls=v["success"],
                error_calls=v["errors"],
                total_tokens=v["tokens"],
                avg_latency_ms=int(v["latency_total"] / v["calls"]) if v["calls"] else 0,
                cost_usd_cents=micros_to_usd_cents(v["micros"]),
                cost_usd_micros=v["micros"],
                cost_brl_cents=micros_to_brl_cents(v["micros"], rate),
            )
            for v in sorted(agent_map.values(), key=lambda x: x["micros"], reverse=True)
        ]
        daily = [
            DailyUsage(
                date=day,
                total_tokens=v["tokens"],
                total_calls=v["calls"],
                error_calls=v["errors"],
                cost_usd_cents=micros_to_usd_cents(v["micros"]),
                cost_usd_micros=v["micros"],
                cost_brl_cents=micros_to_brl_cents(v["micros"], rate),
            )
            for day, v in sorted(day_map.items())
        ]
        return AdminUserAIUsage(
            total_tokens=total_tokens,
            total_calls=total_calls,
            error_calls=error_calls,
            cost_usd_cents=micros_to_usd_cents(total_micros),
            cost_usd_micros=total_micros,
            cost_brl_cents=micros_to_brl_cents(total_micros, rate),
            usd_brl_rate=rate,
            rate_source=fx.source,
            agents=agents,
            daily=daily,
        )

    def _get_student(self, user_id: int) -> User:
        user = self.db.get(User, user_id)
        if not user:
            raise AppError("Aluno nao encontrado.", status_code=404, code="student_not_found")
        if user.role.value != "student":
            raise AppError("Esta acao so pode ser aplicada a alunos.", status_code=409, code="admin_user_protected")
        return user
