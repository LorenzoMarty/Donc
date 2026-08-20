"""AdminPedagogicalMetricsService — P2a Bloco 6 (REQ-19/REQ-20).

Metricas de produto/admin derivadas do ciclo `RecommendationLog` (Bloco 5): funil de
engajamento (mostrada -> iniciada -> concluida), tempo medio de conclusao por tipo de conteudo,
e desempenho antes/depois por `CognitiveIssue` — leitura administrativa, nunca exibida ao aluno
como pontuacao/gamificacao (REQ do pedido original secao 7).
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import LearningOutcome, RecommendationLog
from src.schemas.admin import AdminPedagogicalMetricsResponse, BeforeAfterIssueRow


class AdminPedagogicalMetricsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def report(self) -> AdminPedagogicalMetricsResponse:
        logs = list(self.db.scalars(select(RecommendationLog)))

        shown = len(logs)
        started = sum(1 for log in logs if log.started_at is not None)
        completed = sum(1 for log in logs if log.completed_at is not None)

        return AdminPedagogicalMetricsResponse(
            shown=shown,
            started=started,
            completed=completed,
            start_rate=(started / shown) if shown else None,
            completion_rate=(completed / started) if started else None,
            avg_completion_seconds_by_type=self._avg_completion_seconds_by_type(logs),
            before_after_by_issue=self._before_after_by_issue(logs),
        )

    def _avg_completion_seconds_by_type(self, logs: list[RecommendationLog]) -> dict[str, float]:
        durations: dict[str, list[float]] = {}
        for log in logs:
            if log.started_at is None or log.completed_at is None:
                continue
            durations.setdefault(log.action_type, []).append((log.completed_at - log.started_at).total_seconds())
        return {action_type: sum(values) / len(values) for action_type, values in durations.items()}

    def _before_after_by_issue(self, logs: list[RecommendationLog]) -> list[BeforeAfterIssueRow]:
        relevant = [
            log
            for log in logs
            if log.completed_at is not None and log.learning_outcome_id is not None and log.target_issue is not None
        ]
        if not relevant:
            return []

        after_ids = {log.learning_outcome_id for log in relevant}
        after_by_id = {
            outcome.id: outcome
            for outcome in self.db.scalars(select(LearningOutcome).where(LearningOutcome.id.in_(after_ids)))
        }

        user_ids = {log.user_id for log in relevant}
        issue_codes = {log.target_issue for log in relevant}
        candidates = self.db.scalars(
            select(LearningOutcome)
            .where(LearningOutcome.user_id.in_(user_ids), LearningOutcome.cognitive_issue_code.in_(issue_codes))
            .order_by(LearningOutcome.created_at.desc())
        ).all()
        candidates_by_key: dict[tuple[int, str], list[LearningOutcome]] = {}
        for outcome in candidates:
            candidates_by_key.setdefault((outcome.user_id, outcome.cognitive_issue_code), []).append(outcome)

        buckets: dict[str, dict[str, int]] = {}
        for log in relevant:
            after = after_by_id.get(log.learning_outcome_id)
            if after is None:
                continue
            before = next(
                (o for o in candidates_by_key.get((log.user_id, log.target_issue), []) if o.created_at < log.shown_at),
                None,
            )
            bucket = buckets.setdefault(log.target_issue, {"cycles": 0, "improved": 0, "unchanged_or_worse": 0})
            bucket["cycles"] += 1
            improved = before is not None and before.direction == "negative" and after.direction == "positive"
            bucket["improved" if improved else "unchanged_or_worse"] += 1

        return [BeforeAfterIssueRow(issue=issue, **stats) for issue, stats in sorted(buckets.items())]
