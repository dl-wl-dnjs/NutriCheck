from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.database import Base, engine
from backend.routers import (
    alternatives,
    health_profile,
    products,
    profile,
    scan,
    scan_legacy,
    search,
    users,
)
from backend.schema_upgrade import apply_postgres_column_patches

app = FastAPI(title="NutriCheck API")


@app.exception_handler(RequestValidationError)
async def request_validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": exc.errors()})


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# New spec-shaped endpoints (no /api prefix):
#   GET/PUT /profile/{user_id}, POST /scan, GET /scan-history/{user_id}
app.include_router(profile.router)
app.include_router(scan.router)
app.include_router(alternatives.router)
app.include_router(search.router)

# Legacy endpoints (kept until frontend migration completes):
#   /api/health-profile/*, /api/scan/barcode, /api/scan/history,
#   /api/products/{id}/alternatives, /api/users/{id}
app.include_router(users.router, prefix="/api")
app.include_router(health_profile.router, prefix="/api")
app.include_router(scan_legacy.router, prefix="/api")
app.include_router(products.router, prefix="/api")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    apply_postgres_column_patches(engine)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
