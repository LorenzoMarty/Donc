from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user
from src.middlewares.errors import AppError
from src.models import User
from src.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    PasswordRecoveryRequest,
    RegisterRequest,
    TokenResponse,
    UpdateMeRequest,
    UserRead,
)
from src.schemas.common import ApiResponse, MessageResponse, success_response
from src.services.auth_service import AuthService


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=ApiResponse[TokenResponse], status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> ApiResponse[TokenResponse]:
    service = AuthService(db)
    user = service.register(name=payload.name, email=str(payload.email), password=payload.password)
    return success_response(TokenResponse(access_token=service.token_for(user), user=user), "Conta criada com sucesso.")


@router.post("/login", response_model=ApiResponse[TokenResponse])
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> ApiResponse[TokenResponse]:
    service = AuthService(db)
    user = service.authenticate(email=str(payload.email), password=payload.password)
    return success_response(TokenResponse(access_token=service.token_for(user), user=user), "Login realizado com sucesso.")


@router.get("/me", response_model=ApiResponse[UserRead])
def me(current_user: User = Depends(get_current_user)) -> ApiResponse[UserRead]:
    return success_response(UserRead.model_validate(current_user))


@router.patch("/me", response_model=ApiResponse[UserRead])
def update_me(
    payload: UpdateMeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[UserRead]:
    user = AuthService(db).update_profile(current_user, name=payload.name)
    return success_response(UserRead.model_validate(user), "Perfil atualizado com sucesso.")


@router.post("/change-password", response_model=ApiResponse[MessageResponse])
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[MessageResponse]:
    AuthService(db).change_password(
        current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return success_response(MessageResponse(message="Senha alterada com sucesso."), "Senha alterada com sucesso.")


@router.post("/logout", response_model=ApiResponse[MessageResponse])
def logout() -> ApiResponse[MessageResponse]:
    return success_response(MessageResponse(message="Sessao encerrada no cliente."), "Sessao encerrada.")


@router.post("/password-recovery", response_model=ApiResponse[MessageResponse])
def password_recovery(_: PasswordRecoveryRequest) -> ApiResponse[MessageResponse]:
    raise AppError(
        "Recuperacao de senha por e-mail ainda nao esta configurada.",
        status_code=501,
        code="password_recovery_not_configured",
    )
