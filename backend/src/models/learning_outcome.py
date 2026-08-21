"""LearningOutcome — log de evidencias append-only (P2a nucleo pedagogico).

Diferente de `StudentLearningProfile.cognitive_issues` (agregado mutavel, so o estado atual),
`LearningOutcome` preserva cada evidencia individual que contribuiu pra esse estado — permite
reconstruir "por que acreditamos que esse e um problema" (confianca, `memory/confidence.py`) e
"esse treino realmente ajudou" (comparar outcomes antes/depois de uma recomendacao).

Uma atividade concluida sem sinal cognitivo (ex.: aula assistida) NAO gera `LearningOutcome` —
ACTIVITY != LEARNING_OUTCOME e regra de dominio (ver `services/exercise_service.py`,
`routes/games.py::complete_game`, `memory/profile.py::update_learning_profile`).
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database.session import Base


class LearningOutcome(Base):
    __tablename__ = "learning_outcomes"
    __table_args__ = (
        CheckConstraint(
            "CAST(essay_id IS NOT NULL AS INTEGER) + CAST(game_attempt_id IS NOT NULL AS INTEGER)"
            " + CAST(exercise_answer_id IS NOT NULL AS INTEGER) = 1",
            name="ck_learning_outcomes_exactly_one_source",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    cognitive_issue_code: Mapped[str] = mapped_column(
        String(40), ForeignKey("cognitive_issues.code"), nullable=False, index=True
    )
    source: Mapped[str] = mapped_column(String(20), nullable=False)  # ESSAY | GAME | EXERCISE
    # Substituem `source_id` genérico (auditoria arquitetural 2026-08-21) — exatamente uma das
    # três é preenchida, conforme `source` (garantido pelo CheckConstraint acima, não só
    # convenção de app). `record_learning_outcome()` (memory/learning_outcomes.py) escolhe qual.
    essay_id: Mapped[int | None] = mapped_column(ForeignKey("essays.id", ondelete="CASCADE"), nullable=True)
    game_attempt_id: Mapped[int | None] = mapped_column(ForeignKey("game_attempts.id", ondelete="CASCADE"), nullable=True)
    exercise_answer_id: Mapped[int | None] = mapped_column(
        ForeignKey("exercise_answers.id", ondelete="CASCADE"), nullable=True
    )
    direction: Mapped[str] = mapped_column(String(8), nullable=False)  # positive | negative
    weight: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
