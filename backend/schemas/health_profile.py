from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class HealthProfileCreateRequest(BaseModel):
    user_id: str
    health_conditions: list[str]
    allergens: list[str]
    fitness_goal: str = Field(..., min_length=1, max_length=100)

    @field_validator("user_id")
    @classmethod
    def user_id_must_be_uuid(cls, v: str) -> str:
        UUID(v)
        return v

    @field_validator("health_conditions", "allergens")
    @classmethod
    def normalize_lists(cls, v: list[str]) -> list[str]:
        out: list[str] = []
        for item in v:
            s = str(item).strip()
            if s:
                out.append(s)
        return out


class HealthProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    health_conditions: list[str]
    allergens: list[str]
    fitness_goal: str
    created_at: datetime
    updated_at: datetime
