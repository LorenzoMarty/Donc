from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.config.security import generate_csrf_token, sign_csrf_token
from src.database.session import get_db
from src.dependencies import get_current_user
from src.middlewares.errors import AppError
from src.models import User
from src.repositories.subscriptions import SubscriptionRepository
from src.services.subscription_status import has_access
from src.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    OnboardingRead,
    OnboardingUpdateRequest,
    PasswordRecoveryRequest,
    RegisterRequest,
    DeleteAccountRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
    UnsubscribeRemindersRequest,
    UpdatePreferencesRequest,
    AuthResponse,
    UpdateMeRequest,
    UserRead,
)
from src.schemas.common import ApiResponse, MessageResponse, success_response
from src.services import email_service
from src.services.account_data_service import AccountDataService
from src.services.auth_service import AuthService
from src.services.turnstile import verify_turnstile
from src.services.reminder_service import ReminderService, user_id_from_unsubscribe_token
from src.utils.auth_rate_limit import check_auth_rate_limit, check_daily_ip_limit, count_daily_ip_event
from src.utils.client_ip import client_ip
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


def _subscription_active(db: Session, user: User) -> bool:
    subscription = SubscriptionRepository(db).get_by_user_id(user.id)
    return has_access(role=user.role, subscription=subscription, now=datetime.now(UTC))


@router.post("/register", response_model=ApiResponse[AuthResponse], status_code=201)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> ApiResponse[AuthResponse]:
    check_auth_rate_limit(request, bucket="register", identifier=str(payload.email))
    verify_turnstile(payload.turnstile_token, remote_ip=client_ip(request))
    check_daily_ip_limit(request, bucket="register", limit=settings.register_per_ip_per_day)
    service = AuthService(db)
    user = service.register(
        name=payload.name, email=str(payload.email), password=payload.password, accept_terms=payload.accept_terms
    )
    count_daily_ip_event(request, bucket="register")
    token = service.token_for(user, subscription_active=_subscription_active(db, user))
    refresh_token = service.issue_refresh_token(user)
    verification_token = service.issue_email_verification(user)
    db.commit()
    _set_session_cookies(response, access_token=token, refresh_token=refresh_token)
    background.add_task(email_service.send_email_verification, to=user.email, name=user.name, token=verification_token)
    return success_response(AuthResponse(user=user), "Conta criada com sucesso.")


@router.post("/login", response_model=ApiResponse[AuthResponse])
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> ApiResponse[AuthResponse]:
    check_auth_rate_limit(request, bucket="login", identifier=str(payload.email))
    service = AuthService(db)
    user = service.authenticate(email=str(payload.email), password=payload.password)
    token = service.token_for(user, subscription_active=_subscription_active(db, user))
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
    token = service.token_for(user, subscription_active=_subscription_active(db, user))
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


@router.get("/me/export")
def export_my_data(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> JSONResponse:
    """LGPD: baixa todos os dados do titular em JSON."""
    return JSONResponse(
        content=jsonable_encoder(AccountDataService(db).export(current_user)),
        headers={"Content-Disposition": 'attachment; filename="meus-dados-donc.json"'},
    )


@router.post("/delete-account", response_model=ApiResponse[MessageResponse])
def delete_account(
    payload: DeleteAccountRequest,
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[MessageResponse]:
    require_csrf_for_cookie_session(request)
    check_auth_rate_limit(request, bucket="delete-account", identifier=current_user.email)
    AccountDataService(db).delete_account(current_user, password=payload.password)
    _delete_session_cookies(response)
    return success_response(MessageResponse(message="Conta excluída."), "Conta excluída.")


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


RECOVERY_MESSAGE = "Se existir uma conta com este e-mail, enviamos um link para redefinir a senha."


@router.post("/password-recovery", response_model=ApiResponse[MessageResponse])
def password_recovery(
    payload: PasswordRecoveryRequest,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> ApiResponse[MessageResponse]:
    check_auth_rate_limit(request, bucket="password-recovery", identifier=str(payload.email))
    verify_turnstile(payload.turnstile_token, remote_ip=client_ip(request))
    result = AuthService(db).request_password_reset(str(payload.email))
    if result:
        user, token = result
        # Em background: o tempo de resposta não deve diferenciar e-mail existente de inexistente.
        background.add_task(email_service.send_password_reset, to=user.email, name=user.name, token=token)
    return success_response(MessageResponse(message=RECOVERY_MESSAGE), RECOVERY_MESSAGE)


@router.post("/verify-email", response_model=ApiResponse[MessageResponse])
def verify_email(
    payload: VerifyEmailRequest, request: Request, background: BackgroundTasks, db: Session = Depends(get_db)
) -> ApiResponse[MessageResponse]:
    check_auth_rate_limit(request, bucket="verify-email")
    user, newly_verified = AuthService(db).verify_email(payload.token)
    if newly_verified:  # token antigo de quem já estava verificado não reenvia as boas-vindas
        background.add_task(email_service.send_welcome, to=user.email, name=user.name)
    return success_response(MessageResponse(message="E-mail confirmado."), "E-mail confirmado.")


@router.post("/resend-verification", response_model=ApiResponse[MessageResponse])
def resend_verification(
    request: Request,
    background: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[MessageResponse]:
    check_auth_rate_limit(request, bucket="resend-verification", identifier=str(current_user.id))
    token = AuthService(db).resend_email_verification(current_user)
    background.add_task(email_service.send_email_verification, to=current_user.email, name=current_user.name, token=token)
    return success_response(MessageResponse(message="E-mail de confirmação reenviado."), "E-mail de confirmação reenviado.")


@router.patch("/me/preferences", response_model=ApiResponse[UserRead])
def update_preferences(
    payload: UpdatePreferencesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[UserRead]:
    current_user.reminders_opt_out = not payload.reminders_enabled
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return success_response(UserRead.model_validate(current_user), "Preferências atualizadas.")


@router.post("/reminders/unsubscribe", response_model=ApiResponse[MessageResponse])
def unsubscribe_reminders(payload: UnsubscribeRemindersRequest, request: Request, db: Session = Depends(get_db)) -> ApiResponse[MessageResponse]:
    """Link de opt-out do e-mail: público, autenticado pelo token assinado."""
    check_auth_rate_limit(request, bucket="reminders-unsubscribe")
    user_id = user_id_from_unsubscribe_token(payload.token)
    if user_id is None or not ReminderService(db).opt_out(user_id):
        raise AppError("Link inválido.", status_code=400, code="invalid_unsubscribe_token")
    return success_response(MessageResponse(message="Lembretes desativados."), "Lembretes desativados.")


@router.post("/reset-password", response_model=ApiResponse[MessageResponse])
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)) -> ApiResponse[MessageResponse]:
    check_auth_rate_limit(request, bucket="reset-password")
    AuthService(db).reset_password(token=payload.token, new_password=payload.new_password)
    return success_response(MessageResponse(message="Senha redefinida com sucesso."), "Senha redefinida com sucesso.")
