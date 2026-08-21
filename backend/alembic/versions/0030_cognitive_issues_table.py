"""Add cognitive_issues table (real entity for the "cognitive problem" concept, was only a Python
constant) + FK from learning_outcomes.cognitive_issue_code and recommendation_logs.target_issue.

Revision ID: 0030_cognitive_issues_table
Revises: 0029_user_soft_delete
Create Date: 2026-08-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0030_cognitive_issues_table"
down_revision: str | None = "0029_user_soft_delete"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Espelha src/memory/cognitive_issues.py::ISSUE_CODES/HUB_TO_ISSUE — seed manual porque a
# migration não pode importar código da aplicação (regra Alembic padrão).
_SEED = [
    {"code": "TEXT_ROBOTIC", "label": "Seu texto parece robótico", "hub": "texto-robotico"},
    {"code": "REPETITIVE_IDEAS", "label": "Você repete ideias", "hub": "repete-ideias"},
    {"code": "WEAK_REPERTOIRE", "label": "Seu repertório não encaixa", "hub": "repertorio-nao-encaixa"},
    {"code": "SHALLOW_ARGUMENTATION", "label": "Seu texto não aprofunda", "hub": "nao-aprofunda"},
    {"code": "WEAK_THESIS", "label": "Sua introdução não cria tese", "hub": "introducao-sem-tese"},
    {"code": "C3_LOW", "label": "Você perde na Competência 3", "hub": "perde-na-c3"},
    {"code": "FORMULAIC_CONCLUSION", "label": "Sua conclusão é fórmula pronta", "hub": "conclusao-formula"},
]


def upgrade() -> None:
    op.create_table(
        "cognitive_issues",
        sa.Column("code", sa.String(length=40), primary_key=True),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("hub", sa.String(length=40), nullable=False),
    )
    issues = sa.table("cognitive_issues", sa.column("code"), sa.column("label"), sa.column("hub"))
    op.bulk_insert(issues, _SEED)

    op.create_foreign_key(
        "fk_learning_outcomes_cognitive_issue_code",
        "learning_outcomes",
        "cognitive_issues",
        ["cognitive_issue_code"],
        ["code"],
    )
    op.create_foreign_key(
        "fk_recommendation_logs_target_issue",
        "recommendation_logs",
        "cognitive_issues",
        ["target_issue"],
        ["code"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_recommendation_logs_target_issue", "recommendation_logs", type_="foreignkey")
    op.drop_constraint("fk_learning_outcomes_cognitive_issue_code", "learning_outcomes", type_="foreignkey")
    op.drop_table("cognitive_issues")
