from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.exceptions import UserNotFoundError
from backend.models.health_profile import HealthProfile
from backend.schemas.health_profile import HealthProfileCreateRequest, HealthProfileResponse
from backend.services.health_profile_service import upsert_health_profile

router = APIRouter(tags=["health-profile"])


@router.get("/health-profile/{user_id}", response_model=HealthProfileResponse)
def get_health_profile(user_id: UUID, db: Session = Depends(get_db)) -> HealthProfileResponse:
    row = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user_id))
    if row is None:
        raise HTTPException(status_code=404, detail="Health profile not found")
    return HealthProfileResponse.model_validate(row)


@router.post("/health-profile", response_model=HealthProfileResponse)
def create_or_update_health_profile(
    body: HealthProfileCreateRequest,
    db: Session = Depends(get_db),
) -> HealthProfileResponse:
    try:
        profile = upsert_health_profile(db, body)
    except UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found") from None
    return HealthProfileResponse.model_validate(profile)
