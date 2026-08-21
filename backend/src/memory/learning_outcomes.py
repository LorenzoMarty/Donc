"""Gravacao de LearningOutcome — P2a Bloco 1 (REQ-1..REQ-4).

Peso por fonte (REQ-4): correcao de redacao avalia a competencia inteira (C1-C5) numa unica
peca de texto — evidencia mais forte que um microexercicio ou uma rodada de jogo isolada. A
ordem exigida (ESSAY > GAME == EXERCISE) e o unico contrato garantido; os valores exatos podem
mudar sem quebrar `apply_cognitive_signal` (que aceita `weight` como parametro).
"""

from __future__ import annotations

from typing import Literal

from sqlalchemy.orm import Session

from src.models import LearningOutcome

Source = Literal["ESSAY", "GAME", "EXERCISE"]
Direction = Literal["positive", "negative"]

SOURCE_WEIGHT: dict[Source, int] = {
    "ESSAY": 2,
    "GAME": 1,
    "EXERCISE": 1,
}


def record_learning_outcome(
    db: Session,
    *,
    user_id: int,
    cognitive_issue_code: str,
    source: Source,
    source_id: int,
    direction: Direction,
) -> LearningOutcome:
    """Grava uma evidencia individual. Nao commita — caller decide o boundary da transacao
    (mesmo padrao dos outros helpers de `memory/`, ver `apply_cognitive_signal`).

    `source_id` mantido na assinatura por compat com os 3 call sites existentes (games.py,
    exercise_service.py, profile.py) — internamente vira a FK tipada certa conforme `source`
    (auditoria arquitetural 2026-08-21, `LearningOutcome` não tem mais `source_id` genérico)."""
    outcome = LearningOutcome(
        user_id=user_id,
        cognitive_issue_code=cognitive_issue_code,
        source=source,
        essay_id=source_id if source == "ESSAY" else None,
        game_attempt_id=source_id if source == "GAME" else None,
        exercise_answer_id=source_id if source == "EXERCISE" else None,
        direction=direction,
        weight=SOURCE_WEIGHT[source],
    )
    db.add(outcome)
    return outcome
