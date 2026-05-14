from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.middlewares.errors import register_error_handlers
from app.models import *  # noqa: F403 - garante registro das tabelas no metadata.
from app.routers import admin, auth, dashboard, essays, exams, exercises, lessons, tutor
from app.schemas.common import HealthResponse
from app.services.seed import seed_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
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
    allow_origins=[settings.frontend_origin, "http://localhost:3000", "http://127.0.0.1:3000"],
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
app.include_router(tutor.router, prefix=settings.api_v1_prefix)
app.include_router(exams.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router, prefix=settings.api_v1_prefix)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service=settings.project_name)

