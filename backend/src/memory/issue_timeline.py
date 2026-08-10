"""Linha do tempo de CognitiveIssue — P2a Bloco 8 (REQ-22).

Deriva do log de `LearningOutcome` (nao do agregado mutavel `cognitive_issues`): quando o
problema foi detectado (primeira evidencia negativa), quantas evidencias desde entao, e a data
da mais recente — base para a UI de evolucao historica do Perfil (REQ-23).
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models import LearningOutcome


def compute_issue_timeline(db: Session, *, user_id: int, code: str) -> dict:
    evidence_count = (
        db.scalar(
            select(func.count()).select_from(LearningOutcome).where(
                LearningOutcome.user_id == user_id, LearningOutcome.cognitive_issue_code == code
            )
        )
        or 0
    )

    first_negative_at = db.scalar(
        select(func.min(LearningOutcome.created_at)).where(
            LearningOutcome.user_id == user_id,
            LearningOutcome.cognitive_issue_code == code,
            LearningOutcome.direction == "negative",
        )
    )
    last_evidence_at = db.scalar(
        select(func.max(LearningOutcome.created_at)).where(
            LearningOutcome.user_id == user_id, LearningOutcome.cognitive_issue_code == code
        )
    )

    return {
        "detected_at": first_negative_at.isoformat() if first_negative_at else None,
        "evidence_count": evidence_count,
        "last_evidence_at": last_evidence_at.isoformat() if last_evidence_at else None,
    }
