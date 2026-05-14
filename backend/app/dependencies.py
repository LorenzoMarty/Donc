from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.middlewares.errors import AppError
from app.models import User, UserRole
from app.repositories.users import UserRepository


oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login", auto_error=False)


def get_current_user(
    request: Request,
    token: Annotated[str | None, Depends(oauth2_scheme)] = None,
    db: Session = Depends(get_db),
) -> User:
    raw_token = token or request.cookies.get("access_token")
    if not raw_token:
        raise AppError("Autenticacao obrigatoria.", status_code=401, code="not_authenticated")
    if raw_token.startswith("Bearer "):
        raw_token = raw_token.replace("Bearer ", "", 1)
    try:
        payload = decode_access_token(raw_token)
        user_id = int(payload.get("sub"))
    except Exception as exc:
        raise AppError("Sessao invalida ou expirada.", status_code=401, code="invalid_token") from exc

    user = UserRepository(db).get_by_id(user_id)
    if not user:
        raise AppError("Usuario nao encontrado.", status_code=401, code="user_not_found")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise AppError("Acesso restrito a administradores.", status_code=403, code="admin_required")
    return current_user

