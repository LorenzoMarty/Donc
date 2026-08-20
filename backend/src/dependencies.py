import logging
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.database.session import get_db
from src.config.security import decode_access_token
from src.middlewares.errors import AppError
from src.models import User, UserRole
from src.repositories.users import UserRepository
from src.services.streak_service import touch_last_seen


oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login", auto_error=False)
logger = logging.getLogger("src.dependencies")


def get_current_user(
    request: Request,
    token: Annotated[str | None, Depends(oauth2_scheme)] = None,
    db: Session = Depends(get_db),
) -> User:
    raw_token = token or request.cookies.get("access_token")
    if not raw_token:
        raise AppError("Autenticação obrigatória.", status_code=401, code="not_authenticated")
    if raw_token.startswith("Bearer "):
        raw_token = raw_token.replace("Bearer ", "", 1)
    try:
        payload = decode_access_token(raw_token)
        user_id = int(payload.get("sub"))
    except Exception as exc:
        raise AppError("Sessão inválida ou expirada.", status_code=401, code="invalid_token") from exc

    user = UserRepository(db).get_by_id(user_id)
    if not user:
        raise AppError("Usuário não encontrado.", status_code=401, code="user_not_found")

    try:
        user = touch_last_seen(db, user)
    except Exception:
        logger.exception("touch_last_seen failed for user_id=%s", user.id)
        db.rollback()

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise AppError("Acesso restrito a administradores.", status_code=403, code="admin_required")
    return current_user
