from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def create(self, *, name: str, email: str, hashed_password: str) -> User:
        user = User(name=name, email=email.lower(), hashed_password=hashed_password)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def list_users(self) -> list[User]:
        return list(self.db.scalars(select(User).order_by(User.created_at.desc())))

