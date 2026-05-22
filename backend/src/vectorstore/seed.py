from __future__ import annotations

import hashlib
import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.models import AIKnowledgeChunk, AIKnowledgeDocument


SEED_PATH = Path(__file__).resolve().parents[1] / "prompts" / "knowledge_seed" / "enem_curated.json"


def seed_knowledge_base(db: Session) -> None:
    if not SEED_PATH.exists():
        return
    try:
        items = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    except Exception:
        return

    client = _embedding_client()
    inserted = False
    for item in items:
        content = str(item.get("content", "")).strip()
        if not content:
            continue
        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
        exists = db.scalar(select(AIKnowledgeDocument.id).where(AIKnowledgeDocument.content_hash == content_hash))
        if exists:
            continue
        document = AIKnowledgeDocument(
            title=str(item.get("title", "Documento ENEM")),
            category=str(item.get("category", "general")),
            source=str(item.get("source", "seed")),
            content=content,
            content_hash=content_hash,
            meta=dict(item.get("meta") or {}),
        )
        db.add(document)
        db.flush()
        for index, chunk in enumerate(_chunk_text(content)):
            db.add(
                AIKnowledgeChunk(
                    document_id=document.id,
                    chunk_index=index,
                    content=chunk,
                    embedding=_embed(client, chunk),
                    meta={"seed": "enem_curated"},
                )
            )
        inserted = True
    if inserted:
        db.commit()


def _chunk_text(content: str, *, max_chars: int = 900) -> list[str]:
    paragraphs = [paragraph.strip() for paragraph in content.split("\n") if paragraph.strip()]
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        if current and len(current) + len(paragraph) + 2 > max_chars:
            chunks.append(current)
            current = paragraph
        else:
            current = f"{current}\n\n{paragraph}".strip()
    if current:
        chunks.append(current)
    return chunks or [content[:max_chars]]


def _embedding_client():
    if not settings.openai_api_key:
        return None
    try:
        from openai import OpenAI

        return OpenAI(api_key=settings.openai_api_key)
    except Exception:
        return None


def _embed(client, content: str) -> list[float] | None:
    if client is None:
        return None
    try:
        response = client.embeddings.create(model=settings.openai_embedding_model, input=content)
        return list(response.data[0].embedding)
    except Exception:
        return None

