"""Schemas for GET /alternatives/{product_id}: healthier same-category candidates."""

from __future__ import annotations

from pydantic import BaseModel, Field

from backend.schemas.scan_v2 import ProductOut, RatingOut


class AlternativeItem(BaseModel):
    product: ProductOut
    rating: RatingOut
    suitability_note: str | None = None


class AlternativesResponse(BaseModel):
    items: list[AlternativeItem] = Field(default_factory=list)
    note: str | None = None