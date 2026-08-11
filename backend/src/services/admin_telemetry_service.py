from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models import AIInteractionLog, User
from src.models.events import AIGeneratedGame, UserEvent
from src.config.settings import settings
from src.schemas.admin import (
    AgentStats,
    AIGenerationTraceRead,
    AIQualityReportRow,
    AIQuotaStatusRead,
    AITelemetryResponse,
    DailyUsage,
    EventTypeSummary,
    ModelStats,
    UserActivityResponse,
    UserQuotaUsage,
    WorkflowQuotaUsage,
    WorkflowStats,
)
from src.services.admin_cost_helpers import log_cost_micros, micros_to_brl_cents, micros_to_usd_cents
from src.services.fx_rate import get_usd_brl


class AdminTelemetryService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def generation_trace(self, *, content_type: str, content_id: int) -> list[AIGenerationTraceRead]:
        """REQ-3 (P2b): reconstroi quem gerou, quando, com quais parametros e a que custo, a
        partir do content_id/content_type gravado no AIInteractionLog (Bloco 1)."""
        logs = self.db.scalars(
            select(AIInteractionLog)
            .where(AIInteractionLog.content_type == content_type, AIInteractionLog.content_id == content_id)
            .order_by(AIInteractionLog.created_at.asc())
        ).all()
        return [AIGenerationTraceRead.model_validate(log) for log in logs]

    def ai_quota_status(self) -> AIQuotaStatusRead:
        """REQ-6 (P2b): visibilidade dos limites configurados (Bloco 2) e do consumo do dia
        corrente (UTC) por usuario e por workflow, antes de bloquear."""
        since = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        logs = self.db.scalars(select(AIInteractionLog).where(AIInteractionLog.created_at >= since)).all()

        by_user: dict[int, int] = {}
        by_workflow: dict[str, int] = {}
        for log in logs:
            if log.user_id is not None:
                by_user[log.user_id] = by_user.get(log.user_id, 0) + log.cost_micro_usd
            by_workflow[log.workflow] = by_workflow.get(log.workflow, 0) + log.cost_micro_usd

        return AIQuotaStatusRead(
            daily_limit_micro_usd_per_user=settings.ai_daily_cost_limit_micro_usd_per_user,
            daily_limit_micro_usd_per_workflow=settings.ai_daily_cost_limit_micro_usd_per_workflow,
            per_user_today=[
                UserQuotaUsage(user_id=user_id, consumed_micro_usd=consumed)
                for user_id, consumed in sorted(by_user.items(), key=lambda item: -item[1])
            ],
            per_workflow_today=[
                WorkflowQuotaUsage(workflow=workflow, consumed_micro_usd=consumed)
                for workflow, consumed in sorted(by_workflow.items(), key=lambda item: -item[1])
            ],
        )

    def ai_quality_report(self, period_days: int = 30) -> list[AIQualityReportRow]:
        """REQ-11 (P2b): gerados/aprovados/rejeitados/editados por tipo de conteudo IA, no
        periodo. So conta o que a fonte de dados realmente sustenta — `AIGeneratedGame` tem
        fila de revisao (status/edited_after_generation); outros tipos (ex.: `EssayTheme`) ainda
        nao tem essa fila, entao aprovado/rejeitado/editado ficam 0 em vez de inventados."""
        since = datetime.now(timezone.utc) - timedelta(days=period_days)
        logs = self.db.scalars(
            select(AIInteractionLog).where(
                AIInteractionLog.created_at >= since, AIInteractionLog.content_type.is_not(None)
            )
        ).all()

        content_ids_by_type: dict[str, set[int]] = {}
        for log in logs:
            if log.content_id is None or log.content_type is None:
                continue
            content_ids_by_type.setdefault(log.content_type, set()).add(log.content_id)

        rows: list[AIQualityReportRow] = []
        for content_type, ids in content_ids_by_type.items():
            approved = rejected = edited = 0
            if content_type == "AIGeneratedGame":
                games = self.db.scalars(select(AIGeneratedGame).where(AIGeneratedGame.id.in_(ids))).all()
                approved = sum(1 for game in games if game.status == "approved")
                rejected = sum(1 for game in games if game.status == "rejected")
                edited = sum(1 for game in games if game.edited_after_generation)
            rows.append(
                AIQualityReportRow(content_type=content_type, generated=len(ids), approved=approved, rejected=rejected, edited=edited)
            )
        return rows

    def ai_telemetry(self, period_days: int = 30) -> AITelemetryResponse:
        since = datetime.now(timezone.utc) - timedelta(days=period_days)
        fx = get_usd_brl()
        rate = fx.rate

        base = select(AIInteractionLog).where(AIInteractionLog.created_at >= since)
        logs = self.db.scalars(base).all()

        total_tokens = sum(log.token_count for log in logs)
        total_calls = len(logs)
        error_calls = sum(1 for log in logs if log.status == "error")
        total_micros = sum(log_cost_micros(log) for log in logs)

        agent_map: dict[str, dict] = {}
        workflow_map: dict[str, dict] = {}
        model_map: dict[str, dict] = {}
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

            wf = workflow_map.setdefault(
                log.workflow, {"workflow": log.workflow, "calls": 0, "errors": 0, "tokens": 0, "micros": 0}
            )
            wf["calls"] += 1
            wf["tokens"] += log.token_count
            wf["micros"] += micros
            if is_error:
                wf["errors"] += 1

            model_name = log.model or (log.meta or {}).get("model") or "desconhecido"
            md = model_map.setdefault(model_name, {"model": model_name, "calls": 0, "tokens": 0, "micros": 0})
            md["calls"] += 1
            md["tokens"] += log.token_count
            md["micros"] += micros

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

        workflows = [
            WorkflowStats(
                workflow=v["workflow"],
                total_calls=v["calls"],
                error_calls=v["errors"],
                total_tokens=v["tokens"],
                cost_usd_micros=v["micros"],
                cost_brl_cents=micros_to_brl_cents(v["micros"], rate),
                avg_cost_brl_cents=micros_to_brl_cents(int(v["micros"] / v["calls"]) if v["calls"] else 0, rate),
            )
            for v in sorted(workflow_map.values(), key=lambda x: x["micros"], reverse=True)
        ]

        models = [
            ModelStats(
                model=v["model"],
                total_calls=v["calls"],
                total_tokens=v["tokens"],
                cost_usd_micros=v["micros"],
                cost_brl_cents=micros_to_brl_cents(v["micros"], rate),
            )
            for v in sorted(model_map.values(), key=lambda x: x["micros"], reverse=True)
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

        # top users por custo (micro-USD agregado)
        user_micros: dict[int, dict] = {}
        for log in logs:
            if log.user_id is None:
                continue
            entry = user_micros.setdefault(log.user_id, {"tokens": 0, "micros": 0})
            entry["tokens"] += log.token_count
            entry["micros"] += log_cost_micros(log)
        top_sorted = sorted(user_micros.items(), key=lambda kv: kv[1]["micros"], reverse=True)[:10]
        user_ids = [uid for uid, _ in top_sorted]
        user_names: dict[int, str] = {}
        if user_ids:
            name_rows = self.db.execute(select(User.id, User.name, User.email).where(User.id.in_(user_ids))).all()
            user_names = {row.id: f"{row.name} ({row.email})" for row in name_rows}
        top_users = [
            {
                "user_id": uid,
                "label": user_names.get(uid, f"User {uid}"),
                "total_tokens": data["tokens"],
                "cost_usd_cents": micros_to_usd_cents(data["micros"]),
                "cost_usd_micros": data["micros"],
                "cost_brl_cents": micros_to_brl_cents(data["micros"], rate),
            }
            for uid, data in top_sorted
        ]

        return AITelemetryResponse(
            period_days=period_days,
            has_data=total_calls > 0,
            total_tokens=total_tokens,
            total_calls=total_calls,
            error_calls=error_calls,
            cost_usd_cents=micros_to_usd_cents(total_micros),
            cost_usd_micros=total_micros,
            cost_brl_cents=micros_to_brl_cents(total_micros, rate),
            usd_brl_rate=rate,
            rate_source=fx.source,
            agents=agents,
            workflows=workflows,
            models=models,
            daily=daily,
            top_users=top_users,
        )

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
