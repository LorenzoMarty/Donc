"""CognitiveIssue — tabela real pro código de "problema cognitivo" (auditoria arquitetural
2026-08-21). Antes era só a constante Python `memory/cognitive_issues.py::ISSUE_CODES`,
referenciada por string solta em `learning_outcomes.cognitive_issue_code`,
`recommendation_logs.target_issue`, e nas colunas JSON `targets`/`cognitive_issues` (Lesson,
Exercise, AIGeneratedGame, StudentLearningProfile — essas continuam validadas só em Python, FK
real não é viável em coluna JSON de array/dict sem redesenhar pra tabela associativa, fora de
escopo desta correção)."""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from src.database.session import Base


class CognitiveIssue(Base):
    __tablename__ = "cognitive_issues"

    code: Mapped[str] = mapped_column(String(40), primary_key=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    hub: Mapped[str] = mapped_column(String(40), nullable=False)
