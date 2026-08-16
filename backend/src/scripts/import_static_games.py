"""Spec migrar-jogos-estaticos-para-banco REQ-2: importa o catalogo estatico (exportado pelo
frontend em JSON, ver `frontend/src/app/api/export-static-games-tmp/route.ts`) pra
`AIGeneratedGame`. Idempotente — reexecutar nao duplica, marca cada jogo importado via
`admin_notes = "static_import:<id-estatico-original>"`.

Uso:
    python -m src.scripts.import_static_games caminho/pro/static_games_export.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal
from src.memory.cognitive_issues import HUB_TO_ISSUE
from src.models.events import AIGeneratedGame
from src.utils.game_questions import QUESTION_BASED_ENGINES, assign_question_ids

# engine -> chave do payload no JSON exportado (GameDefinition do frontend).
_PAYLOAD_KEY_BY_ENGINE = {
    "classify": "classify",
    "order": "order",
    "fill-blank": "fillBlank",
    "duel": "duel",
    "argument-escalation": "escalation",
    "artificiality": "artificiality",
    "corrector": "corrector",
    "essay-collapse": "essayCollapse",
    "text-surgery": "textSurgery",
    "survival": "survival",
}


def _import_marker(static_id: str) -> str:
    return f"static_import:{static_id}"


def _derive_targets(hubs: list[str]) -> list[str]:
    return [HUB_TO_ISSUE[h] for h in hubs if h in HUB_TO_ISSUE]


def _questions_payload(raw_questions: list[dict]) -> list[dict]:
    converted = [
        {
            "prompt": q.get("prompt", ""),
            "options": q.get("options", []),
            "answer_index": q.get("answerIndex", 0),
            "explanation": q.get("explanation", ""),
            "status": "approved",
        }
        for q in raw_questions
    ]
    backfilled, _ = assign_question_ids(converted)
    return backfilled


def import_static_games(db: Session, export_path: Path) -> dict:
    """Retorna resumo `{imported: [...], skipped: [...]}` — nao faz commit (chamador decide)."""
    games = json.loads(export_path.read_text(encoding="utf-8"))

    existing_markers = {
        row[0]
        for row in db.execute(
            select(AIGeneratedGame.admin_notes).where(AIGeneratedGame.admin_notes.isnot(None))
        ).all()
    }

    imported: list[str] = []
    skipped: list[str] = []
    old_to_new_id: dict[str, int] = {}
    survival_rows: list[tuple[AIGeneratedGame, list[str]]] = []

    for game in games:
        static_id = game["id"]
        marker = _import_marker(static_id)
        if marker in existing_markers:
            skipped.append(static_id)
            continue

        engine = game["engine"]
        row = AIGeneratedGame(
            name=game["name"],
            category=game["category"],
            skill=game.get("skill") or game["name"],
            difficulty={"Essencial": "easy", "Intermediario": "medium", "Avancado": "hard"}.get(
                game.get("difficulty", ""), "medium"
            ),
            engine=engine,
            status="approved",
            admin_notes=marker,
            targets=_derive_targets(game.get("hubs", [])),
            description=game.get("description"),
            thumbnail=game.get("thumbnail"),
            estimated_time=game.get("estimatedTime"),
        )
        if engine in QUESTION_BASED_ENGINES:
            row.questions = _questions_payload(game.get("questions") or [])
        else:
            payload_key = _PAYLOAD_KEY_BY_ENGINE.get(engine)
            payload = game.get(payload_key) if payload_key else None
            row.payload = payload
            if engine == "survival":
                survival_rows.append((row, (payload or {}).get("poolGameIds") or []))

        db.add(row)
        db.flush()  # popula row.id pro remapeamento do survival abaixo
        old_to_new_id[static_id] = row.id
        imported.append(static_id)

    for row, pool_ids in survival_rows:
        remapped = [f"ai-{old_to_new_id[pid]}" for pid in pool_ids if pid in old_to_new_id]
        row.payload = {**(row.payload or {}), "poolGameIds": remapped}

    return {"imported": imported, "skipped": skipped}


def main() -> None:
    if len(sys.argv) != 2:
        print(__doc__)
        raise SystemExit(1)
    export_path = Path(sys.argv[1])
    db = SessionLocal()
    try:
        summary = import_static_games(db, export_path)
        db.commit()
        print(f"Importados: {len(summary['imported'])} — {summary['imported']}")
        print(f"Pulados (ja importados): {len(summary['skipped'])} — {summary['skipped']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
