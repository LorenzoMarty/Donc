from datetime import timedelta

from sqlalchemy.orm import Session

from src.config.settings import settings
from src.config.security import create_access_token, get_password_hash, verify_password
from src.middlewares.errors import AppError
from src.models import User
from src.repositories.users import UserRepository
from src.services.streak_service import touch_daily_streak


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

    def register(self, *, name: str, email: str, password: str) -> User:
        if self.users.get_by_email(email):
            raise AppError("Já existe uma conta com este e-mail.", status_code=409, code="email_in_use")
        user = self.users.create(name=name, email=email, hashed_password=get_password_hash(password))
        return touch_daily_streak(self.db, user)

    def authenticate(self, *, email: str, password: str) -> User:
        user = self.users.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise AppError("E-mail ou senha inválidos.", status_code=401, code="invalid_credentials")
        return touch_daily_streak(self.db, user)

    def update_profile(self, user: User, *, name: str) -> User:
        user.name = name.strip()
        return self.users.save(user)

    def change_password(self, user: User, *, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.hashed_password):
            raise AppError("Senha atual incorreta.", status_code=400, code="invalid_current_password")
        if verify_password(new_password, user.hashed_password):
            raise AppError("A nova senha deve ser diferente da atual.", status_code=400, code="password_unchanged")
        user.hashed_password = get_password_hash(new_password)
        self.users.save(user)

    def token_for(self, user: User) -> str:
        expires = timedelta(minutes=settings.access_token_expire_minutes)
        return create_access_token(str(user.id), expires_delta=expires, extra={"role": user.role.value})
