from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.exceptions import UserNotFoundError
from backend.schemas.alternatives import AlternativesResponse
from backend.services.alternative_recommendation_service import list_alternatives

router = APIRouter(tags=["products"])


@router.get("/products/{product_id}/alternatives", response_model=AlternativesResponse)
def get_alternatives(
    product_id: UUID,
    user_id: str = Query(..., description="Current user UUID"),
    db: Session = Depends(get_db),
) -> AlternativesResponse:
    try:
        return list_alternatives(db, UUID(user_id), product_id)
    except UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found") from None
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
