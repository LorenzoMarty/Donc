"""REQ-26: apos onboarding, se nao ha diagnostico (has_data=false), o aluno recebe uma
recomendacao valida (nunca um estado vazio sem direcao) — fallback pra ESSAY, a fonte mais rica
de diagnostico inicial.

O fixture `client` sobrescreve `get_current_user` globalmente pra sempre devolver o aluno demo
(aluno@demo.com) — registrar um usuario novo via HTTP nao troca a identidade efetiva da sessao.
Por isso simulamos "aluno recem-chegado" resetando o perfil/onboarding do usuario demo
diretamente no banco, seguindo o mesmo padrao de isolamento ja usado nos outros testes da P1.
"""

from sqlalchemy import select

from src.database.session import SessionLocal
from src.memory.profile import get_or_create_learning_profile
from src.models import StudentProfile, User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def _reset_to_fresh_student_state() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        profile = get_or_create_learning_profile(db, user.id)
        profile.weak_competencies = {}
        profile.recurring_errors = []
        profile.repertories_used = []
        profile.recommendations = []
        profile.latest_competencies = {}
        profile.score_trend = []
        profile.cognitive_issues = {}
        onboarding = db.scalar(select(StudentProfile).where(StudentProfile.user_id == user.id))
        if onboarding:
            db.delete(onboarding)
        db.commit()
    finally:
        db.close()


def test_fresh_student_without_data_gets_essay_fallback_recommendation(client):
    _reset_to_fresh_student_state()

    profile = api_data(client.get("/api/v1/ai/learning-profile"))
    assert profile["has_data"] is False

    actions = api_data(client.get("/api/v1/ai/recommended-actions"))
    assert len(actions) == 1
    assert actions[0]["type"] == "ESSAY"
    assert actions[0]["reason"]


def test_fresh_student_dashboard_next_action_is_never_empty(client):
    _reset_to_fresh_student_state()

    dashboard = api_data(client.get("/api/v1/dashboard"))
    assert dashboard["next_action"]["type"] == "ESSAY"
    assert dashboard["next_action"]["reason"]


def test_fresh_student_can_skip_onboarding_and_still_get_recommendation(client):
    _reset_to_fresh_student_state()

    onboarding = api_data(client.get("/api/v1/auth/onboarding"))
    assert onboarding["completed"] is False

    actions = api_data(client.get("/api/v1/ai/recommended-actions"))
    assert len(actions) >= 1
