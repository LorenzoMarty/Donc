from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.config.settings import settings
from src.database.session import Base

try:
    from pgvector.sqlalchemy import Vector
except Exception:  # pragma: no cover - optional when running sqlite-only tests
    Vector = None  # type: ignore[assignment]


def embedding_column_type():
    if settings.enable_pgvector and settings.database_url.startswith("postgres") and Vector:
        return Vector(settings.openai_embedding_dimensions)
    return JSON


class AIJob(Base):
    __tablename__ = "ai_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="queued", nullable=False)
    request_payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    result_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class StudentLearningProfile(Base):
    __tablename__ = "student_learning_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    weak_competencies: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    recurring_errors: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    repertories_used: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    recommendations: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AIKnowledgeDocument(Base):
    __tablename__ = "ai_knowledge_documents"
    __table_args__ = (UniqueConstraint("content_hash", name="uq_ai_knowledge_documents_content_hash"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    source: Mapped[str] = mapped_column(String(160), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    meta: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chunks = relationship("AIKnowledgeChunk", back_populates="document", cascade="all, delete-orphan")


class AIKnowledgeChunk(Base):
    __tablename__ = "ai_knowledge_chunks"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("ai_knowledge_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(embedding_column_type(), nullable=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document = relationship("AIKnowledgeDocument", back_populates="chunks")


class AIInteractionLog(Base):
    __tablename__ = "ai_interaction_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    job_id: Mapped[str | None] = mapped_column(ForeignKey("ai_jobs.id", ondelete="SET NULL"), nullable=True)
    workflow: Mapped[str] = mapped_column(String(120), nullable=False)
    agent: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cost_estimate: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    prompt_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
