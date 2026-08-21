"""AdminAdaptiveHealthService — P2c Bloco 4 (REQ-14/REQ-16).

Saude do sistema adaptativo: revela "buracos" concretos e acionaveis (quais alunos, quais
problemas — nao so contagem agregada). Deriva de StudentLearningProfile (P0), RecommendationLog
(P2a) e do catalogo de conteudo (Lesson/Exercise/AIGeneratedGame) ja existente.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.memory.cognitive_issues import ISSUE_CODES
from src.models import Exercise, Lesson, RecommendationLog, StudentLearningProfile, User, UserRole
from src.models.events import AIGeneratedGame

_STALE_ISSUE_DAYS = 30
_ACTIVE_STATES = {"DETECTED", "TRAINING", "IMPROVING"}  # MASTERED nao e "sem progresso"


@dataclass
class AdminAdaptiveHealthReport:
    students_without_diagnosis: list[dict] = field(default_factory=list)
    students_without_recommendation: list[dict] = field(default_factory=list)
    recommendations_without_content: list[dict] = field(default_factory=list)
    issues_without_content: list[str] = field(default_factory=list)
    issues_without_progress: list[dict] = field(default_factory=list)


class AdminAdaptiveHealthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def report(self) -> AdminAdaptiveHealthReport:
        students = list(self.db.scalars(select(User).where(User.role == UserRole.STUDENT)))
        profiles_by_user = {
            profile.user_id: profile for profile in self.db.scalars(select(StudentLearningProfile))
        }
        users_with_recommendation_log = set(self.db.scalars(select(RecommendationLog.user_id).distinct()))

        students_without_diagnosis: list[dict] = []
        students_without_recommendation: list[dict] = []
        for student in students:
            profile = profiles_by_user.get(student.id)
            has_diagnosis = bool(profile and profile.cognitive_issues)
            if not has_diagnosis:
                students_without_diagnosis.append({"user_id": student.id, "name": student.name, "email": student.email})
                continue
            if student.id not in users_with_recommendation_log:
                students_without_recommendation.append({"user_id": student.id, "name": student.name, "email": student.email})

        recommendations_without_content = [
            {"id": log.id, "user_id": log.user_id, "action_type": log.action_type, "target_issue": log.target_issue}
            for log in self.db.scalars(
                select(RecommendationLog).where(
                    RecommendationLog.lesson_id.is_(None),
                    RecommendationLog.exercise_id.is_(None),
                    RecommendationLog.target_hub.is_(None),
                )
            )
        ]

        targeted_codes: set[str] = set()
        for code_list in self.db.scalars(select(Lesson.targets)):
            targeted_codes.update(code_list or [])
        for code_list in self.db.scalars(select(Exercise.targets)):
            targeted_codes.update(code_list or [])
        for code_list in self.db.scalars(select(AIGeneratedGame.targets).where(AIGeneratedGame.status == "approved")):
            targeted_codes.update(code_list or [])
        issues_without_content = sorted(ISSUE_CODES - targeted_codes)

        stale_cutoff = datetime.now(UTC) - timedelta(days=_STALE_ISSUE_DAYS)
        issues_without_progress: list[dict] = []
        for profile in profiles_by_user.values():
            for code, record in (profile.cognitive_issues or {}).items():
                if record.get("state") not in _ACTIVE_STATES:
                    continue
                updated_at_raw = record.get("updated_at")
                if not updated_at_raw:
                    continue
                updated_at = datetime.fromisoformat(updated_at_raw)
                if updated_at.tzinfo is None:
                    updated_at = updated_at.replace(tzinfo=UTC)
                if updated_at < stale_cutoff:
                    issues_without_progress.append(
                        {"user_id": profile.user_id, "code": code, "state": record.get("state"), "updated_at": updated_at_raw}
                    )

        return AdminAdaptiveHealthReport(
            students_without_diagnosis=students_without_diagnosis,
            students_without_recommendation=students_without_recommendation,
            recommendations_without_content=recommendations_without_content,
            issues_without_content=issues_without_content,
            issues_without_progress=issues_without_progress,
        )
