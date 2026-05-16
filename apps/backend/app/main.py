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
from app.core.exceptions import AppException

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Sismik Mekanik ERP API",
    description="Mekanik Tesisat / Sismik Koruma / Yangın Söndürme Şantiye ERP",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/v1/openapi.json",
    redoc_url="/api/redoc",
)


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
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "type": type(exc).__name__},
    )


# ── Lifecycle Events ───────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup() -> None:
    await init_db()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await close_db()


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "env": settings.ENV}


# ── Routers ────────────────────────────────────────────────────────────────────
from app.api.v1.routes import router as v1_router
app.include_router(v1_router, prefix="/api/v1")
