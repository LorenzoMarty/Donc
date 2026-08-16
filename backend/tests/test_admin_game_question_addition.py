"""Spec jogo-ia-perguntas-existentes REQ-2/REQ-3/REQ-4/REQ-5/REQ-6: gerar mais perguntas com IA
num jogo ja existente, com revisao granular por pergunta e sem afetar o que ja esta publicado."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import get_current_user, require_admin
from src.main import app
from src.models import AIInteractionLog, ContentVersion, User
from src.models.events import AIGeneratedGame


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def _override_user(email: str):
    def _dep(db: Session = Depends(get_db)) -> User:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        return user

    return _dep


def _seed_approved_game(*, questions=None) -> int:
    db = SessionLocal()
    try:
        game = AIGeneratedGame(
            name="Jogo teste",
            category="argumentacao",
            skill="coesao textual",
            difficulty="medium",
            questions=questions
            if questions is not None
            else [
                {"id": "q1", "prompt": "Pergunta 1", "options": ["a", "b"], "answer_index": 0, "explanation": "e1", "status": "approved"},
                {"id": "q2", "prompt": "Pergunta 2", "options": ["a", "b"], "answer_index": 1, "explanation": "e2", "status": "approved"},
            ],
            status="approved",
            targets=["WEAK_THESIS"],
        )
        db.add(game)
        db.commit()
        db.refresh(game)
        return game.id
    finally:
        db.close()


def test_generate_more_appends_pending_questions_without_touching_existing(client):
    game_id = _seed_approved_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/questions/generate", json={"count": 2})
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 200
    data = api_data(response)
    assert len(data["questions"]) == 4
    old = [q for q in data["questions"] if q["id"] in ("q1", "q2")]
    assert all(q["status"] == "approved" for q in old)
    new = [q for q in data["questions"] if q["id"] not in ("q1", "q2")]
    assert len(new) == 2
    assert all(q["status"] == "pending" for q in new)


def test_generate_more_requires_admin(client):
    game_id = _seed_approved_game()
    response = client.post(f"/api/v1/admin/ai-games/{game_id}/questions/generate", json={"count": 1})
    assert response.status_code in (401, 403)


def test_generate_more_logs_ai_interaction_and_version(client):
    game_id = _seed_approved_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        client.post(f"/api/v1/admin/ai-games/{game_id}/questions/generate", json={"count": 1})
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        log = db.scalar(
            select(AIInteractionLog)
            .where(AIInteractionLog.workflow == "admin_game_question_addition")
            .order_by(AIInteractionLog.id.desc())
        )
        versions = db.scalars(
            select(ContentVersion).where(ContentVersion.content_type == "AIGeneratedGame", ContentVersion.content_id == game_id)
        ).all()
    finally:
        db.close()
    assert log is not None
    assert log.content_id == game_id
    assert len(versions) == 1


def test_published_game_excludes_pending_questions(client):
    game_id = _seed_approved_game(
        questions=[
            {"id": "q1", "prompt": "Pergunta aprovada", "options": ["a", "b"], "answer_index": 0, "explanation": "e1", "status": "approved"},
            {"id": "q2", "prompt": "Pergunta pendente", "options": ["a", "b"], "answer_index": 1, "explanation": "e2", "status": "pending"},
        ]
    )
    original_override = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = _override_user("aluno@demo.com")
    try:
        response = client.get("/api/v1/games/published")
    finally:
        if original_override is not None:
            app.dependency_overrides[get_current_user] = original_override
        else:
            app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    data = api_data(response)
    game = next(g for g in data if g["id"] == game_id)
    prompts = [q["prompt"] for q in game["questions"]]
    assert prompts == ["Pergunta aprovada"]


def test_published_game_treats_missing_status_as_approved():
    """Compat: jogos gravados antes desta mudanca nao tem 'status' na pergunta — devem
    continuar aparecendo pro aluno (backfill implicito, sem re-revisao retroativa)."""
    game_id = _seed_approved_game(
        questions=[
            {"id": "q1", "prompt": "Pergunta legada", "options": ["a", "b"], "answer_index": 0, "explanation": "e1"},
        ]
    )
    from src.services.game_service import GameService

    db = SessionLocal()
    try:
        games = GameService(db).published()
        game = next(g for g in games if g.id == game_id)
        assert game.questions[0].get("prompt") == "Pergunta legada"
    finally:
        db.close()


def test_approve_pending_question_makes_it_visible_to_students(client):
    game_id = _seed_approved_game(
        questions=[
            {"id": "q1", "prompt": "Pergunta 1", "options": ["a", "b"], "answer_index": 0, "explanation": "e1", "status": "approved"},
            {"id": "q2", "prompt": "Pergunta pendente", "options": ["a", "b"], "answer_index": 1, "explanation": "e2", "status": "pending"},
        ]
    )
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/questions/q2/review", json={"action": "approve"})
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 200
    data = api_data(response)
    q2 = next(q for q in data["questions"] if q["id"] == "q2")
    assert q2["status"] == "approved"


def test_reject_pending_question_removes_it(client):
    game_id = _seed_approved_game(
        questions=[
            {"id": "q1", "prompt": "Pergunta 1", "options": ["a", "b"], "answer_index": 0, "explanation": "e1", "status": "approved"},
            {"id": "q2", "prompt": "Pergunta pendente", "options": ["a", "b"], "answer_index": 1, "explanation": "e2", "status": "pending"},
        ]
    )
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/questions/q2/review", json={"action": "reject"})
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 200
    data = api_data(response)
    ids = [q["id"] for q in data["questions"]]
    assert ids == ["q1"]


def test_generate_more_rejects_non_question_engine(client):
    """Spec migrar-jogos-estaticos-para-banco REQ-6: IA de gerar-mais-perguntas so vale pra
    engines baseados em `questions` — engine `classify` (payload proprio) nao tem agente pra isso."""
    db = SessionLocal()
    try:
        game = AIGeneratedGame(
            name="Classifique",
            category="repertorio",
            skill="Repertorio",
            difficulty="easy",
            engine="classify",
            status="approved",
            targets=["WEAK_REPERTOIRE"],
            payload={"instruction": "x", "buckets": [], "items": []},
        )
        db.add(game)
        db.commit()
        db.refresh(game)
        game_id = game.id
    finally:
        db.close()

    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/questions/generate", json={"count": 1})
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 422
    assert response.json()["error"] == "unsupported_engine_for_ai_generation"


def test_review_question_unknown_is_404(client):
    game_id = _seed_approved_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/questions/does-not-exist/review", json={"action": "approve"})
    finally:
        app.dependency_overrides.pop(require_admin, None)
    assert response.status_code == 404


def test_review_question_requires_admin(client):
    game_id = _seed_approved_game(
        questions=[
            {"id": "q1", "prompt": "Pergunta pendente", "options": ["a", "b"], "answer_index": 0, "explanation": "e1", "status": "pending"},
        ]
    )
    response = client.post(f"/api/v1/admin/ai-games/{game_id}/questions/q1/review", json={"action": "approve"})
    assert response.status_code in (401, 403)
