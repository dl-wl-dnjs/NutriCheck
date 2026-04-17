from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.user import User

router = APIRouter(tags=["users"])


@router.get("/users/{user_id}")
def get_user(user_id: UUID, db: Session = Depends(get_db)) -> dict[str, str | None]:
    row = db.get(User, user_id)
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": str(row.id), "display_name": row.display_name}
