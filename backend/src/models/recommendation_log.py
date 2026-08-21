"""RecommendationLog — tracking do ciclo recomendacao -> resultado (P2a Bloco 5, REQ-15..REQ-18).

Fecha o ciclo `Recommendation -> Started -> Completed -> LearningOutcome -> Profile update`
(ver `memory/recommendation_log.py`). Vinculo frouxo (REQ-18): uma atividade concluida sem ter
vindo de uma recomendacao continua funcionando normalmente — so nao fecha nenhum
`RecommendationLog` (nenhum campo aqui bloqueia o fluxo normal de jogo/exercicio/aula).
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database.session import Base


class RecommendationLog(Base):
    __tablename__ = "recommendation_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(20), nullable=False)  # LESSON | EXERCISE | GAME | ESSAY
    target_issue: Mapped[str | None] = mapped_column(
        String(40), ForeignKey("cognitive_issues.code"), nullable=True, index=True
    )
    # Substituem `target` genérico (auditoria arquitetural 2026-08-21) — só um preenchido,
    # conforme `action_type`. GAME aponta pra um hub (`target_hub`), que não é entidade
    # persistida (não existe tabela de hub) — FK real só é possível pra LESSON/EXERCISE.
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True)
    exercise_id: Mapped[int | None] = mapped_column(ForeignKey("exercises.id", ondelete="SET NULL"), nullable=True)
    target_hub: Mapped[str | None] = mapped_column(String(40), nullable=True)
    shown_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    learning_outcome_id: Mapped[int | None] = mapped_column(
        ForeignKey("learning_outcomes.id", ondelete="SET NULL"), nullable=True
    )
