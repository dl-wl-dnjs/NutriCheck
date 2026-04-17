from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.exceptions import UserNotFoundError
from backend.models.health_profile import HealthProfile
from backend.models.user import User
from backend.schemas.health_profile import HealthProfileCreateRequest


def upsert_health_profile(db: Session, data: HealthProfileCreateRequest) -> HealthProfile:
    user_id = UUID(data.user_id)
    user = db.get(User, user_id)
    if user is None:
        raise UserNotFoundError()

    conditions = list(data.health_conditions)
    allergens = list(data.allergens)
    goal = data.fitness_goal.strip()
    now = datetime.now(timezone.utc)

    existing = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user_id))
    if existing is not None:
        existing.health_conditions = conditions
        existing.allergens = allergens
        existing.fitness_goal = goal
        existing.updated_at = now
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    profile = HealthProfile(
        user_id=user_id,
        health_conditions=conditions,
        allergens=allergens,
        fitness_goal=goal,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile
