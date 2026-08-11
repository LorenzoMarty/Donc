"""Historico de versoes de conteudo — P2c Bloco 2 (REQ-6..10).

`record_version` grava o snapshot do conteudo ANTES de uma edicao pos-criacao sobrescrever —
chame sempre antes de mutar o objeto, nunca depois. Nao commita (mesmo padrao dos outros helpers
de escrita do projeto — caller decide o boundary da transacao).
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import ContentVersion


def record_version(
    db: Session,
    *,
    content_type: str,
    content_id: int,
    snapshot: dict,
    edited_by: int | None,
    reason: str | None = None,
) -> ContentVersion:
    version = ContentVersion(
        content_type=content_type,
        content_id=content_id,
        snapshot=snapshot,
        edited_by=edited_by,
        reason=reason,
    )
    db.add(version)
    return version


def list_versions(db: Session, *, content_type: str, content_id: int) -> list[ContentVersion]:
    return list(
        db.scalars(
            select(ContentVersion)
            .where(ContentVersion.content_type == content_type, ContentVersion.content_id == content_id)
            .order_by(ContentVersion.created_at.desc(), ContentVersion.id.desc())
        )
    )
