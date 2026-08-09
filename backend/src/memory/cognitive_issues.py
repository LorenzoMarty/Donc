"""Maquina de estado de CognitiveIssue — nucleo adaptativo (P0 + P1).

Cada problema cognitivo do aluno tem um estado explicito, alimentado por tres canais (evidencia
de multiplas fontes, nao um unico sinal isolado — REQ-15/P1):
1. Correcao de redacao (`memory/profile.py::update_learning_profile`, via notas C1-C5) — sinal
   competency-driven, um por correcao.
2. Resultado de jogo (`routes/games.py::complete_game`, via `GameAttempt.cognitive_outcomes` ->
   hub -> issue) — sinal por evento cognitivo emitido na sessao.
3. Resposta de exercicio (`services/exercise_service.py::ExerciseService.submit`, via
   `Exercise.targets`) — sinal positivo se `is_correct`, negativo caso contrario, um por resposta.

Regra deliberadamente simples (sem ML/heuristica de texto livre), a mesma para os tres canais:
DETECTED -> TRAINING -> IMPROVING -> MASTERED conforme sinais positivos se acumulam (3 positivos
consecutivos em IMPROVING viram MASTERED); qualquer sinal negativo em IMPROVING/MASTERED regride
para TRAINING (recaida). Um unico sinal, de qualquer canal, nunca pula mais de um estado — a
resistencia contra atualizacao agressiva (REQ-12/P1: "evite atualizar o perfil agressivamente com
uma unica resposta") vem dessa propriedade da maquina de estado em si, nao de um filtro adicional
por canal.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

Direction = Literal["negative", "positive"]
IssueState = Literal["DETECTED", "TRAINING", "IMPROVING", "MASTERED"]

ISSUE_CODES: set[str] = {
    "TEXT_ROBOTIC",
    "REPETITIVE_IDEAS",
    "WEAK_REPERTOIRE",
    "SHALLOW_ARGUMENTATION",
    "WEAK_THESIS",
    "C3_LOW",
    "FORMULAIC_CONCLUSION",
}

# Hubs cognitivos do frontend (features/gamification/symptoms.ts::HUBS) -> codigo de CognitiveIssue.
HUB_TO_ISSUE: dict[str, str] = {
    "texto-robotico": "TEXT_ROBOTIC",
    "repete-ideias": "REPETITIVE_IDEAS",
    "repertorio-nao-encaixa": "WEAK_REPERTOIRE",
    "nao-aprofunda": "SHALLOW_ARGUMENTATION",
    "introducao-sem-tese": "WEAK_THESIS",
    "perde-na-c3": "C3_LOW",
    "conclusao-formula": "FORMULAIC_CONCLUSION",
}

# Eventos cognitivos do frontend (features/gamification/types.ts::CognitiveEvent) -> direcao do
# sinal. Fecha o conjunto valido de eventos que um GameAttempt pode reportar.
EVENT_DIRECTION: dict[str, Direction] = {
    "GENERIC_SENTENCE": "negative",
    "ARTIFICIAL_TONE": "negative",
    "NATURAL_FLOW": "positive",
    "LEXICAL_REPETITION": "negative",
    "LEXICAL_VARIETY": "positive",
    "FORCED_REPERTOIRE": "negative",
    "GOOD_REPERTOIRE_LINK": "positive",
    "SHALLOW_ARGUMENT": "negative",
    "DEEP_ARGUMENT": "positive",
    "VAGUE_THESIS": "negative",
    "SHARP_THESIS": "positive",
    "WEAK_PROGRESSION": "negative",
    "GOOD_PROGRESSION": "positive",
    "FORMULAIC_CONCLUSION": "negative",
    "COMPLETE_INTERVENTION": "positive",
}

_MASTERY_STREAK = 3


def apply_cognitive_signal(
    issues: dict,
    code: str,
    direction: Direction,
    *,
    now: datetime | None = None,
) -> dict:
    """Retorna um novo dict de `cognitive_issues` com o sinal aplicado. Nao muta `issues`."""
    if code not in ISSUE_CODES:
        raise ValueError(f"codigo de problema cognitivo desconhecido: {code}")

    updated = dict(issues)
    record = dict(updated.get(code) or {"state": None, "negative_count": 0, "positive_streak": 0})
    state: IssueState | None = record["state"]

    if direction == "negative":
        record["negative_count"] = int(record.get("negative_count", 0)) + 1
        if state is None:
            state = "DETECTED"
        elif state in ("IMPROVING", "MASTERED"):
            state = "TRAINING"
            record["positive_streak"] = 0
        # DETECTED/TRAINING permanecem no mesmo estado sob sinal negativo.
    else:
        if state is None:
            # Sinal positivo sem problema detectado ainda nao cria registro (nada a treinar).
            return updated
        if state == "DETECTED":
            state = "TRAINING"
        elif state == "TRAINING":
            state = "IMPROVING"
            record["positive_streak"] = 1
        elif state == "IMPROVING":
            record["positive_streak"] = int(record.get("positive_streak", 0)) + 1
            if record["positive_streak"] >= _MASTERY_STREAK:
                state = "MASTERED"
        # MASTERED permanece MASTERED sob sinal positivo.

    record["state"] = state
    record["updated_at"] = (now or datetime.now(UTC)).isoformat()
    updated[code] = record
    return updated
