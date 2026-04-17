"""Schemas for the new GET/PUT /profile/{user_id} endpoints."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _normalize_string_list(values: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for raw in values:
        s = str(raw).strip()
        if not s:
            continue
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
    return out


class ProfileUpsertRequest(BaseModel):
    """Body for PUT /profile/{user_id}. ``user_id`` itself comes from the path."""

    health_conditions: list[str] = Field(default_factory=list)
    allergens: list[str] = Field(default_factory=list)
    fitness_goal: str = Field(..., min_length=1, max_length=100)

    @field_validator("health_conditions", "allergens", mode="before")
    @classmethod
    def _normalize(cls, v: list[str] | None) -> list[str]:
        if v is None:
            return []
        return _normalize_string_list(list(v))

    @field_validator("fitness_goal")
    @classmethod
    def _trim(cls, v: str) -> str:
        return v.strip()


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    health_conditions: list[str]
    allergens: list[str]
    fitness_goal: str
    created_at: datetime
    updated_at: datetime
