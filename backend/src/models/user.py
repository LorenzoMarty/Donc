from datetime import date, datetime
from enum import Enum

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, false, func
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
    # Segunda-feira da semana (America/Sao_Paulo) em que o congelamento semanal foi usado. Um dia
    # perdido por semana nao quebra o streak; ver `streak_service.apply_daily_streak`.
    streak_freeze_week: Mapped[date | None] = mapped_column(Date, nullable=True)
    session_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Separado de `last_seen_at` (presenca, tocado em toda request autenticada) — so avanca em
    # atividade pedagogica real (jogo concluido, exercicio, aula concluida, redacao enviada).
    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Soft-delete (auditoria arquitetural 2026-08-21): exclusão de conta preserva histórico
    # pedagógico (não é mais `db.delete()` + CASCADE) — linha continua existindo, só marcada.
    # `None` = conta ativa. Toda leitura de autenticação/listagem admin filtra por isso.
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Aceite dos Termos de Uso/Privacidade (LGPD): quando e qual versão do texto. None = nunca aceitou.
    terms_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    terms_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Confirmação de e-mail (link de uso único enviado no cadastro). None = ainda não verificado;
    # só assina depois de verificar. Usuários anteriores à feature foram migrados como verificados.
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def email_verified(self) -> bool:
        return self.email_verified_at is not None

    # Lembrete de streak em risco por e-mail: o aluno pode sair (link no e-mail ou preferencia no perfil).
    reminders_opt_out: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false(), nullable=False)
    last_reminder_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def reminders_enabled(self) -> bool:
        return not self.reminders_opt_out

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

