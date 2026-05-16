# ─────────────────────────────────────────────────────────────────────────────
#  V1 API Router — tüm v1 route'ları burada birleştirilir.
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter

from app.api.v1.routes import auth, projects, inventory, finance

router = APIRouter()

router.include_router(auth.router,      prefix="/auth",      tags=["auth"])
router.include_router(projects.router,  prefix="/projects",  tags=["projects"])
router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
router.include_router(finance.router,   prefix="/finance",   tags=["finance"])
