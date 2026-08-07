"""Add essays.last_ai_job_id — tracks the current correction job directly instead of inferring
it via AIJob ordering.

`ai_jobs.id` is a UUID (no temporal ordering) and `created_at` can collide between the old and the
new job when a reprocess happens right after a submit — `GET /essays/{id}/job` inferring "the
latest job" by sorting on those columns is inherently ambiguous. Storing the job id directly on
the essay when it's created removes the ambiguity entirely.

Revision ID: 0011_essay_last_ai_job_id
Revises: 0010_index_user_id_fks
Create Date: 2026-08-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0011_essay_last_ai_job_id"
down_revision: str | None = "0010_index_user_id_fks"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("essays", sa.Column("last_ai_job_id", sa.String(length=36), nullable=True))


def downgrade() -> None:
    op.drop_column("essays", "last_ai_job_id")
