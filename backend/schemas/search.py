"""Schemas for GET /search — text-based product lookup against Open Food Facts."""

from __future__ import annotations

from pydantic import BaseModel, Field

from backend.schemas.scan_v2 import ProductOut, RatingOut


class SearchResultItem(BaseModel):
    product: ProductOut
    rating: RatingOut


class SearchResponse(BaseModel):
    items: list[SearchResultItem] = Field(default_factory=list)
    query: str
