from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "Donk ENEM"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://enem:enem@localhost:5432/enem_redacao"
    jwt_secret_key: str = "change-this-secret-before-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    openai_api_key: str | None = None
    openai_model: str = "gpt-5.5"
    frontend_origin: str = "http://localhost:3000"
    environment: str = "development"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        configured = [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]
        defaults = ["http://localhost:3000", "http://127.0.0.1:3000"]
        return list(dict.fromkeys([*configured, *defaults]))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
