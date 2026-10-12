"""Drop legacy tables no longer mapped by any model (mock exams, achievements).

Destrutivo e sem volta: os dados dessas tabelas sao descartados. Elas so existem em bancos criados
pela baseline antiga (`create_all`); em bancos novos o `DROP ... IF EXISTS` e no-op.

Revision ID: 0039_drop_legacy_tables
Revises: 0038_support_tickets
Create Date: 2026-10-12
"""

from collections.abc import Sequence

from alembic import op


revision: str = "0039_drop_legacy_tables"
down_revision: str | None = "0038_support_tickets"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Filhas antes das pais, por causa das FKs.
LEGACY_TABLES = ("user_achievements", "mock_exam_attempts", "mock_exam_questions", "mock_exams", "achievements")


def upgrade() -> None:
    for table in LEGACY_TABLES:
        op.execute(f"DROP TABLE IF EXISTS {table}")


def downgrade() -> None:
    # Sem volta: nenhum model descreve essas tabelas, e os dados foram descartados no upgrade.
    pass
