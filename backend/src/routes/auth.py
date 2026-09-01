from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.config.security import generate_csrf_token, sign_csrf_token
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
    AuthResponse,
    UpdateMeRequest,
    UserRead,
)
from src.schemas.common import ApiResponse, MessageResponse, success_response
from src.services.auth_service import AuthService
from src.utils.auth_rate_limit import check_auth_rate_limit
from src.utils.csrf import require_csrf_for_cookie_session


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
    csrf_token = generate_csrf_token()
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
        httponly=False,
        secure=secure,
        samesite="lax",
    )
    response.set_cookie(
        key="csrf_signature",
        value=sign_csrf_token(csrf_token, access_token),
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
        httponly=True,
        secure=secure,
        samesite="lax",
    )


def _delete_session_cookies(response: Response) -> None:
    for key in ("access_token", "refresh_token", "csrf_token", "csrf_signature"):
        response.delete_cookie(key=key, path="/")


@router.post("/register", response_model=ApiResponse[AuthResponse], status_code=201)
def register(payload: RegisterRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> ApiResponse[AuthResponse]:
    check_auth_rate_limit(request, bucket="register", identifier=str(payload.email))
    service = AuthService(db)
    user = service.register(name=payload.name, email=str(payload.email), password=payload.password)
    token = service.token_for(user)
    refresh_token = service.issue_refresh_token(user)
    db.commit()
    _set_session_cookies(response, access_token=token, refresh_token=refresh_token)
    return success_response(AuthResponse(user=user), "Conta criada com sucesso.")


@router.post("/login", response_model=ApiResponse[AuthResponse])
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> ApiResponse[AuthResponse]:
    check_auth_rate_limit(request, bucket="login", identifier=str(payload.email))
    service = AuthService(db)
    user = service.authenticate(email=str(payload.email), password=payload.password)
    token = service.token_for(user)
    refresh_token = service.issue_refresh_token(user)
    db.commit()
    _set_session_cookies(response, access_token=token, refresh_token=refresh_token)
    return success_response(AuthResponse(user=user), "Login realizado com sucesso.")


@router.post("/refresh", response_model=ApiResponse[AuthResponse])
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> ApiResponse[AuthResponse]:
    check_auth_rate_limit(request, bucket="refresh")
    raw_refresh_token = request.cookies.get("refresh_token")
    if not raw_refresh_token:
        raise AppError("Sessão inválida ou expirada.", status_code=401, code="invalid_token")
    service = AuthService(db)
    result = service.rotate_refresh_token(raw_refresh_token)
    if not result:
        _delete_session_cookies(response)
        raise AppError("Sessão inválida ou expirada.", status_code=401, code="invalid_token")
    user, new_refresh_token = result
    token = service.token_for(user)
    _set_session_cookies(response, access_token=token, refresh_token=new_refresh_token)
    return success_response(AuthResponse(user=user), "Sessão renovada.")


@router.get("/me", response_model=ApiResponse[UserRead])
def me(current_user: User = Depends(get_current_user)) -> ApiResponse[UserRead]:
    return success_response(UserRead.model_validate(current_user))


@router.patch("/me", response_model=ApiResponse[UserRead])
def update_me(
    payload: UpdateMeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[UserRead]:
    require_csrf_for_cookie_session(request)
    user = AuthService(db).update_profile(current_user, name=payload.name)
    return success_response(UserRead.model_validate(user), "Perfil atualizado com sucesso.")


@router.post("/change-password", response_model=ApiResponse[MessageResponse])
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[MessageResponse]:
    require_csrf_for_cookie_session(request)
    check_auth_rate_limit(request, bucket="change-password", identifier=current_user.email)
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
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[OnboardingRead]:
    require_csrf_for_cookie_session(request)
    profile = AuthService(db).update_onboarding(current_user.id, goal=payload.goal, level=payload.level)
    return success_response(OnboardingRead.model_validate(profile, from_attributes=True), "Onboarding salvo.")


@router.post("/logout", response_model=ApiResponse[MessageResponse])
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> ApiResponse[MessageResponse]:
    require_csrf_for_cookie_session(request)
    check_auth_rate_limit(request, bucket="logout")
    raw_refresh_token = request.cookies.get("refresh_token")
    if raw_refresh_token:
        AuthService(db).revoke_refresh_token(raw_refresh_token)
    _delete_session_cookies(response)
    return success_response(MessageResponse(message="Sessao encerrada."), "Sessao encerrada.")


@router.post("/password-recovery", response_model=ApiResponse[MessageResponse])
def password_recovery(_: PasswordRecoveryRequest) -> ApiResponse[MessageResponse]:
    raise AppError(
        "Recuperação de senha por e-mail ainda não está configurada.",
        status_code=501,
        code="password_recovery_not_configured",
    )
