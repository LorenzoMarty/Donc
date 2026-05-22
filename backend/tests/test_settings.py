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
