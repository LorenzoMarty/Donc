"""RecommendationEngine — P0 nucleo adaptativo.

Camada de dominio deterministica: `StudentLearningProfile` -> lista de `RecommendedAction`.
Sem chamada de LLM — a recomendacao e uma consequencia direta e explicavel do estado dos
`cognitive_issues` (ver `src.memory.cognitive_issues`), vinculada a conteudo que ja existe
(`Module.target_competencies` para aulas/exercicios, hub cognitivo para jogos).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.memory.confidence import Confidence, compute_confidence
from src.models import Exercise, ExerciseAnswer, GameAttempt, LearningOutcome, Lesson, LessonProgress, Module, StudentLearningProfile

# Janela de "atividade recente" — conteudo concluido dentro dela e deprioritado (nao excluido:
# se for a unica opcao compativel com o issue, ainda e recomendado) em favor de algo fresco.
RECENT_ACTIVITY_DAYS = 3
EXERCISE_ESTIMATED_MINUTES = 5

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

# Inverso de COMPETENCY_FOR_ISSUE — uma competencia pode mapear pra mais de um issue.
ISSUES_FOR_COMPETENCY: dict[str, list[str]] = {}
for _issue, _competency in COMPETENCY_FOR_ISSUE.items():
    ISSUES_FOR_COMPETENCY.setdefault(_competency, []).append(_issue)


def effective_targets(explicit: list[str] | None, module_target_competencies: list[str] | None) -> list[str]:
    """REQ-4: targets explicitos de Lesson/Exercise vencem; se vazios, deriva candidatos a partir
    de `Module.target_competencies` (fallback de leitura, nunca escreve de volta no conteudo)."""
    if explicit:
        return explicit
    if not module_target_competencies:
        return []
    issues: list[str] = []
    for competency in module_target_competencies:
        for issue in ISSUES_FOR_COMPETENCY.get(competency, []):
            if issue not in issues:
                issues.append(issue)
    return issues


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
    confidence: Confidence | None = None


_RECENT_TREND_WINDOW = 2
_EVIDENCE_NOTE_MIN_COUNT = 2


class RecommendationEngine:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _evidence_count(self, user_id: int, code: str) -> int:
        return (
            self.db.scalar(
                select(func.count()).select_from(LearningOutcome).where(
                    LearningOutcome.user_id == user_id, LearningOutcome.cognitive_issue_code == code
                )
            )
            or 0
        )

    def _recent_positive_count(self, user_id: int, code: str) -> int:
        """REQ-11: quantos dos ultimos `_RECENT_TREND_WINDOW` LearningOutcome do issue ja sao
        positivos — issue "recuperando" (recente ja positivo) cede prioridade a um issue ainda
        so negativo, mesmo com mesmo estado/negative_count."""
        rows = self.db.scalars(
            select(LearningOutcome.direction)
            .where(LearningOutcome.user_id == user_id, LearningOutcome.cognitive_issue_code == code)
            .order_by(LearningOutcome.created_at.desc())
            .limit(_RECENT_TREND_WINDOW)
        ).all()
        return sum(1 for direction in rows if direction == "positive")

    def _top_active_issue(self, cognitive_issues: dict, user_id: int | None) -> tuple[str, dict] | None:
        active = [(code, rec) for code, rec in (cognitive_issues or {}).items() if rec.get("state") in _ACTIVE_STATES]
        if not active:
            return None

        def sort_key(item: tuple[str, dict]) -> tuple[int, int, int]:
            code, rec = item
            state_priority = 0 if rec.get("state") == "DETECTED" else 1
            recent_positive = self._recent_positive_count(user_id, code) if user_id is not None else 0
            return (state_priority, recent_positive, -int(rec.get("negative_count", 0)))

        return sorted(active, key=sort_key)[0]

    def _evidence_note(self, user_id: int, code: str) -> str:
        """REQ-14: menciona quantidade de evidencia quando isso faz diferenca (>= 2 registros —
        uma unica evidencia isolada nao acrescenta informacao util ao motivo)."""
        count = self._evidence_count(user_id, code)
        if count < _EVIDENCE_NOTE_MIN_COUNT:
            return ""
        return f" Baseado em {count} evidências recentes."

    def recommend(self, profile: StudentLearningProfile, user_id: int | None = None) -> list[RecommendedAction]:
        cognitive_issues = profile.cognitive_issues or {}
        if user_id is not None:
            # REQ-12: nenhum issue sem nenhuma evidencia (LearningOutcome) e recomendado — estado
            # herdado de antes da migration (REQ-7) ou sinal sem registro nao vira recomendacao.
            cognitive_issues = {
                code: rec for code, rec in cognitive_issues.items() if self._evidence_count(user_id, code) > 0
            }

        top = self._top_active_issue(cognitive_issues, user_id)
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
        confidence = compute_confidence(self.db, user_id=user_id, code=code) if user_id is not None else None
        evidence_note = self._evidence_note(user_id, code) if user_id is not None else ""
        actions: list[RecommendedAction] = []

        lesson = self._find_lesson_for_issue(code, user_id)
        if lesson is not None:
            actions.append(
                RecommendedAction(
                    type="LESSON",
                    target_issue=code,
                    target=str(lesson.id),
                    reason=f"Seu desempenho recente indica que {label}. Esta aula trabalha diretamente esse ponto.{evidence_note}",
                    estimated_minutes=lesson.duration_minutes or 8,
                    confidence=confidence,
                )
            )

        exercise = self._find_exercise_for_issue(code, user_id)
        if exercise is not None:
            actions.append(
                RecommendedAction(
                    type="EXERCISE",
                    target_issue=code,
                    target=str(exercise.id),
                    reason=f"Seu desempenho recente indica que {label}. Este exercício treina exatamente esse ponto.{evidence_note}",
                    estimated_minutes=EXERCISE_ESTIMATED_MINUTES,
                    confidence=confidence,
                )
            )

        hub = HUB_FOR_ISSUE.get(code)
        if hub:
            actions.append(
                RecommendedAction(
                    type="GAME",
                    target_issue=code,
                    target=hub,
                    reason=f"Seu desempenho recente indica que {label}. Um treino curto ajuda a corrigir isso na prática.{evidence_note}",
                    estimated_minutes=6,
                    confidence=confidence,
                )
            )

        if user_id is not None:
            actions = self._order_by_variety(actions, user_id)

        return actions

    def _find_lesson_for_issue(self, code: str, user_id: int | None):
        modules_by_id = {m.id: m for m in self.db.scalars(select(Module).order_by(Module.order))}
        lessons = self.db.scalars(select(Lesson).order_by(Lesson.order)).all()
        matches = []
        for lesson in lessons:
            module = modules_by_id.get(lesson.module_id)
            module_competencies = module.target_competencies if module else []
            if code in effective_targets(lesson.targets, module_competencies):
                matches.append(lesson)
        if not matches:
            return None
        if user_id is None:
            return matches[0]
        recent_ids = self._recently_completed_lesson_ids(user_id)
        fresh = [lesson for lesson in matches if lesson.id not in recent_ids]
        return (fresh or matches)[0]

    def _find_exercise_for_issue(self, code: str, user_id: int | None):
        exercises = self.db.scalars(select(Exercise).order_by(Exercise.id)).all()
        matches = [exercise for exercise in exercises if code in (exercise.targets or [])]
        if not matches:
            return None
        if user_id is None:
            return matches[0]
        recent_ids = self._recently_answered_exercise_ids(user_id)
        fresh = [exercise for exercise in matches if exercise.id not in recent_ids]
        return (fresh or matches)[0]

    def _recently_completed_lesson_ids(self, user_id: int) -> set[int]:
        cutoff = datetime.now(UTC) - timedelta(days=RECENT_ACTIVITY_DAYS)
        rows = self.db.scalars(
            select(LessonProgress.lesson_id).where(
                LessonProgress.user_id == user_id,
                LessonProgress.completed.is_(True),
                LessonProgress.updated_at >= cutoff,
            )
        )
        return set(rows)

    def _recently_answered_exercise_ids(self, user_id: int) -> set[int]:
        cutoff = datetime.now(UTC) - timedelta(days=RECENT_ACTIVITY_DAYS)
        rows = self.db.scalars(
            select(ExerciseAnswer.exercise_id).where(
                ExerciseAnswer.user_id == user_id,
                ExerciseAnswer.answered_at >= cutoff,
            )
        )
        return set(rows)

    def _last_activity_type(self, user_id: int) -> ActionType | None:
        latest_lesson = self.db.scalar(
            select(LessonProgress.updated_at)
            .where(LessonProgress.user_id == user_id, LessonProgress.completed.is_(True))
            .order_by(LessonProgress.updated_at.desc())
            .limit(1)
        )
        latest_exercise = self.db.scalar(
            select(ExerciseAnswer.answered_at)
            .where(ExerciseAnswer.user_id == user_id)
            .order_by(ExerciseAnswer.answered_at.desc())
            .limit(1)
        )
        latest_game = self.db.scalar(
            select(GameAttempt.completed_at)
            .where(GameAttempt.user_id == user_id)
            .order_by(GameAttempt.completed_at.desc())
            .limit(1)
        )
        candidates: list[tuple[datetime, ActionType]] = []
        if latest_lesson is not None:
            candidates.append((latest_lesson, "LESSON"))
        if latest_exercise is not None:
            candidates.append((latest_exercise, "EXERCISE"))
        if latest_game is not None:
            candidates.append((latest_game, "GAME"))
        if not candidates:
            return None
        return max(candidates, key=lambda item: item[0])[1]

    def _order_by_variety(self, actions: list[RecommendedAction], user_id: int) -> list[RecommendedAction]:
        last_type = self._last_activity_type(user_id)
        if last_type is None:
            return actions
        return sorted(actions, key=lambda action: 1 if action.type == last_type else 0)
