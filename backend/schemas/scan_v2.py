"""Schemas for the new POST /scan and GET /scan-history/{user_id} endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ScanRequest(BaseModel):
    user_id: str
    barcode: str = Field(..., min_length=4, max_length=32)

    @field_validator("user_id")
    @classmethod
    def _user_uuid(cls, v: str) -> str:
        UUID(v)
        return v

    @field_validator("barcode")
    @classmethod
    def _digits_only(cls, v: str) -> str:
        cleaned = "".join(c for c in v.strip() if c.isdigit())
        if len(cleaned) < 4:
            raise ValueError("Barcode must contain at least 4 digits")
        return cleaned


Tier = Literal["good", "okay", "bad"]


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    barcode: str
    name: str
    brand: str | None
    category: str | None
    ingredients_text: str | None
    simplified_summary: str | None
    nutriments: dict[str, Any] | None
    image_url: str | None = None
    source: str


class RatingOut(BaseModel):
    score: int = Field(..., ge=0, le=100)
    tier: Tier
    label: str
    avoid: bool = False
    avoid_reason: str | None = None
    warnings: list[str] = Field(default_factory=list)
    recommendation: str | None = None
    limited_information: bool = False


class ScanResponse(BaseModel):
    scan_id: UUID
    product: ProductOut
    rating: RatingOut


class ScanHistoryItemOut(BaseModel):
    id: UUID
    barcode: str
    score: int
    tier: Tier
    label: str
    created_at: datetime
    product_name: str | None = None
    product_brand: str | None = None
    product_image_url: str | None = None


class ScanHistoryResponse(BaseModel):
    items: list[ScanHistoryItemOut]
