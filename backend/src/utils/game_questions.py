"""P3a REQ-1: id estavel por pergunta de AIGeneratedGame.questions — o array e indexado por
posicao hoje, entao add/remove/reorder/regenerar 1 pergunta precisa de uma referencia que nao
mude quando outras perguntas mudam de posicao."""

from __future__ import annotations

import uuid


def assign_question_ids(questions: list[dict]) -> tuple[list[dict], bool]:
    """Preenche `id` nas perguntas que ainda nao tem — idempotente, nao mexe em id existente."""
    changed = False
    updated: list[dict] = []
    for question in questions:
        if question.get("id"):
            updated.append(question)
            continue
        updated.append({**question, "id": uuid.uuid4().hex[:8]})
        changed = True
    return updated, changed
