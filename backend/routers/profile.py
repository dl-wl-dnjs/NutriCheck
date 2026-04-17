"""GET /profile/{user_id} and PUT /profile/{user_id} — spec-shaped endpoints
that the new React Query frontend talks to."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.health_profile import HealthProfile
from backend.models.user import User
from backend.schemas.profile import ProfileResponse, ProfileUpsertRequest

router = APIRouter(tags=["profile"])


def _get_or_create_user(db: Session, user_id: UUID) -> User:
    user = db.get(User, user_id)
    if user is not None:
        return user
    user = User(id=user_id)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/profile/{user_id}", response_model=ProfileResponse)
def get_profile(user_id: UUID, db: Session = Depends(get_db)) -> ProfileResponse:
    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user_id))
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse.model_validate(profile)


@router.put("/profile/{user_id}", response_model=ProfileResponse)
def upsert_profile(
    user_id: UUID,
    body: ProfileUpsertRequest,
    db: Session = Depends(get_db),
) -> ProfileResponse:
    _get_or_create_user(db, user_id)
    now = datetime.now(timezone.utc)
    existing = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user_id))
    if existing is not None:
        existing.health_conditions = body.health_conditions
        existing.allergens = body.allergens
        existing.fitness_goal = body.fitness_goal
        existing.updated_at = now
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return ProfileResponse.model_validate(existing)

    created = HealthProfile(
        user_id=user_id,
        health_conditions=body.health_conditions,
        allergens=body.allergens,
        fitness_goal=body.fitness_goal,
    )
    db.add(created)
    db.commit()
    db.refresh(created)
    return ProfileResponse.model_validate(created)
