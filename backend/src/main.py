import logging
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from src.config.settings import settings
from src.database.session import Base, SessionLocal, engine
from src.middlewares.errors import register_error_handlers
from src.models import *  # noqa: F403 - garante registro das tabelas no metadata.
from src.routes import admin, ai, auth, dashboard, essays, exams, exercises, lessons
from src.schemas.common import ApiResponse, HealthData, success_response
from src.services.seed import seed_database
from src.telemetry import configure_ai_telemetry
from src.vectorstore import seed_knowledge_base


logger = logging.getLogger("src.startup")


def _ensure_paragraph_count_columns() -> None:
    inspector = inspect(engine)
    required = {
        "essays": "paragraph_count",
        "essay_versions": "paragraph_count",
    }
    with engine.begin() as connection:
        for table_name, column_name in required.items():
            columns = {column["name"] for column in inspector.get_columns(table_name)}
            if column_name not in columns:
                connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} INTEGER NOT NULL DEFAULT 0"))
        for table_name in required:
            rows = connection.execute(text(f"SELECT id, content FROM {table_name} WHERE paragraph_count = 0")).mappings()
            for row in rows:
                paragraph_count = _paragraph_count(str(row["content"] or ""))
                connection.execute(
                    text(f"UPDATE {table_name} SET paragraph_count = :paragraph_count WHERE id = :id"),
                    {"paragraph_count": paragraph_count, "id": row["id"]},
                )


def _paragraph_count(content: str) -> int:
    stripped = content.strip()
    if not stripped:
        return 0
    if re.search(r"\n\s*\n", stripped):
        return len([paragraph for paragraph in re.split(r"\n\s*\n+", stripped) if paragraph.strip()])
    return len([line for line in stripped.splitlines() if line.strip()])


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_ai_telemetry()
    try:
        if settings.enable_pgvector and settings.database_url.startswith("postgres"):
            with engine.begin() as connection:
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        Base.metadata.create_all(bind=engine)
        _ensure_paragraph_count_columns()
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
app.include_router(ai.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router, prefix=settings.api_v1_prefix)


@app.get("/health", response_model=ApiResponse[HealthData])
def health() -> ApiResponse[HealthData]:
    return success_response(HealthData(status="ok", service=settings.project_name), "API operacional.")


@app.get("/", response_model=ApiResponse[HealthData])
def root() -> ApiResponse[HealthData]:
    return health()
