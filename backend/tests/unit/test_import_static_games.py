"""Spec migrar-jogos-estaticos-para-banco REQ-2: script de importacao do catalogo estatico."""

import json
from pathlib import Path

from sqlalchemy import select

from src.database.session import SessionLocal
from src.models.events import AIGeneratedGame
from src.scripts.import_static_games import import_static_games

_SAMPLE = [
    {
        "id": "thesis-tese-vaga",
        "name": "Tese vaga",
        "category": "argumentacao",
        "description": "Treine tese clara.",
        "difficulty": "Intermediario",
        "estimatedTime": "3 min",
        "thumbnail": "argumentacao-tese",
        "engine": "quiz",
        "skill": "Tese",
        "questions": [
            {
                "id": "q1",
                "prompt": "Qual tese e mais clara?",
                "options": ["A", "B", "C", "D"],
                "answerIndex": 0,
                "explanation": "Explica.",
            }
        ],
        "hubs": ["introducao-sem-tese"],
    },
    {
        "id": "repertoire-classify-1",
        "name": "Classifique o repertorio",
        "category": "repertorio",
        "description": "Arraste pro balde certo.",
        "difficulty": "Essencial",
        "estimatedTime": "4 min",
        "thumbnail": "repertorio-classify",
        "engine": "classify",
        "skill": "Repertorio",
        "classify": {
            "instruction": "Arraste cada item.",
            "buckets": [{"id": "b1", "label": "Filosofia"}],
            "items": [{"id": "i1", "text": "Kant", "bucketId": "b1"}],
        },
        "hubs": ["repertorio-nao-encaixa"],
    },
    {
        "id": "challenges-survival",
        "name": "Sobrevivencia geral",
        "category": "desafios-diarios",
        "description": "Sequencia longa.",
        "difficulty": "Avancado",
        "estimatedTime": "10 min",
        "thumbnail": "desafios-survival",
        "engine": "survival",
        "skill": "Geral",
        "survival": {"poolGameIds": ["thesis-tese-vaga"]},
        "hubs": [],
    },
]


def _write_fixture(tmp_path: Path) -> Path:
    path = tmp_path / "export.json"
    path.write_text(json.dumps(_SAMPLE), encoding="utf-8")
    return path


def test_imports_quiz_classify_and_survival_with_remapped_pool(client, tmp_path):
    export_path = _write_fixture(tmp_path)
    db = SessionLocal()
    try:
        summary = import_static_games(db, export_path)
        db.commit()

        assert set(summary["imported"]) == {"thesis-tese-vaga", "repertoire-classify-1", "challenges-survival"}
        assert summary["skipped"] == []

        thesis = db.scalar(select(AIGeneratedGame).where(AIGeneratedGame.admin_notes == "static_import:thesis-tese-vaga"))
        assert thesis.engine == "quiz"
        assert thesis.status == "approved"
        assert thesis.targets == ["WEAK_THESIS"]
        assert thesis.questions[0]["answer_index"] == 0
        assert thesis.questions[0]["status"] == "approved"
        assert thesis.description == "Treine tese clara."

        classify = db.scalar(select(AIGeneratedGame).where(AIGeneratedGame.admin_notes == "static_import:repertoire-classify-1"))
        assert classify.engine == "classify"
        assert classify.payload["buckets"][0]["id"] == "b1"
        assert classify.questions == []

        survival = db.scalar(select(AIGeneratedGame).where(AIGeneratedGame.admin_notes == "static_import:challenges-survival"))
        assert survival.payload["poolGameIds"] == [f"ai-{thesis.id}"]
    finally:
        db.close()


def test_reimport_is_idempotent(client, tmp_path):
    export_path = _write_fixture(tmp_path)
    db = SessionLocal()
    try:
        import_static_games(db, export_path)
        db.commit()

        second = import_static_games(db, export_path)
        db.commit()

        assert second["imported"] == []
        assert set(second["skipped"]) == {"thesis-tese-vaga", "repertoire-classify-1", "challenges-survival"}

        count = db.scalar(
            select(AIGeneratedGame.id).where(AIGeneratedGame.admin_notes == "static_import:thesis-tese-vaga")
        )
        rows = db.scalars(
            select(AIGeneratedGame).where(AIGeneratedGame.admin_notes == "static_import:thesis-tese-vaga")
        ).all()
        assert len(rows) == 1
        assert count is not None
    finally:
        db.close()
