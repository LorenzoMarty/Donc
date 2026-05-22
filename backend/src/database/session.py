from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from src.config.settings import settings


class Base(DeclarativeBase):
    """Base class for SQLAlchemy ORM models."""


engine_options = {"pool_pre_ping": True}
if settings.database_url.startswith("postgres"):
    engine_options["connect_args"] = {"connect_timeout": settings.database_connect_timeout_seconds}

engine = create_engine(settings.database_url, **engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
