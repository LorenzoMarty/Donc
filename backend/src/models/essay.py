from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.session import Base


class EssayStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    CORRECTED = "corrected"


class EssayTheme(Base):
    __tablename__ = "essay_themes"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    context: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(160), default="Banco ENEM")
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    essays = relationship("Essay", back_populates="theme")


class Essay(Base):
    __tablename__ = "essays"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    theme_id: Mapped[int] = mapped_column(ForeignKey("essay_themes.id", ondelete="RESTRICT"), nullable=False)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[EssayStatus] = mapped_column(SQLEnum(EssayStatus), default=EssayStatus.DRAFT, nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    line_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    paragraph_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="essays")
    theme = relationship("EssayTheme", back_populates="essays")
    correction = relationship("EssayCorrection", back_populates="essay", cascade="all, delete-orphan", uselist=False)
    versions = relationship(
        "EssayVersion",
        back_populates="essay",
        cascade="all, delete-orphan",
        order_by="EssayVersion.version_number",
    )


class EssayVersion(Base):
    __tablename__ = "essay_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    essay_id: Mapped[int] = mapped_column(ForeignKey("essays.id", ondelete="CASCADE"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=EssayStatus.DRAFT.value, nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    line_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    paragraph_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    essay = relationship("Essay", back_populates="versions")
    correction = relationship("EssayVersionCorrection", back_populates="version", cascade="all, delete-orphan", uselist=False)


class EssayVersionCorrection(Base):
    __tablename__ = "essay_version_corrections"

    id: Mapped[int] = mapped_column(primary_key=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("essay_versions.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_score: Mapped[int] = mapped_column(Integer, nullable=False)
    competency_1: Mapped[int] = mapped_column(Integer, nullable=False)
    competency_2: Mapped[int] = mapped_column(Integer, nullable=False)
    competency_3: Mapped[int] = mapped_column(Integer, nullable=False)
    competency_4: Mapped[int] = mapped_column(Integer, nullable=False)
    competency_5: Mapped[int] = mapped_column(Integer, nullable=False)
    strengths: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    errors: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    suggestions: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    recurrent_patterns: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    version = relationship("EssayVersion", back_populates="correction")


class EssayCorrection(Base):
    __tablename__ = "essay_corrections"

    id: Mapped[int] = mapped_column(primary_key=True)
    essay_id: Mapped[int] = mapped_column(ForeignKey("essays.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_score: Mapped[int] = mapped_column(Integer, nullable=False)
    competency_1: Mapped[int] = mapped_column(Integer, nullable=False)
    competency_2: Mapped[int] = mapped_column(Integer, nullable=False)
    competency_3: Mapped[int] = mapped_column(Integer, nullable=False)
    competency_4: Mapped[int] = mapped_column(Integer, nullable=False)
    competency_5: Mapped[int] = mapped_column(Integer, nullable=False)
    strengths: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    errors: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    suggestions: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    recurrent_patterns: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    essay = relationship("Essay", back_populates="correction")
