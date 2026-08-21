from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.session import Base


class UserRole(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.STUDENT, nullable=False)
    streak_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    daily_goal_minutes: Mapped[int] = mapped_column(Integer, default=45, nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Separado de `last_seen_at` (presenca, tocado em toda request autenticada) — so avanca em
    # atividade pedagogica real (jogo concluido, exercicio, aula concluida, redacao enviada).
    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Soft-delete (auditoria arquitetural 2026-08-21): exclusão de conta preserva histórico
    # pedagógico (não é mais `db.delete()` + CASCADE) — linha continua existindo, só marcada.
    # `None` = conta ativa. Toda leitura de autenticação/listagem admin filtra por isso.
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    lesson_progress = relationship("LessonProgress", back_populates="user", cascade="all, delete-orphan")
    exercise_answers = relationship("ExerciseAnswer", back_populates="user", cascade="all, delete-orphan")
    essays = relationship("Essay", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")


class StudentProfile(Base):
    """Dados coletados no wizard de onboarding (`/onboarding`) — persistidos no backend em vez de
    localStorage, pra alimentar o perfil adaptativo (P0). Pular o onboarding e valido: a leitura
    (`GET /auth/onboarding`) devolve um shape valido com campos ausentes mesmo sem linha no banco.
    """

    __tablename__ = "student_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    goal: Mapped[str | None] = mapped_column(String(40), nullable=True)
    level: Mapped[str | None] = mapped_column(String(40), nullable=True)
    completed: Mapped[bool] = mapped_column(default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

