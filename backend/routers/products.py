from uuid import UUID

from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["products"])


@router.get("/products/{product_id}/alternatives", status_code=410)
def get_alternatives_legacy(product_id: UUID) -> None:
    raise HTTPException(
        status_code=410,
        detail="Removed: use GET /alternatives/{product_id} with Authorization: Bearer (Clerk JWT or dev user UUID).",
    )