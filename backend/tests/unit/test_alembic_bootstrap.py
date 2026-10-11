"""Bootstrap de banco vazio em `alembic upgrade head` (alembic/env.py): roda o CLI de verdade contra
um sqlite temporario. Garante que so `upgrade head` em banco SEM nenhuma tabela cria o schema, e que
`current`/`check` e bancos que ja tem tabelas nao disparam o bootstrap."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, text

pytestmark = pytest.mark.unit

BACKEND_ROOT = Path(__file__).resolve().parents[2]
BOOTSTRAP_LOG = "Banco vazio: criando o schema dos models"


def _alembic(db_file: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{db_file}", "SEED_DEMO_DATA": "false"}
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args], cwd=BACKEND_ROOT, env=env, capture_output=True, text=True, timeout=120, check=False
    )


def _tables(db_file: Path) -> set[str]:
    engine = create_engine(f"sqlite:///{db_file}")
    try:
        return set(inspect(engine).get_table_names())
    finally:
        engine.dispose()


def test_upgrade_head_on_empty_database_creates_schema_and_stamps_head(tmp_path: Path) -> None:
    db_file = tmp_path / "empty.db"

    result = _alembic(db_file, "upgrade", "head")

    assert result.returncode == 0, result.stderr
    assert BOOTSTRAP_LOG in result.stderr
    assert {"users", "essays", "user_game_progress", "alembic_version"} <= _tables(db_file)
    current = _alembic(db_file, "current")
    assert "(head)" in current.stdout + current.stderr

    again = _alembic(db_file, "upgrade", "head")
    assert again.returncode == 0, again.stderr
    assert BOOTSTRAP_LOG not in again.stderr


def test_current_and_check_on_empty_database_do_not_create_schema(tmp_path: Path) -> None:
    db_file = tmp_path / "untouched.db"

    results = [_alembic(db_file, "current"), _alembic(db_file, "check")]

    assert all(BOOTSTRAP_LOG not in result.stderr for result in results)
    # `alembic_version` e criada pelo proprio Alembic nesses comandos; tabela da aplicacao nao.
    assert _tables(db_file) - {"alembic_version"} == set()


def test_database_with_any_existing_table_does_not_bootstrap(tmp_path: Path) -> None:
    db_file = tmp_path / "legacy.db"
    engine = create_engine(f"sqlite:///{db_file}")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE legacy_table (id INTEGER PRIMARY KEY)"))
    engine.dispose()

    result = _alembic(db_file, "upgrade", "head")

    # Segue a cadeia de migrations (pode ate falhar, como num banco legado real): o que nao pode
    # acontecer e o atalho create_all + stamp head.
    assert BOOTSTRAP_LOG not in result.stderr
