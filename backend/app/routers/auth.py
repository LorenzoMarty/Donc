from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.auth import LoginRequest, PasswordRecoveryRequest, RegisterRequest, TokenResponse, UserRead
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    service = AuthService(db)
    user = service.register(name=payload.name, email=str(payload.email), password=payload.password)
    return TokenResponse(access_token=service.token_for(user), user=user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    service = AuthService(db)
    user = service.authenticate(email=str(payload.email), password=payload.password)
    return TokenResponse(access_token=service.token_for(user), user=user)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/logout", response_model=MessageResponse)
def logout() -> MessageResponse:
    return MessageResponse(message="Sessao encerrada no cliente.")


@router.post("/password-recovery", response_model=MessageResponse)
def password_recovery(_: PasswordRecoveryRequest) -> MessageResponse:
    return MessageResponse(message="Se o e-mail existir, enviaremos instrucoes de recuperacao.")
