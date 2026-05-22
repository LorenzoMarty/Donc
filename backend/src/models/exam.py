from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.session import Base


class MockExam(Base):
    __tablename__ = "mock_exams"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    area: Mapped[str] = mapped_column(String(80), default="Linguagens", nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=90, nullable=False)

    questions = relationship("MockExamQuestion", back_populates="exam", cascade="all, delete-orphan")
    attempts = relationship("MockExamAttempt", back_populates="exam", cascade="all, delete-orphan")


class MockExamQuestion(Base):
    __tablename__ = "mock_exam_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("mock_exams.id", ondelete="CASCADE"), nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(5), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    skill: Mapped[str] = mapped_column(String(160), nullable=False)

    exam = relationship("MockExam", back_populates="questions")


class MockExamAttempt(Base):
    __tablename__ = "mock_exam_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exam_id: Mapped[int] = mapped_column(ForeignKey("mock_exams.id", ondelete="CASCADE"), nullable=False)
    answers: Mapped[dict[str, str]] = mapped_column(JSON, default=dict, nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="exam_attempts")
    exam = relationship("MockExam", back_populates="attempts")

