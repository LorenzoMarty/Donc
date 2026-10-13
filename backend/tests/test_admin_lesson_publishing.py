"""Aulas de terceiros: rascunho invisível pro aluno, publicar exige vídeo real, seed fora de produção."""

from uuid import uuid4

from fastapi import Depends
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker

from src.config.settings import settings
from src.database.session import Base, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import Module, User
from src.services.seed import seed_database


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def _data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def _create_draft(client, suffix: str) -> tuple[dict, dict]:
    modules = _data(
        client.post(
            "/api/v1/admin/modules",
            json={"title": f"Mod {suffix}", "slug": f"mod-{suffix}", "description": "Modulo para testar publicacao."},
        )
    )
    module = next(item for item in modules if item["title"] == f"Mod {suffix}")
    lesson = _data(
        client.post(
            f"/api/v1/admin/modules/{module['id']}/lessons",
            json={"title": f"Aula {suffix}", "description": "Aula de terceiros em rascunho.", "summary": "Resumo suficientemente longo."},
        )
    )
    return module, lesson


def _student_lesson_ids(client) -> set[int]:
    return {lesson["id"] for module in _data(client.get("/api/v1/lessons/modules")) for lesson in module["lessons"]}


def test_draft_hidden_from_student_until_published_with_real_video(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        _, lesson = _create_draft(client, uuid4().hex[:8])
        assert lesson["published"] is False
        assert lesson["video_url"] == ""  # sem fallback pro placeholder

        assert lesson["id"] not in _student_lesson_ids(client)
        assert client.get(f"/api/v1/lessons/{lesson['id']}").status_code == 404

        blocked = client.patch(f"/api/v1/admin/lessons/{lesson['id']}", json={"published": True})
        assert blocked.status_code == 400
        assert blocked.json()["error"] == "lesson_video_required"

        placeholder = client.patch(
            f"/api/v1/admin/lessons/{lesson['id']}",
            json={"video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "published": True},
        )
        assert placeholder.status_code == 400

        ok = client.patch(
            f"/api/v1/admin/lessons/{lesson['id']}",
            json={"video_url": "https://www.youtube.com/embed/abc123XYZ_-", "published": True},
        )
        assert ok.status_code == 200
        assert lesson["id"] in _student_lesson_ids(client)
        # 403 = modulo bloqueado pela progressao (existe); o que importa e deixar de ser 404.
        assert client.get(f"/api/v1/lessons/{lesson['id']}").status_code in (200, 403)

        unpublished = client.patch(f"/api/v1/admin/lessons/{lesson['id']}", json={"published": False})
        assert unpublished.status_code == 200
        assert lesson["id"] not in _student_lesson_ids(client)
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_production_seed_does_not_create_demo_catalog(monkeypatch, tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'prod_seed.db'}")
    Base.metadata.create_all(bind=engine)
    monkeypatch.setattr(settings, "environment", "production")
    with sessionmaker(bind=engine)() as db:
        seed_database(db, include_demo_data=False)
        assert db.scalar(select(func.count(Module.id))) == 0
    engine.dispose()
