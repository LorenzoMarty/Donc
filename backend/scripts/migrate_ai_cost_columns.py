"""Migração idempotente: adiciona as colunas de custo de IA em ai_interaction_logs.

Necessária em produção (Vercel serverless) porque o guard de schema do lifespan do FastAPI
não roda de forma confiável no adapter serverless — então as colunas novas
(input_tokens, output_tokens, cost_micro_usd, model) nunca foram criadas no Postgres de prod.

Uso (apontando para o DATABASE_URL de produção):
    cd backend
    python -m scripts.migrate_ai_cost_columns

Idempotente: usa ADD COLUMN IF NOT EXISTS (Postgres). Rodar várias vezes é seguro.
"""

from __future__ import annotations

from sqlalchemy import text

from src.database.session import engine

# (coluna, DDL) — espelha src/models/ai.py::AIInteractionLog e o guard em src/main.py.
COLUMNS = [
    ("input_tokens", "input_tokens INTEGER NOT NULL DEFAULT 0"),
    ("output_tokens", "output_tokens INTEGER NOT NULL DEFAULT 0"),
    ("cost_micro_usd", "cost_micro_usd BIGINT NOT NULL DEFAULT 0"),
    ("model", "model VARCHAR(80)"),
]


def run() -> None:
    dialect = engine.dialect.name
    with engine.begin() as conn:
        for column_name, ddl in COLUMNS:
            if dialect == "postgresql":
                conn.execute(text(f"ALTER TABLE ai_interaction_logs ADD COLUMN IF NOT EXISTS {ddl}"))
            else:
                # SQLite/outros: ADD COLUMN IF NOT EXISTS não é suportado — checar antes.
                from sqlalchemy import inspect

                existing = {c["name"] for c in inspect(conn).get_columns("ai_interaction_logs")}
                if column_name not in existing:
                    conn.execute(text(f"ALTER TABLE ai_interaction_logs ADD COLUMN {ddl}"))
            print(f"OK: coluna garantida -> {column_name}")
    print("Migração concluída.")


if __name__ == "__main__":
    run()
