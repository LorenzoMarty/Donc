"""REQ-14: apos uma nova correcao de redacao, a recomendacao seguinte reflete o resultado mais
recente — sem chamar o pipeline de IA (usa update_learning_profile diretamente, ja testado em
isolamento em tests/unit/test_learning_profile_update.py)."""

from sqlalchemy import select

from src.agents.schemas import EssayCorrectionResult
from src.database.session import SessionLocal
from src.memory.profile import update_learning_profile
from src.models import User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def _correction(**overrides) -> EssayCorrectionResult:
    base = dict(
        total_score=800,
        competency_1=160,
        competency_2=160,
        competency_3=160,
        competency_4=160,
        competency_5=160,
        strengths=["Boa argumentacao"],
        errors=["Nenhum erro grave"],
        suggestions=["Continue assim"],
        feedback="Redacao consistente, mantenha o padrao de organizacao textual demonstrado aqui.",
        recurrent_patterns=[],
    )
    base.update(overrides)
    return EssayCorrectionResult(**base)


def _reset_issues() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        from src.memory.profile import get_or_create_learning_profile

        profile = get_or_create_learning_profile(db, user.id)
        profile.cognitive_issues = {}
        db.commit()
        return user.id
    finally:
        db.close()


def test_recommendation_reflects_most_recent_correction(client):
    user_id = _reset_issues()

    db = SessionLocal()
    try:
        update_learning_profile(db, user_id=user_id, correction=_correction(competency_2=100))
        db.commit()
    finally:
        db.close()

    actions = api_data(client.get("/api/v1/ai/recommended-actions"))
    assert any(a["target_issue"] == "WEAK_THESIS" for a in actions)

    db = SessionLocal()
    try:
        from src.memory.profile import get_or_create_learning_profile

        profile = get_or_create_learning_profile(db, user_id)
        profile.cognitive_issues = {}
        db.commit()
        update_learning_profile(db, user_id=user_id, correction=_correction(competency_5=80))
        db.commit()
    finally:
        db.close()

    actions_after = api_data(client.get("/api/v1/ai/recommended-actions"))
    assert any(a["target_issue"] == "FORMULAIC_CONCLUSION" for a in actions_after)
    assert not any(a["target_issue"] == "WEAK_THESIS" for a in actions_after)

    # Nao deixar estado vazando pros proximos testes que compartilham o mesmo usuario demo.
    db = SessionLocal()
    try:
        from src.memory.profile import get_or_create_learning_profile

        profile = get_or_create_learning_profile(db, user_id)
        profile.cognitive_issues = {}
        db.commit()
    finally:
        db.close()
