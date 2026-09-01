import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from src.config.settings import settings
from src.database.session import Base, SessionLocal, engine
from src.middlewares.errors import register_error_handlers
from src.middlewares.errors import AppError
from src.models import *  # noqa: F403 - garante registro das tabelas no metadata.
from src.routes import admin, ai, auth, dashboard, essays, exercises, games, lessons
from src.schemas.common import ApiResponse, HealthData, success_response
from src.services.seed import seed_database
from src.telemetry import configure_ai_telemetry, flush_ai_telemetry
from src.vectorstore import seed_knowledge_base
from src.utils.csrf import require_csrf_for_cookie_session


logger = logging.getLogger("src.startup")


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_ai_telemetry()
    try:
        if settings.enable_pgvector and settings.database_url.startswith("postgres"):
            with engine.begin() as connection:
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        if settings.environment.lower() != "production":
            # Em producao o schema e gerenciado exclusivamente por `alembic upgrade head`
            # (rodado no deploy). create_all() so serve para dev local/testes, onde nao
            # ha um passo de migracao explicito antes de subir a aplicacao.
            Base.metadata.create_all(bind=engine)
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


@app.middleware("http")
async def csrf_cookie_session_middleware(request, call_next):
    unsafe_method = request.method.upper() not in {"GET", "HEAD", "OPTIONS"}
    public_auth_paths = {
        f"{settings.api_v1_prefix}/auth/login",
        f"{settings.api_v1_prefix}/auth/register",
        f"{settings.api_v1_prefix}/auth/password-recovery",
    }
    if unsafe_method and request.url.path.startswith(settings.api_v1_prefix) and request.url.path not in public_auth_paths:
        try:
            require_csrf_for_cookie_session(request)
        except AppError as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"success": False, "message": exc.message, "error": exc.code},
            )
    return await call_next(request)

app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(dashboard.router, prefix=settings.api_v1_prefix)
app.include_router(lessons.router, prefix=settings.api_v1_prefix)
app.include_router(exercises.router, prefix=settings.api_v1_prefix)
app.include_router(essays.router, prefix=settings.api_v1_prefix)
app.include_router(games.router, prefix=settings.api_v1_prefix)
app.include_router(ai.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router, prefix=settings.api_v1_prefix)


@app.get("/health", response_model=ApiResponse[HealthData])
def health(response: Response) -> ApiResponse[HealthData]:
    # Antes era 200 estatico sem checar nada — orquestrador achava a API saudavel com Postgres ou
    # Redis fora do ar. Timeout curto pra nao travar o probe de liveness/readiness.
    database_status = "ok"
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        logger.exception("Health check: Postgres indisponivel")
        database_status = "down"

    redis_status = "ok"
    try:
        import redis as redis_client

        redis_client.from_url(settings.redis_url, socket_connect_timeout=0.5, socket_timeout=0.5).ping()
    except Exception:
        logger.exception("Health check: Redis indisponivel")
        redis_status = "down"

    healthy = database_status == "ok" and redis_status == "ok"
    response.status_code = 200 if healthy else 503
    return success_response(
        HealthData(
            status="ok" if healthy else "degraded",
            service=settings.project_name,
            database=database_status,
            redis=redis_status,
        ),
        "API operacional." if healthy else "Dependencia indisponivel.",
    )


@app.get("/", response_model=ApiResponse[HealthData])
def root(response: Response) -> ApiResponse[HealthData]:
    return health(response)
