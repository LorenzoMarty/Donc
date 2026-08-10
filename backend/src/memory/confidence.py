"""Confianca de diagnostico de CognitiveIssue — P2a Bloco 3 (REQ-8/REQ-9/REQ-10).

Diferencia "detectamos um problema" (pouca evidencia, uma fonte so) de "temos evidencia forte"
(varias evidencias, fontes diferentes, resultado consistente, recente) — 3 niveis discretos,
nunca uma probabilidade estatistica fake (REQ-10). Calculado a partir do log de evidencias
individuais (`LearningOutcome`, Bloco 1), nao do agregado mutavel `cognitive_issues`.

Regra deterministica (sem LLM), documentada:
- Sem nenhum `LearningOutcome` -> "low" (cobre tambem estado herdado de antes da migration —
  REQ-7: nao ha evidencia individual pra sustentar confianca maior).
- `weighted_total` (soma de `LearningOutcome.weight`) <= `_LOW_WEIGHT_MAX` -> "low": evidencia
  isolada demais, mesmo que uma unica redacao (peso 2) conte mais que um jogo isolado.
- "high" exige TODOS: `weighted_total >= _HIGH_WEIGHT_MIN`, consistencia (sinais concordantes /
  total, ponderado) >= `_HIGH_CONSISTENCY_MIN`, pelo menos `_HIGH_MIN_SOURCES` fontes distintas
  (ESSAY/GAME/EXERCISE — reforco cruzado, nao repeticao do mesmo canal), e evidencia mais recente
  dentro de `_RECENCY_WINDOW_DAYS` (evidencia forte mas antiga nao garante que o problema
  persiste hoje).
- Qualquer outro caso -> "medium".
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import LearningOutcome

Confidence = Literal["low", "medium", "high"]

_LOW_WEIGHT_MAX = 2
_HIGH_WEIGHT_MIN = 5
_HIGH_CONSISTENCY_MIN = 0.7
_HIGH_MIN_SOURCES = 2
_RECENCY_WINDOW_DAYS = 60


def compute_confidence(db: Session, *, user_id: int, code: str, now: datetime | None = None) -> Confidence:
    rows = list(
        db.scalars(
            select(LearningOutcome).where(
                LearningOutcome.user_id == user_id, LearningOutcome.cognitive_issue_code == code
            )
        )
    )
    if not rows:
        return "low"

    weighted_total = sum(row.weight for row in rows)
    if weighted_total <= _LOW_WEIGHT_MAX:
        return "low"

    distinct_sources = {row.source for row in rows}
    positive_weight = sum(row.weight for row in rows if row.direction == "positive")
    negative_weight = sum(row.weight for row in rows if row.direction == "negative")
    consistency = max(positive_weight, negative_weight) / weighted_total

    reference_now = now or datetime.now(UTC)
    most_recent = max(row.created_at for row in rows)
    if most_recent.tzinfo is None:
        most_recent = most_recent.replace(tzinfo=UTC)
    is_recent = (reference_now - most_recent) <= timedelta(days=_RECENCY_WINDOW_DAYS)

    if (
        weighted_total >= _HIGH_WEIGHT_MIN
        and consistency >= _HIGH_CONSISTENCY_MIN
        and len(distinct_sources) >= _HIGH_MIN_SOURCES
        and is_recent
    ):
        return "high"
    return "medium"
