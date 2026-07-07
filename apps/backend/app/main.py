# ─────────────────────────────────────────────────────────────────────────────
#  Sismik Mekanik ERP — FastAPI Main Entry Point
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import close_db, init_db
from app.core.exceptions import AppException, ErrorCode
from app.core.middleware.logging_middleware import StructuredLoggingMiddleware
from app.core.middleware.context_middleware import TenantContextMiddleware

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Golabs ERP API",
    description="Mekanik Tesisat / Yangın Söndürme Şantiye ERP",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/v1/openapi.json",
    redoc_url="/api/redoc",
)


# ── Static Files Mount for Local Storage Fallback ──────────────────────────────
from fastapi.staticfiles import StaticFiles
import os

uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=uploads_dir), name="uploads")


app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(TenantContextMiddleware)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins    = settings.CORS_ORIGINS,
    allow_credentials = True,
    allow_methods    = ["*"],
    allow_headers    = ["*"],
)


# ── Exception Handler ─────────────────────────────────────────────────────────
@app.exception_handler(AppException)
async def app_exception_handler(
    request: Request, exc: AppException
) -> JSONResponse:
    error_type = exc.error_code.value if hasattr(exc, 'error_code') else "GENERIC_ERROR"
    correlation_id = getattr(request.state, "correlation_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail, 
            "type": error_type,
            "correlation_id": correlation_id
        },
    )


# ── Lifecycle Events ───────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup() -> None:
    await init_db()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await close_db()


# ── Routers ────────────────────────────────────────────────────────────────────


# ── Routers ────────────────────────────────────────────────────────────────────
from app.api.v1.routes import router as v1_router
app.include_router(v1_router, prefix="/api/v1")
