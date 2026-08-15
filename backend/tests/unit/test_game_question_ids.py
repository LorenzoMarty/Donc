"""P3a REQ-1: cada pergunta de AIGeneratedGame.questions ganha um id estavel.
Spec jogo-ia-perguntas-existentes REQ-3: tambem faz backfill de `status` (default 'approved')."""

from src.utils.game_questions import assign_question_ids


def test_assigns_id_to_questions_missing_one():
    questions = [
        {"prompt": "Pergunta 1", "options": ["a", "b"], "answer_index": 0, "explanation": "..."},
        {"prompt": "Pergunta 2", "options": ["a", "b"], "answer_index": 1, "explanation": "..."},
    ]

    updated, changed = assign_question_ids(questions)

    assert changed is True
    assert all("id" in q and q["id"] for q in updated)
    assert updated[0]["id"] != updated[1]["id"]
    assert all(q["status"] == "approved" for q in updated)


def test_is_idempotent_when_id_and_status_already_present():
    questions = [
        {"id": "abc123", "prompt": "Pergunta 1", "options": ["a", "b"], "answer_index": 0, "explanation": "...", "status": "approved"},
    ]

    updated, changed = assign_question_ids(questions)

    assert changed is False
    assert updated[0]["id"] == "abc123"


def test_backfills_status_on_legacy_question_with_id_but_no_status():
    questions = [
        {"id": "abc123", "prompt": "Pergunta 1", "options": ["a", "b"], "answer_index": 0, "explanation": "..."},
    ]

    updated, changed = assign_question_ids(questions)

    assert changed is True
    assert updated[0]["id"] == "abc123"
    assert updated[0]["status"] == "approved"


def test_only_backfills_missing_ids_leaving_existing_ones_untouched():
    questions = [
        {"id": "keep-me", "prompt": "Pergunta 1", "options": [], "answer_index": 0, "explanation": ""},
        {"prompt": "Pergunta 2", "options": [], "answer_index": 0, "explanation": ""},
    ]

    updated, changed = assign_question_ids(questions)

    assert changed is True
    assert updated[0]["id"] == "keep-me"
    assert updated[1]["id"] != "keep-me"
    assert updated[1]["id"]
