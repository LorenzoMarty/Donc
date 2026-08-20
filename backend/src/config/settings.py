from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_JWT_SECRET = "change-this-secret-before-production"


class Settings(BaseSettings):
    project_name: str = "Donc"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://enem:enem@localhost:5432/enem_redacao"
    database_connect_timeout_seconds: int = 5
    jwt_secret_key: str = DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o"
    openai_fallback_model: str = "gpt-4o-mini"
    openai_image_model: str = "gpt-image-1"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_embedding_dimensions: int = 1536
    enable_pgvector: bool = False
    redis_url: str = "redis://localhost:6379/0"
    ai_sync_timeout_seconds: int = 45
    # Job async (queued/running) parado por mais tempo que isso e considerado travado (ex.: Redis
    # vivo mas worker Celery morto — enqueue "funciona" mas ninguem consome) e marcado failed no
    # proximo poll/SSE, em vez de ficar preso pra sempre.
    ai_job_stale_seconds: int = 180
    enable_agentos: bool = False
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None
    langfuse_host: str | None = None
    ai_cost_cents_per_1k_tokens: float = 0.5  # legado: fallback de linhas antigas sem cost_micro_usd
    usd_brl_fallback_rate: float = 5.40  # usado quando a cotação PTAX/BCB falha
    usd_brl_rate_ttl_hours: int = 6
    ai_rate_limit_per_minute: int = 20
    # P2b — REQ-4/5: quota diaria de custo de IA (micro-USD), reaproveitando AIInteractionLog pra
    # somar o gasto do dia corrente (UTC). 0 desliga o respectivo limite. Default generoso o
    # bastante pra nao atrapalhar uso normal, mas protege contra geracao descontrolada.
    ai_daily_cost_limit_micro_usd_per_user: int = 2_000_000  # ~US$2/dia por usuario
    ai_daily_cost_limit_micro_usd_per_workflow: int = 1_000_000  # ~US$1/dia por usuario+workflow
    seed_demo_data: bool = False
    seed_admin_password: str = "12345678"  # default só para dev local; sobrescreva via env em qualquer ambiente compartilhado
    frontend_origin: str = "http://localhost:3000"
    environment: str = "development"

    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore")

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return "postgresql+psycopg://" + value.removeprefix("postgres://")
        if value.startswith("postgresql://"):
            return "postgresql+psycopg://" + value.removeprefix("postgresql://")
        return value

    @field_validator("openai_api_key", "openai_fallback_model", "langfuse_public_key", "langfuse_secret_key", "langfuse_host", mode="before")
    @classmethod
    def empty_optional_string_to_none(cls, value: str | None) -> str | None:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.environment.lower() != "production":
            return self
        if self.jwt_secret_key == DEFAULT_JWT_SECRET or len(self.jwt_secret_key) < 32:
            raise ValueError("JWT_SECRET_KEY precisa ser unico e ter pelo menos 32 caracteres em producao.")
        if self.seed_demo_data:
            raise ValueError("SEED_DEMO_DATA deve ser false em producao.")
        if self.database_url.startswith("sqlite"):
            raise ValueError("DATABASE_URL nao pode usar SQLite em producao.")
        if any("localhost" in origin or "127.0.0.1" in origin for origin in self._configured_cors_origins()):
            raise ValueError("FRONTEND_ORIGIN nao pode apontar para localhost em producao.")
        return self

    @property
    def cors_origins(self) -> list[str]:
        configured = self._configured_cors_origins()
        if self.environment.lower() == "production":
            return configured
        defaults = ["http://localhost:3000", "http://127.0.0.1:3000"]
        return list(dict.fromkeys([*configured, *defaults]))

    def _configured_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
