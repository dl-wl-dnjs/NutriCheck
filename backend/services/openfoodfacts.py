"""Wrapper around the Open Food Facts product API used by POST /scan.

This is a thin re-export layer over the existing ``product_api_client`` so that
the file layout matches the spec (services/openfoodfacts.py) without
duplicating the HTTP code that already includes a USDA fallback.

Returns ``None`` if the product cannot be resolved from any source.
"""

from __future__ import annotations

from typing import Any

from backend.services.product_api_client import (
    fetch_and_normalize as _fetch_and_normalize,
    fetch_open_food_facts as _fetch_off_raw,
    normalize_from_open_food_facts as _normalize_off,
)


def fetch_product(barcode: str) -> dict[str, Any] | None:
    """Fetch a normalized product dict by barcode (Open Food Facts -> USDA fallback)."""
    return _fetch_and_normalize(barcode)


def fetch_open_food_facts(barcode: str) -> dict[str, Any] | None:
    """Fetch the raw Open Food Facts payload (used by tests)."""
    return _fetch_off_raw(barcode)


def normalize_open_food_facts(payload: dict[str, Any]) -> dict[str, Any]:
    return _normalize_off(payload)
