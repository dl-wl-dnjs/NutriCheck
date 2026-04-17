"""Legacy scan endpoints under /api/scan/* — kept alive while the frontend
migrates to POST /scan and GET /scan-history/{user_id}. Delete this file once
the frontend no longer references the /api/scan/* paths."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from backend.database import get_db
from backend.exceptions import UserNotFoundError
from backend.models.scan_history import ScanHistory
from backend.schemas.scan import ScanBarcodeRequest, ScanBarcodeResponse
from backend.services.scan_service import scan_barcode

router = APIRouter(tags=["scan-legacy"])


class ScanHistoryItem(BaseModel):
    id: UUID
    barcode: str
    score: int
    label: str
    created_at: str
    product_name: str | None = None
    product_brand: str | None = None


class ScanHistoryResponse(BaseModel):
    items: list[ScanHistoryItem]


@router.post("/scan/barcode", response_model=ScanBarcodeResponse)
def post_scan_barcode(body: ScanBarcodeRequest, db: Session = Depends(get_db)) -> ScanBarcodeResponse:
    try:
        return scan_barcode(db, UUID(body.user_id), body.barcode)
    except UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found") from None
    except ValueError as exc:
        msg = str(exc).lower()
        if "not found" in msg or "required" in msg:
            code = 404 if "not found" in msg else 400
            raise HTTPException(status_code=code, detail=str(exc)) from None
        raise HTTPException(status_code=400, detail=str(exc)) from None


@router.get("/scan/history", response_model=ScanHistoryResponse)
def get_scan_history(
    user_id: str = Query(...),
    db: Session = Depends(get_db),
) -> ScanHistoryResponse:
    try:
        UUID(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid user_id") from exc
    rows = (
        db.scalars(
            select(ScanHistory)
            .options(joinedload(ScanHistory.product))
            .where(ScanHistory.user_id == UUID(user_id))
            .order_by(ScanHistory.created_at.desc())
            .limit(20)
        )
        .unique()
        .all()
    )
    items = [
        ScanHistoryItem(
            id=r.id,
            barcode=r.barcode,
            score=r.score,
            label=r.label,
            created_at=r.created_at.isoformat(),
            product_name=r.product.name if r.product is not None else None,
            product_brand=r.product.brand if r.product is not None else None,
        )
        for r in rows
    ]
    return ScanHistoryResponse(items=items)
