"""add users.auth_sub for Clerk / external auth mapping

Revision ID: 0005_auth_sub
Revises: 0004_scan_unique
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_auth_sub"
down_revision: str | None = "0004_scan_unique"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("auth_sub", sa.String(), nullable=True))
    op.create_unique_constraint("uq_users_auth_sub", "users", ["auth_sub"])


def downgrade() -> None:
    op.drop_constraint("uq_users_auth_sub", "users", type_="unique")
    op.drop_column("users", "auth_sub")