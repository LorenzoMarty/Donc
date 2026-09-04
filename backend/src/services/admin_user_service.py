from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.memory.profile import get_learning_profile_payload
from src.middlewares.errors import AppError
from src.models import AIInteractionLog, Essay, User
from src.models.events import UserEvent
from src.repositories.users import UserRepository
from src.schemas.admin import (
    AdminReviewerRead,
    AdminUserAIUsage,
    AdminUserDetailResponse,
    AdminUserLearningProfile,
    AdminUserListResponse,
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

    def users_list(self, *, limit: int = 50, offset: int = 0, search: str | None = None) -> AdminUserListResponse:
        total = self.users.count_users(search=search)
        users = self.users.list_users(limit=limit, offset=offset, search=search)
        if not users:
            return AdminUserListResponse(items=[], total=total)
        user_ids = [user.id for user in users]
        essays_by_user = self._essays_count_by_user(user_ids)
        token_by_user = self._tokens_by_user(user_ids)
        events_by_user = self._events_by_user(user_ids)
        items = [
            self._to_admin_user_read(
                user,
                essays=essays_by_user.get(user.id, 0),
                total_tokens=token_by_user.get(user.id, 0),
                event_count=events_by_user.get(user.id, 0),
            )
            for user in users
        ]
        return AdminUserListResponse(items=items, total=total)

    def reviewers_list(self) -> list[AdminReviewerRead]:
        return [AdminReviewerRead(id=user.id, name=user.name) for user in self.users.list_reviewers()]

    def update_student(
        self,
        *,
        user_id: int,
        name: str | None = None,
        streak_days: int | None = None,
        daily_goal_minutes: int | None = None,
    ) -> AdminUserRead:
        user = self._get_student(user_id)
        if name is not None:
            user.name = name.strip()
        if streak_days is not None:
            user.streak_days = streak_days
        if daily_goal_minutes is not None:
            user.daily_goal_minutes = daily_goal_minutes
        self.db.commit()
        return self._summary_for_user(user)

    def delete_student(self, *, user_id: int, admin_user_id: int) -> None:
        if user_id == admin_user_id:
            raise AppError("Você não pode excluir sua própria conta.", status_code=409, code="cannot_delete_self")
        user = self._get_student(user_id)
        # Soft-delete (auditoria arquitetural 2026-08-21): preserva histórico pedagógico —
        # antes era db.delete() + CASCADE, apagava redações/tentativas/outcomes do aluno.
        user.deleted_at = datetime.now(UTC)
        self.db.commit()

    def user_detail(self, user_id: int) -> AdminUserDetailResponse:
        user = self.db.get(User, user_id)
        if not user:
            raise AppError("Usuário não encontrado.", status_code=404, code="user_not_found")

        summary = self._summary_for_user(user)

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
            raise AppError("Aluno não encontrado.", status_code=404, code="student_not_found")
        if user.role.value != "student":
            raise AppError("Esta ação só pode ser aplicada a alunos.", status_code=409, code="admin_user_protected")
        return user

    def _summary_for_user(self, user: User) -> AdminUserRead:
        essays = self._essays_count_by_user([user.id]).get(user.id, 0)
        tokens = self._tokens_by_user([user.id]).get(user.id, 0)
        events = self._events_by_user([user.id]).get(user.id, 0)
        return self._to_admin_user_read(user, essays=essays, total_tokens=tokens, event_count=events)

    def _to_admin_user_read(self, user: User, *, essays: int, total_tokens: int, event_count: int) -> AdminUserRead:
        return AdminUserRead(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role.value,
            streak_days=user.streak_days,
            daily_goal_minutes=user.daily_goal_minutes,
            essays=essays,
            last_seen_at=user.last_seen_at,
            total_tokens=total_tokens,
            event_count=event_count,
        )

    def _essays_count_by_user(self, user_ids: list[int]) -> dict[int, int]:
        rows = self.db.execute(
            select(Essay.user_id, func.count(Essay.id).label("total"))
            .where(Essay.user_id.in_(user_ids))
            .group_by(Essay.user_id)
        ).all()
        return {row.user_id: int(row.total or 0) for row in rows}

    def _tokens_by_user(self, user_ids: list[int]) -> dict[int, int]:
        rows = self.db.execute(
            select(AIInteractionLog.user_id, func.sum(AIInteractionLog.token_count).label("total"))
            .where(AIInteractionLog.user_id.in_(user_ids))
            .group_by(AIInteractionLog.user_id)
        ).all()
        return {row.user_id: int(row.total or 0) for row in rows}

    def _events_by_user(self, user_ids: list[int]) -> dict[int, int]:
        rows = self.db.execute(
            select(UserEvent.user_id, func.count(UserEvent.id).label("cnt"))
            .where(UserEvent.user_id.in_(user_ids))
            .group_by(UserEvent.user_id)
        ).all()
        return {row.user_id: int(row.cnt or 0) for row in rows}
