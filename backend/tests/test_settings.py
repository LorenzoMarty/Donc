from src.config.settings import Settings


def test_database_url_normalizes_postgres_scheme_to_psycopg_driver():
    settings = Settings(database_url="postgres://user:pass@localhost:5432/app")

    assert settings.database_url == "postgresql+psycopg://user:pass@localhost:5432/app"


def test_database_url_normalizes_postgresql_scheme_to_psycopg_driver():
    settings = Settings(database_url="postgresql://user:pass@localhost:5432/app")

    assert settings.database_url == "postgresql+psycopg://user:pass@localhost:5432/app"


def test_database_url_preserves_explicit_driver_and_sqlite_urls():
    settings = Settings(database_url="postgresql+psycopg://user:pass@localhost:5432/app")

    assert settings.database_url == "postgresql+psycopg://user:pass@localhost:5432/app"
    assert Settings(database_url="sqlite:///local.db").database_url == "sqlite:///local.db"


def test_pgvector_is_disabled_by_default():
    assert Settings().enable_pgvector is False


def test_production_requires_hardened_security_settings():
    try:
        Settings(
            environment="production",
            database_url="postgresql+psycopg://user:pass@db:5432/app",
            frontend_origin="https://app.example.com",
            openai_api_key="sk-test",
            jwt_secret_key="change-this-secret-before-production",
        )
    except ValueError as exc:
        assert "JWT_SECRET_KEY" in str(exc)
    else:
        raise AssertionError("Production settings accepted the default JWT secret.")


def test_production_cors_uses_only_configured_origins():
    settings = Settings(
        environment="production",
        database_url="postgresql+psycopg://user:pass@db:5432/app",
        frontend_origin="https://app.example.com,https://admin.example.com",
        openai_api_key="sk-test",
        jwt_secret_key="a" * 48,
        seed_demo_data=False,
    )

    assert settings.cors_origins == ["https://app.example.com", "https://admin.example.com"]


def test_production_rejects_demo_seed_and_localhost_origin():
    for kwargs, expected in [
        ({"seed_demo_data": True, "frontend_origin": "https://app.example.com"}, "SEED_DEMO_DATA"),
        ({"seed_demo_data": False, "frontend_origin": "http://localhost:3000"}, "FRONTEND_ORIGIN"),
    ]:
        try:
            Settings(
                environment="production",
                database_url="postgresql+psycopg://user:pass@db:5432/app",
                openai_api_key="sk-test",
                jwt_secret_key="a" * 48,
                **kwargs,
            )
        except ValueError as exc:
            assert expected in str(exc)
        else:
            raise AssertionError(f"Production settings accepted invalid {expected} configuration.")
