"""GET /profile and PUT /profile — authenticated user health profile."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.auth import assert_user_id_matches_client, get_current_user
from backend.database import get_db
from backend.models.health_profile import HealthProfile
from backend.models.user import User
from backend.schemas.profile import ProfileResponse, ProfileUpsertRequest

router = APIRouter(tags=["profile"])


def _assert_path_user(user: User, user_id: UUID) -> None:
    assert_user_id_matches_client(
        user,
        user_id,
        detail="Cannot access another user's profile",
    )


@router.get("/profile", response_model=ProfileResponse)
def get_profile(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> ProfileResponse:
    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user.id))
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse.model_validate(profile)


@router.get("/profile/{user_id}", response_model=ProfileResponse)
def get_profile_scoped(
    user_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> ProfileResponse:
    _assert_path_user(user, user_id)
    return get_profile(db=db, user=user)


@router.put("/profile", response_model=ProfileResponse)
def upsert_profile(
    body: ProfileUpsertRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> ProfileResponse:
    now = datetime.now(timezone.utc)
    existing = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user.id))
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
        user_id=user.id,
        health_conditions=body.health_conditions,
        allergens=body.allergens,
        fitness_goal=body.fitness_goal,
    )
    db.add(created)
    db.commit()
    db.refresh(created)
    return ProfileResponse.model_validate(created)


@router.put("/profile/{user_id}", response_model=ProfileResponse)
def upsert_profile_scoped(
    user_id: UUID,
    body: ProfileUpsertRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> ProfileResponse:
    _assert_path_user(user, user_id)
    return upsert_profile(body=body, db=db, user=user)