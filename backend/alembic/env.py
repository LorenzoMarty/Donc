from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from src.config.settings import settings
from src.database.session import Base
from src.models import *  # noqa: F401,F403

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connect_args = {}
    if settings.database_url.startswith("postgres"):
        connect_args["connect_timeout"] = settings.database_connect_timeout_seconds
        if "pooler.supabase.com" in settings.database_url or ":6543/" in settings.database_url:
            connect_args["prepare_threshold"] = None
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            transaction_per_migration=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
