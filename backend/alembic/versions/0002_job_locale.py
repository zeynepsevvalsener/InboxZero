"""add locale to jobs

Revision ID: 0002_job_locale
Revises: 0001_initial
Create Date: 2026-07-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_job_locale"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "jobs",
        sa.Column("locale", sa.String(length=5), nullable=False, server_default="en"),
    )


def downgrade() -> None:
    op.drop_column("jobs", "locale")
