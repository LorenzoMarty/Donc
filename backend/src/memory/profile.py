from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.agents.schemas import EssayCorrectionResult
from src.models import StudentLearningProfile


def get_learning_profile_payload(db: Session, user_id: int) -> dict:
    profile = db.scalar(select(StudentLearningProfile).where(StudentLearningProfile.user_id == user_id))
    if not profile:
        return {
            "weak_competencies": {},
            "recurring_errors": [],
            "repertories_used": [],
            "recommendations": [],
        }
    return {
        "weak_competencies": profile.weak_competencies,
        "recurring_errors": profile.recurring_errors,
        "repertories_used": profile.repertories_used,
        "recommendations": profile.recommendations,
    }


def update_learning_profile(db: Session, *, user_id: int, correction: EssayCorrectionResult) -> None:
    profile = db.scalar(select(StudentLearningProfile).where(StudentLearningProfile.user_id == user_id))
    if not profile:
        profile = StudentLearningProfile(user_id=user_id)
        db.add(profile)
        db.flush()

    weak = dict(profile.weak_competencies or {})
    scores = {
        "c1": correction.competency_1,
        "c2": correction.competency_2,
        "c3": correction.competency_3,
        "c4": correction.competency_4,
        "c5": correction.competency_5,
    }
    for competency, score in scores.items():
        if score < 160:
            weak[competency] = int(weak.get(competency, 0)) + 1
    profile.weak_competencies = weak

    profile.recurring_errors = _merge_unique(profile.recurring_errors or [], correction.recurrent_patterns, limit=12)
    profile.recommendations = _recommendations_for(correction)


def _merge_unique(current: list[str], incoming: list[str], *, limit: int) -> list[str]:
    merged = list(dict.fromkeys([*current, *incoming]))
    return merged[-limit:]


def _recommendations_for(correction: EssayCorrectionResult) -> list[str]:
    recommendations: list[str] = []
    if correction.competency_3 < 160:
        recommendations.append("Revisar aula Tese forte em 3 movimentos.")
    if correction.competency_4 < 160:
        recommendations.append("Treinar conectivos e coesao interparagrafal.")
    if correction.competency_5 < 160:
        recommendations.append("Refazer conclusao com agente, acao, meio, finalidade e detalhamento.")
    return recommendations or ["Manter rotina de reescrita com foco em repertorio produtivo."]

