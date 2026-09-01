import pytest

from src.config.security import create_access_token
from src.database.session import SessionLocal
from src.dependencies import get_current_user, require_admin
from src.middlewares.errors import AppError
from src.models import User, UserRole


class _FakeRequest:
    """Stub mínimo: get_current_user só lê request.cookies.get('access_token')."""

    def __init__(self, cookies: dict[str, str] | None = None):
        self.cookies = cookies or {}


def _make_user(db, *, role: UserRole = UserRole.STUDENT, email: str) -> User:
    user = User(name="Dep Test User", email=email, hashed_password="not-used-in-this-test", role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_get_current_user_sem_token_lanca_not_authenticated(client, db):  # noqa: ARG001 - client boots tables
    with pytest.raises(AppError) as exc_info:
        get_current_user(_FakeRequest(), token=None, db=db)

    assert exc_info.value.code == "not_authenticated"
    assert exc_info.value.status_code == 401


def test_get_current_user_token_invalido_lanca_invalid_token(client, db):  # noqa: ARG001 - client boots tables
    with pytest.raises(AppError) as exc_info:
        get_current_user(_FakeRequest(), token="isso-nao-e-um-jwt-valido", db=db)

    assert exc_info.value.code == "invalid_token"
    assert exc_info.value.status_code == 401


def test_get_current_user_token_valido_mas_usuario_inexistente_lanca_user_not_found(client, db):  # noqa: ARG001 - client boots tables
    token = create_access_token(subject="999999999")

    with pytest.raises(AppError) as exc_info:
        get_current_user(_FakeRequest(), token=token, db=db)

    assert exc_info.value.code == "user_not_found"
    assert exc_info.value.status_code == 401


def test_get_current_user_le_token_do_cookie_quando_header_ausente(client, db):  # noqa: ARG001 - client boots tables
    user = _make_user(db, email="dep-cookie@example.com")
    token = create_access_token(subject=str(user.id))

    result = get_current_user(_FakeRequest(cookies={"access_token": token}), token=None, db=db)

    assert result.id == user.id


def test_get_current_user_retorna_usuario_valido_via_header_bearer(client, db):  # noqa: ARG001 - client boots tables
    user = _make_user(db, email="dep-bearer@example.com")
    token = create_access_token(subject=str(user.id))

    result = get_current_user(_FakeRequest(), token=f"Bearer {token}", db=db)

    assert result.id == user.id


def test_get_current_user_rejeita_token_de_versao_antiga(client, db):  # noqa: ARG001 - client boots tables
    user = _make_user(db, email="dep-old-session@example.com")
    user.session_version = 2
    db.commit()
    token = create_access_token(subject=str(user.id), extra={"sv": 1})

    with pytest.raises(AppError) as exc_info:
        get_current_user(_FakeRequest(cookies={"access_token": token}), token=None, db=db)

    assert exc_info.value.code == "invalid_token"


def test_require_admin_com_usuario_comum_lanca_admin_required(client, db):  # noqa: ARG001 - client boots tables
    student = _make_user(db, role=UserRole.STUDENT, email="dep-student@example.com")

    with pytest.raises(AppError) as exc_info:
        require_admin(student)

    assert exc_info.value.code == "admin_required"
    assert exc_info.value.status_code == 403


def test_require_admin_com_usuario_admin_retorna_o_proprio_usuario(client, db):  # noqa: ARG001 - client boots tables
    admin = _make_user(db, role=UserRole.ADMIN, email="dep-admin@example.com")

    result = require_admin(admin)

    assert result.id == admin.id
