from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.config.security import create_access_token, generate_refresh_token, get_password_hash, hash_refresh_token, verify_password
from src.middlewares.errors import AppError
from src.models import PasswordResetToken, RefreshToken, StudentProfile, User
from src.repositories.users import UserRepository
from src.services.streak_service import touch_last_seen


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

    def register(self, *, name: str, email: str, password: str, accept_terms: bool) -> User:
        self.require_terms(accept_terms)
        if self.users.get_by_email(email):
            raise AppError("Já existe uma conta com este e-mail.", status_code=409, code="email_in_use")
        user = self.users.create(name=name, email=email, hashed_password=get_password_hash(password))
        self.record_terms_acceptance(user)
        return touch_last_seen(self.db, user)

    @staticmethod
    def require_terms(accepted: bool) -> None:
        if not accepted:
            raise AppError("É preciso aceitar os Termos de Uso e a Política de Privacidade.", status_code=400, code="terms_not_accepted")

    def record_terms_acceptance(self, user: User) -> None:
        user.terms_accepted_at = datetime.now(UTC)
        user.terms_version = settings.legal_terms_version
        self.users.save(user)

    def authenticate(self, *, email: str, password: str) -> User:
        user = self.users.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise AppError("E-mail ou senha inválidos.", status_code=401, code="invalid_credentials")
        return touch_last_seen(self.db, user)

    def update_profile(self, user: User, *, name: str) -> User:
        user.name = name.strip()
        return self.users.save(user)

    def change_password(self, user: User, *, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.hashed_password):
            raise AppError("Senha atual incorreta.", status_code=400, code="invalid_current_password")
        if verify_password(new_password, user.hashed_password):
            raise AppError("A nova senha deve ser diferente da atual.", status_code=400, code="password_unchanged")
        user.hashed_password = get_password_hash(new_password)
        user.session_version += 1
        self.users.save(user)
        # Sessões existentes (outros dispositivos/navegadores) não devem sobreviver a uma troca
        # de senha — antes disso o JWT de acesso continuava válido até expirar (7 dias).
        self.revoke_all_refresh_tokens(user.id)

    def get_onboarding(self, user_id: int) -> StudentProfile | None:
        return self.db.scalar(select(StudentProfile).where(StudentProfile.user_id == user_id))

    def update_onboarding(self, user_id: int, *, goal: str | None, level: str | None) -> StudentProfile:
        profile = self.get_onboarding(user_id)
        if not profile:
            profile = StudentProfile(user_id=user_id)
            self.db.add(profile)
        profile.goal = goal
        profile.level = level
        profile.completed = True
        profile.completed_at = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def token_for(self, user: User, *, subscription_active: bool) -> str:
        # `sa` (subscription access): claim leve pro proxy.ts decidir redirect pra /assinatura
        # sem round-trip ao backend — pode ficar defasada ate `access_token_expire_minutes`
        # depois de um webhook mudar o status real (mesma janela de staleness que `sv` ja tem
        # pra troca de senha). A fonte da verdade de acesso continua sendo
        # `require_active_subscription` no backend, recalculada a cada request.
        expires = timedelta(minutes=settings.access_token_expire_minutes)
        return create_access_token(
            str(user.id),
            expires_delta=expires,
            extra={"role": user.role.value, "sv": user.session_version, "sa": subscription_active},
        )

    def issue_refresh_token(self, user: User) -> str:
        """Emite um refresh token novo (opaco, guardado como hash) — não commita, caller decide
        o boundary da transação junto com o access token/cookie que acompanha."""
        raw = generate_refresh_token()
        self.db.add(
            RefreshToken(
                user_id=user.id,
                token_hash=hash_refresh_token(raw),
                expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
            )
        )
        return raw

    def rotate_refresh_token(self, raw_token: str) -> tuple[User, str] | None:
        """Valida o refresh token, revoga o usado (rotação — token só serve uma vez) e emite um
        novo. Retorna None se inválido/expirado/revogado/de usuário deletado — caller trata como
        sessão encerrada, sem detalhar o motivo ao cliente."""
        row = self.db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw_token)))
        now = datetime.now(UTC)
        if not row or row.revoked_at is not None or row.expires_at < now:
            return None
        user = self.db.get(User, row.user_id)
        if not user or user.deleted_at is not None:
            return None
        row.revoked_at = now
        new_raw = self.issue_refresh_token(user)
        self.db.commit()
        return user, new_raw

    def revoke_refresh_token(self, raw_token: str) -> None:
        row = self.db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw_token)))
        if row and row.revoked_at is None:
            row.revoked_at = datetime.now(UTC)
            self.db.commit()

    def revoke_all_refresh_tokens(self, user_id: int) -> None:
        self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )
        self.db.commit()

    def request_password_reset(self, email: str) -> tuple[User, str] | None:
        """Gera token de reset (uso único, guardado como hash). Retorna None se não houver conta —
        caller responde igual nos dois casos pra não revelar se o e-mail existe."""
        user = self.users.get_by_email(email)
        if not user:
            return None
        raw = generate_refresh_token()
        self.db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_refresh_token(raw),
                expires_at=datetime.now(UTC) + timedelta(minutes=settings.password_reset_token_minutes),
            )
        )
        self.db.commit()
        return user, raw

    def reset_password(self, *, token: str, new_password: str) -> None:
        row = self.db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_refresh_token(token)))
        now = datetime.now(UTC)
        invalid = AppError("Link inválido ou expirado. Peça uma nova recuperação.", status_code=400, code="invalid_reset_token")
        if not row or row.used_at is not None or _aware(row.expires_at) < now:
            raise invalid
        user = self.db.get(User, row.user_id)
        if not user or user.deleted_at is not None:
            raise invalid
        # Consumo atomico: dois requests com o mesmo link disputam o UPDATE condicional e so um
        # ganha (rowcount == 1). Invalida tambem os demais pedidos pendentes do usuario.
        claimed = self.db.execute(
            update(PasswordResetToken)
            .where(PasswordResetToken.id == row.id, PasswordResetToken.used_at.is_(None))
            .values(used_at=now)
        ).rowcount
        if claimed != 1:
            self.db.rollback()
            raise invalid
        self.db.execute(
            update(PasswordResetToken)
            .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
            .values(used_at=now)
        )
        user.hashed_password = get_password_hash(new_password)
        user.session_version += 1
        self.users.save(user)
        self.revoke_all_refresh_tokens(user.id)


def _aware(value: datetime) -> datetime:
    # SQLite (testes) devolve datetime naive; Postgres devolve aware.
    return value if value.tzinfo else value.replace(tzinfo=UTC)
