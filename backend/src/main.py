import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from src.config.settings import settings
from src.database.session import Base, SessionLocal, engine
from src.middlewares.errors import register_error_handlers
from src.models import *  # noqa: F403 - garante registro das tabelas no metadata.
from src.routes import admin, ai, auth, dashboard, essays, exams, exercises, games, lessons
from src.schemas.common import ApiResponse, HealthData, success_response
from src.services.seed import seed_database
from src.telemetry import configure_ai_telemetry
from src.vectorstore import seed_knowledge_base


logger = logging.getLogger("src.startup")


def _ensure_last_seen_at_column() -> None:
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP"))
    except Exception:
        pass  # column already exists or DB not yet created


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_ai_telemetry()
    try:
        if settings.enable_pgvector and settings.database_url.startswith("postgres"):
            with engine.begin() as connection:
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        Base.metadata.create_all(bind=engine)
        _ensure_last_seen_at_column()
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
app.include_router(games.router, prefix=settings.api_v1_prefix)
app.include_router(ai.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router, prefix=settings.api_v1_prefix)


@app.get("/health", response_model=ApiResponse[HealthData])
def health() -> ApiResponse[HealthData]:
    return success_response(HealthData(status="ok", service=settings.project_name), "API operacional.")


@app.get("/", response_model=ApiResponse[HealthData])
def root() -> ApiResponse[HealthData]:
    return health()
