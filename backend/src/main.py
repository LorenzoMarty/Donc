import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from src.config.settings import settings
from src.database.session import Base, SessionLocal, engine
from src.middlewares.errors import register_error_handlers
from src.models import *  # noqa: F403 - garante registro das tabelas no metadata.
from src.routes import admin, ai, auth, dashboard, essays, exams, exercises, games, lessons
from src.schemas.common import ApiResponse, HealthData, success_response
from src.services.seed import seed_database
from src.telemetry import configure_ai_telemetry, flush_ai_telemetry
from src.vectorstore import seed_knowledge_base


logger = logging.getLogger("src.startup")


def _ensure_column(table_name: str, column_name: str, ddl: str) -> None:
    with engine.begin() as conn:
        inspector = inspect(conn)
        if table_name not in inspector.get_table_names():
            return
        existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
        if column_name not in existing_columns:
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))


def _ensure_runtime_columns() -> None:
    column_guards = [
        ("users", "last_seen_at", "last_seen_at TIMESTAMP"),
        ("essays", "paragraph_count", "paragraph_count INTEGER NOT NULL DEFAULT 0"),
        ("essay_versions", "paragraph_count", "paragraph_count INTEGER NOT NULL DEFAULT 0"),
        ("essay_themes", "supporting_texts", "supporting_texts JSON"),
        ("lessons", "pdf_url", "pdf_url VARCHAR(500)"),
        ("exercises", "base_lesson_ids", "base_lesson_ids JSON NOT NULL DEFAULT '[]'"),
        ("essay_corrections", "inline_annotations", "inline_annotations JSON"),
        ("essay_version_corrections", "inline_annotations", "inline_annotations JSON"),
        ("ai_interaction_logs", "input_tokens", "input_tokens INTEGER NOT NULL DEFAULT 0"),
        ("ai_interaction_logs", "output_tokens", "output_tokens INTEGER NOT NULL DEFAULT 0"),
        ("ai_interaction_logs", "cost_micro_usd", "cost_micro_usd BIGINT NOT NULL DEFAULT 0"),
        ("ai_interaction_logs", "model", "model VARCHAR(80)"),
        ("modules", "target_competencies", "target_competencies JSON NOT NULL DEFAULT '[]'"),
    ]
    for table_name, column_name, ddl in column_guards:
        _ensure_column(table_name, column_name, ddl)


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_ai_telemetry()
    try:
        if settings.enable_pgvector and settings.database_url.startswith("postgres"):
            with engine.begin() as connection:
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        Base.metadata.create_all(bind=engine)
        _ensure_runtime_columns()
        db = SessionLocal()
        try:
            seed_database(db, include_demo_data=settings.seed_demo_data)
            seed_knowledge_base(db)
        finally:
            db.close()
    except SQLAlchemyError:
        logger.exception("Database startup tasks failed")
    except Exception:
        logger.exception("Application startup tasks failed")
    yield
    flush_ai_telemetry()


app = FastAPI(
    title=settings.project_name,
    version="1.0.0",
    description="API para plataforma premium de Portugues e Redacao ENEM.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)

app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(dashboard.router, prefix=settings.api_v1_prefix)
app.include_router(lessons.router, prefix=settings.api_v1_prefix)
app.include_router(exercises.router, prefix=settings.api_v1_prefix)
app.include_router(essays.router, prefix=settings.api_v1_prefix)
app.include_router(exams.router, prefix=settings.api_v1_prefix)
app.include_router(games.router, prefix=settings.api_v1_prefix)
app.include_router(ai.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router, prefix=settings.api_v1_prefix)


@app.get("/health", response_model=ApiResponse[HealthData])
def health() -> ApiResponse[HealthData]:
    return success_response(HealthData(status="ok", service=settings.project_name), "API operacional.")


@app.get("/", response_model=ApiResponse[HealthData])
def root() -> ApiResponse[HealthData]:
    return health()
