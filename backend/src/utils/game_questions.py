"""P3a REQ-1: id estavel por pergunta de AIGeneratedGame.questions — o array e indexado por
posicao hoje, entao add/remove/reorder/regenerar 1 pergunta precisa de uma referencia que nao
mude quando outras perguntas mudam de posicao.

REQ-3 (jogo-ia-perguntas-existentes): tambem faz backfill de `status` — perguntas gravadas antes
dessa mudanca nao tem o campo e devem ser tratadas como ja aprovadas (sem re-revisao retroativa)."""

from __future__ import annotations

import uuid


def assign_question_ids(questions: list[dict]) -> tuple[list[dict], bool]:
    """Preenche `id`/`status` nas perguntas que ainda nao tem — idempotente, nao mexe em valor existente."""
    changed = False
    updated: list[dict] = []
    for question in questions:
        needs_id = not question.get("id")
        needs_status = not question.get("status")
        if not needs_id and not needs_status:
            updated.append(question)
            continue
        patched = dict(question)
        if needs_id:
            patched["id"] = uuid.uuid4().hex[:8]
        if needs_status:
            patched["status"] = "approved"
        updated.append(patched)
        changed = True
    return updated, changed
