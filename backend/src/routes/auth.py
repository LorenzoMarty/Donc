from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.database.session import get_db
from src.dependencies import get_current_user
from src.middlewares.errors import AppError
from src.models import User
from src.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    OnboardingRead,
    OnboardingUpdateRequest,
    PasswordRecoveryRequest,
    RegisterRequest,
    TokenResponse,
    UpdateMeRequest,
    UserRead,
)
from src.schemas.common import ApiResponse, MessageResponse, success_response
from src.services.auth_service import AuthService


router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookies(response: Response, *, access_token: str, refresh_token: str) -> None:
    # httpOnly: nunca legível por JS (mitiga exfiltração via XSS). Secure só em produção (dev
    # roda em http puro). SameSite=Lax: cobre o proxy same-origin (Docker) e o same-site
    # localhost:3000->localhost:8000 (dev direto) sem abrir CSRF cross-site.
    secure = settings.environment.lower() == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
        httponly=True,
        secure=secure,
        samesite="lax",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/",
        httponly=True,
        secure=secure,
        samesite="lax",
    )


@router.post("/register", response_model=ApiResponse[TokenResponse], status_code=201)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> ApiResponse[TokenResponse]:
    service = AuthService(db)
    user = service.register(name=payload.name, email=str(payload.email), password=payload.password)
    token = service.token_for(user)
    refresh_token = service.issue_refresh_token(user)
    db.commit()
    _set_session_cookies(response, access_token=token, refresh_token=refresh_token)
    return success_response(TokenResponse(access_token=token, user=user), "Conta criada com sucesso.")


@router.post("/login", response_model=ApiResponse[TokenResponse])
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> ApiResponse[TokenResponse]:
    service = AuthService(db)
    user = service.authenticate(email=str(payload.email), password=payload.password)
    token = service.token_for(user)
    refresh_token = service.issue_refresh_token(user)
    db.commit()
    _set_session_cookies(response, access_token=token, refresh_token=refresh_token)
    return success_response(TokenResponse(access_token=token, user=user), "Login realizado com sucesso.")


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> ApiResponse[TokenResponse]:
    raw_refresh_token = request.cookies.get("refresh_token")
    if not raw_refresh_token:
        raise AppError("Sessão inválida ou expirada.", status_code=401, code="invalid_token")
    service = AuthService(db)
    result = service.rotate_refresh_token(raw_refresh_token)
    if not result:
        response.delete_cookie(key="access_token", path="/")
        response.delete_cookie(key="refresh_token", path="/")
        raise AppError("Sessão inválida ou expirada.", status_code=401, code="invalid_token")
    user, new_refresh_token = result
    token = service.token_for(user)
    _set_session_cookies(response, access_token=token, refresh_token=new_refresh_token)
    return success_response(TokenResponse(access_token=token, user=user), "Sessão renovada.")


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


@router.get("/onboarding", response_model=ApiResponse[OnboardingRead])
def get_onboarding(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[OnboardingRead]:
    profile = AuthService(db).get_onboarding(current_user.id)
    if not profile:
        return success_response(OnboardingRead())
    return success_response(OnboardingRead.model_validate(profile, from_attributes=True))


@router.put("/onboarding", response_model=ApiResponse[OnboardingRead])
def update_onboarding(
    payload: OnboardingUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[OnboardingRead]:
    profile = AuthService(db).update_onboarding(current_user.id, goal=payload.goal, level=payload.level)
    return success_response(OnboardingRead.model_validate(profile, from_attributes=True), "Onboarding salvo.")


@router.post("/logout", response_model=ApiResponse[MessageResponse])
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> ApiResponse[MessageResponse]:
    raw_refresh_token = request.cookies.get("refresh_token")
    if raw_refresh_token:
        AuthService(db).revoke_refresh_token(raw_refresh_token)
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return success_response(MessageResponse(message="Sessao encerrada."), "Sessao encerrada.")


@router.post("/password-recovery", response_model=ApiResponse[MessageResponse])
def password_recovery(_: PasswordRecoveryRequest) -> ApiResponse[MessageResponse]:
    raise AppError(
        "Recuperação de senha por e-mail ainda não está configurada.",
        status_code=501,
        code="password_recovery_not_configured",
    )
