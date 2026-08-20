"""Remove Course entity: Module becomes the root of the content tree.

Modules gain their own `color` and `slug`. Catalog data (subjects, modules, lessons,
module_items, exercises and everything cascading from them) is wiped and reseeded from
scratch on next app startup — this repo has always had a single course, so there is no
meaningful per-course data to migrate.

Revision ID: 0007_remove_course_entity
Revises: 0006_module_target_competencies
Create Date: 2026-07-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0007_remove_course_entity"
down_revision: str | None = "0006_module_target_competencies"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "subjects" in inspector.get_table_names():
        # ON DELETE CASCADE on modules/module_items/lessons/exercises/lesson_progress/
        # exercise_answers takes care of everything hanging off subjects.
        op.execute(sa.text("DELETE FROM subjects"))

    module_columns = {c["name"] for c in inspector.get_columns("modules")}
    if "color" not in module_columns:
        op.add_column("modules", sa.Column("color", sa.String(40), nullable=False, server_default="#65BE02"))
    if "slug" not in module_columns:
        op.add_column("modules", sa.Column("slug", sa.String(140), nullable=True))

    # Historico: a guarda de runtime `_ensure_runtime_columns` (ja removida de src/main.py)
    # podia ter criado `slug`/`color` como coluna simples antes desta migracao rodar — a
    # constraint unique so essa migracao cria, entao verifica independente do ADD COLUMN acima.
    existing_constraints = {c["name"] for c in inspector.get_unique_constraints("modules")}
    if "uq_modules_slug" not in existing_constraints:
        op.create_unique_constraint("uq_modules_slug", "modules", ["slug"])

    if "subject_id" in module_columns:
        op.drop_column("modules", "subject_id")

    if "subjects" in inspector.get_table_names():
        op.drop_table("subjects")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("slug", sa.String(140), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("color", sa.String(40), nullable=True),
    )
    op.add_column("modules", sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True))
    module_columns = {c["name"] for c in inspector.get_columns("modules")}
    if "slug" in module_columns:
        op.drop_constraint("uq_modules_slug", "modules", type_="unique")
        op.drop_column("modules", "slug")
    if "color" in module_columns:
        op.drop_column("modules", "color")
