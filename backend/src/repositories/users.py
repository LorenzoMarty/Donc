from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.models import User, UserRole


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower(), User.deleted_at.is_(None)))

    def create(self, *, name: str, email: str, hashed_password: str) -> User:
        user = User(name=name, email=email.lower(), hashed_password=hashed_password)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def save(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def _base_query(self, search: str | None):
        query = select(User).where(User.deleted_at.is_(None))
        if search:
            like = f"%{search.lower()}%"
            query = query.where(or_(func.lower(User.name).like(like), func.lower(User.email).like(like)))
        return query

    def list_users(self, *, limit: int, offset: int, search: str | None = None) -> list[User]:
        # Sem limit/offset, a tabela de admin virava uma resposta HTTP + DOM proporcional ao total
        # de alunos cadastrados (auditoria de UX, achado #6.2) — paginado por padrao agora, sem
        # variante "traga todos" (quem precisa de lookup por id/nome usa reviewers_list, bem menor).
        query = self._base_query(search).order_by(User.created_at.desc()).limit(limit).offset(offset)
        return list(self.db.scalars(query))

    def count_users(self, *, search: str | None = None) -> int:
        return self.db.scalar(select(func.count()).select_from(self._base_query(search).subquery())) or 0

    def list_reviewers(self) -> list[User]:
        # So admins revisam conteudo (require_admin) — esse conjunto e sempre pequeno (poucos
        # admins), diferente da base de alunos. Usado pra traduzir reviewed_by/edited_by em nome
        # em telas que nao sao a tabela de Alunos (Temas, Jogos), sem paginar a lista inteira so
        # pra isso.
        return list(
            self.db.scalars(
                select(User).where(User.deleted_at.is_(None), User.role == UserRole.ADMIN).order_by(User.name)
            )
        )

