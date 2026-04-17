"""dedupe scan_history and enforce one row per (user_id, product_id)

Revision ID: 0004_scan_unique
Revises: 0003_categories
Create Date: 2026-04-17 22:00:00

We now treat Recent Scans as "unique products you've scanned", bumped to the
top on re-scan — not a time-series log. This migration collapses any existing
duplicates (keeping the most recent per pair) and enforces the invariant with
a partial unique index so rows where the product was later deleted
(``product_id IS NULL``) are not constrained.
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0004_scan_unique"
down_revision: str | None = "0003_categories"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        DELETE FROM scan_history s1
        USING scan_history s2
        WHERE s1.user_id = s2.user_id
          AND s1.product_id = s2.product_id
          AND s1.product_id IS NOT NULL
          AND (
              s1.created_at < s2.created_at
              OR (s1.created_at = s2.created_at AND s1.id < s2.id)
          );
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS scan_history_user_product_uidx
          ON scan_history (user_id, product_id)
          WHERE product_id IS NOT NULL;
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS scan_history_user_product_uidx;")
