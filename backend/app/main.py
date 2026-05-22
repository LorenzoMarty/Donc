from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.middlewares.errors import register_error_handlers
from app.models import *  # noqa: F403 - garante registro das tabelas no metadata.
from app.routers import admin, ai, auth, dashboard, essays, exams, exercises, lessons
from app.schemas.common import HealthResponse
from app.services.seed import seed_database
from app.telemetry import configure_ai_telemetry
from app.vectorstore import seed_knowledge_base


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_ai_telemetry()
    if settings.database_url.startswith("postgres"):
        with engine.begin() as connection:
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db, include_demo_data=settings.seed_demo_data)
        seed_knowledge_base(db)
    finally:
        db.close()
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


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service=settings.project_name)
