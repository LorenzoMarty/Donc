from datetime import timedelta

from sqlalchemy.orm import Session

from src.config.settings import settings
from src.config.security import create_access_token, get_password_hash, verify_password
from src.middlewares.errors import AppError
from src.models import User
from src.repositories.users import UserRepository


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

    def register(self, *, name: str, email: str, password: str) -> User:
        if self.users.get_by_email(email):
            raise AppError("Ja existe uma conta com este e-mail.", status_code=409, code="email_in_use")
        return self.users.create(name=name, email=email, hashed_password=get_password_hash(password))

    def authenticate(self, *, email: str, password: str) -> User:
        user = self.users.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise AppError("E-mail ou senha invalidos.", status_code=401, code="invalid_credentials")
        return user

    def token_for(self, user: User) -> str:
        expires = timedelta(minutes=settings.access_token_expire_minutes)
        return create_access_token(str(user.id), expires_delta=expires, extra={"role": user.role.value})

