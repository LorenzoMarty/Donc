"""RecommendationEngine — P0 nucleo adaptativo.

Camada de dominio deterministica: `StudentLearningProfile` -> lista de `RecommendedAction`.
Sem chamada de LLM — a recomendacao e uma consequencia direta e explicavel do estado dos
`cognitive_issues` (ver `src.memory.cognitive_issues`), vinculada a conteudo que ja existe
(`Module.target_competencies` para aulas/exercicios, hub cognitivo para jogos).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import Module, StudentLearningProfile

ActionType = Literal["LESSON", "EXERCISE", "GAME", "ESSAY"]

# Competencia ENEM (C1-C5) mais associada a cada problema cognitivo — usado pra buscar
# aulas/exercicios via `Module.target_competencies` (ja existente, sem migracao nova).
COMPETENCY_FOR_ISSUE: dict[str, str] = {
    "TEXT_ROBOTIC": "c1",
    "REPETITIVE_IDEAS": "c4",
    "WEAK_REPERTOIRE": "c2",
    "SHALLOW_ARGUMENTATION": "c3",
    "WEAK_THESIS": "c2",
    "C3_LOW": "c3",
    "FORMULAIC_CONCLUSION": "c5",
}

# Hub cognitivo (features/gamification/symptoms.ts::HUBS) que treina cada problema — o frontend
# resolve hub -> jogo real via `gamesForHub`/`recommendHub`; o backend so aponta o hub certo.
HUB_FOR_ISSUE: dict[str, str] = {
    "TEXT_ROBOTIC": "texto-robotico",
    "REPETITIVE_IDEAS": "repete-ideias",
    "WEAK_REPERTOIRE": "repertorio-nao-encaixa",
    "SHALLOW_ARGUMENTATION": "nao-aprofunda",
    "WEAK_THESIS": "introducao-sem-tese",
    "C3_LOW": "perde-na-c3",
    "FORMULAIC_CONCLUSION": "conclusao-formula",
}

ISSUE_LABEL: dict[str, str] = {
    "TEXT_ROBOTIC": "seu texto parece robótico",
    "REPETITIVE_IDEAS": "você repete ideias",
    "WEAK_REPERTOIRE": "seu repertório não encaixa",
    "SHALLOW_ARGUMENTATION": "seu texto não aprofunda os argumentos",
    "WEAK_THESIS": "sua introdução não cria uma tese clara",
    "C3_LOW": "você perde pontos na Competência 3",
    "FORMULAIC_CONCLUSION": "sua conclusão segue uma fórmula pronta",
}

_ACTIVE_STATES = {"DETECTED", "TRAINING"}


@dataclass
class RecommendedAction:
    type: ActionType
    target_issue: str | None
    target: str | None
    reason: str
    estimated_minutes: int


def _top_active_issue(cognitive_issues: dict) -> tuple[str, dict] | None:
    active = [(code, rec) for code, rec in (cognitive_issues or {}).items() if rec.get("state") in _ACTIVE_STATES]
    if not active:
        return None

    def sort_key(item: tuple[str, dict]) -> tuple[int, int]:
        _, rec = item
        state_priority = 0 if rec.get("state") == "DETECTED" else 1
        return (state_priority, -int(rec.get("negative_count", 0)))

    return sorted(active, key=sort_key)[0]


class RecommendationEngine:
    def __init__(self, db: Session) -> None:
        self.db = db

    def recommend(self, profile: StudentLearningProfile) -> list[RecommendedAction]:
        top = _top_active_issue(profile.cognitive_issues)
        if not top:
            return [
                RecommendedAction(
                    type="ESSAY",
                    target_issue=None,
                    target=None,
                    reason="Nenhum problema cognitivo ativo no momento — envie uma redação para continuarmos o diagnóstico.",
                    estimated_minutes=60,
                )
            ]

        code, _record = top
        label = ISSUE_LABEL.get(code, code)
        actions: list[RecommendedAction] = []

        lesson = self._find_lesson_for_issue(code)
        if lesson is not None:
            actions.append(
                RecommendedAction(
                    type="LESSON",
                    target_issue=code,
                    target=str(lesson.id),
                    reason=f"Seu desempenho recente indica que {label}. Esta aula trabalha diretamente esse ponto.",
                    estimated_minutes=8,
                )
            )

        hub = HUB_FOR_ISSUE.get(code)
        if hub:
            actions.append(
                RecommendedAction(
                    type="GAME",
                    target_issue=code,
                    target=hub,
                    reason=f"Seu desempenho recente indica que {label}. Um treino curto ajuda a corrigir isso na prática.",
                    estimated_minutes=6,
                )
            )

        return actions

    def _find_lesson_for_issue(self, code: str):
        competency = COMPETENCY_FOR_ISSUE.get(code)
        if not competency:
            return None
        modules = self.db.scalars(select(Module).order_by(Module.order)).all()
        for module in modules:
            if competency in (module.target_competencies or []):
                lessons = sorted(module.lessons, key=lambda item: item.order)
                if lessons:
                    return lessons[0]
        return None
