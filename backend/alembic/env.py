import logging
from logging.config import fileConfig

from alembic import context
from alembic.script import ScriptDirectory
from sqlalchemy import engine_from_config, inspect, pool, text

from src.config.settings import settings
from src.database.session import Base
from src.models import *  # noqa: F401,F403

config = context.config
logger = logging.getLogger("alembic.env")
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


def _is_upgrade_to_head() -> bool:
    """So `alembic upgrade head` (CLI) dispara o bootstrap: `current`, `check`, `stamp` e
    `upgrade <rev>` tambem executam este env.py e nao podem criar schema como efeito colateral."""
    cmd = getattr(config.cmd_opts, "cmd", None)
    if not cmd or cmd[0].__name__ != "upgrade":
        return False
    head = ScriptDirectory.from_config(config).get_current_head()
    return context.get_revision_argument() == head


def _is_empty_database(connection) -> bool:
    """Sem nenhuma tabela. Qualquer tabela existente (restore parcial, outra aplicacao no schema,
    banco legado sem `alembic_version`) segue a cadeia: `create_all` pularia as tabelas que ja
    existem e o banco seria marcado como head sem ter passado pelas migrations."""
    return not inspect(connection).get_table_names()


def _bootstrap_empty_database(connection) -> None:
    """Ambiente novo: cria o schema atual dos models e marca o head, em vez de rodar a cadeia.

    A cadeia 0000..N so funciona sobre um banco que ja tem as tabelas base: a baseline 0000 faz
    `create_all()` com os models de HOJE, entao as migrations seguintes (0011+) tentam recriar
    colunas que ja existem e falham. Bancos que ja tem `alembic_version` ou tabelas nao passam por
    aqui — seguem a cadeia normal, como sempre.

    Limites conhecidos: so o CLI (`alembic upgrade head`) dispara isto — via `command.upgrade` do
    Python o comportamento antigo continua —, e nao ha lock: duas execucoes simultaneas num banco
    novo podem colidir (rodar a migracao uma vez por deploy, como ja se faz).
    """
    # So com pgvector ligado: sem ele a coluna de embedding e JSON (models/ai.py) e, em Postgres
    # gerenciado, o usuario da migration pode nem ter permissao de criar extensao.
    logger.info("Banco vazio: criando o schema dos models e marcando o head (bootstrap).")
    if connection.dialect.name == "postgresql" and settings.enable_pgvector:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    with context.begin_transaction():
        Base.metadata.create_all(connection)
        head = ScriptDirectory.from_config(config).get_current_head()
        context.get_context().stamp(ScriptDirectory.from_config(config), head)
    connection.commit()


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
        if _is_upgrade_to_head() and _is_empty_database(connection):
            _bootstrap_empty_database(connection)
            return
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
