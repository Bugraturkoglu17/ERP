from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import redis.asyncio as aioredis
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.workers import celery_app
from fastapi.routing import APIRoute

router = APIRouter(tags=["meta"])

@router.get("/health", summary="Basic Health Check")
async def health_check():
    return {"status": "ok", "env": settings.ENV}


@router.get("/ready", summary="Readiness Probe")
async def readiness_probe(db: AsyncSession = Depends(get_db)):
    """Checks dependencies: Postgres, Redis, Celery broker."""
    status = {"postgres": "ok", "redis": "ok", "celery": "ok"}
    overall = True

    # Check DB
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        status["postgres"] = "failed"
        overall = False

    # Check Redis
    try:
        r = aioredis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        await r.ping()
        await r.aclose()
    except Exception:
        status["redis"] = "failed"
        overall = False

    # Check Celery broker (best effort without blocking the event loop too long)
    try:
        # Pinging celery might block or timeout, so we just check the URL config presence
        if not celery_app.conf.broker_url:
            status["celery"] = "failed"
            overall = False
    except Exception:
        status["celery"] = "failed"
        overall = False

    if not overall:
        return JSONResponse(status_code=503, content={"status": "unhealthy", "details": status})
        
    return {"status": "ready", "details": status}


# ── Developer Diagnostics Toolkit ─────────────────────────────────────────────

@router.get("/meta/routes", summary="List All API Routes", dependencies=[Depends(require_role("platform_admin", "admin"))])
async def list_routes(request: Request) -> List[Dict[str, Any]]:
    routes = []
    for route in request.app.routes:
        if isinstance(route, APIRoute):
            routes.append({
                "path": route.path,
                "name": route.name,
                "methods": list(route.methods),
                "tags": route.tags,
                "operation_id": route.operation_id
            })
    return routes


@router.get("/meta/openapi-summary", summary="API Inventory Summary", dependencies=[Depends(require_role("platform_admin", "admin"))])
async def openapi_summary(request: Request) -> Dict[str, Any]:
    total_endpoints = 0
    tag_counts = {}
    methods_counts = {}
    
    for route in request.app.routes:
        if isinstance(route, APIRoute):
            total_endpoints += 1
            for tag in route.tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
            for method in route.methods:
                methods_counts[method] = methods_counts.get(method, 0) + 1
                
    return {
        "total_endpoints": total_endpoints,
        "by_tag": tag_counts,
        "by_method": methods_counts
    }


@router.get("/meta/security-matrix", summary="Route Security Matrix", dependencies=[Depends(require_role("platform_admin", "admin"))])
async def security_matrix(request: Request) -> List[Dict[str, Any]]:
    matrix = []
    for route in request.app.routes:
        if isinstance(route, APIRoute):
            # Best effort dependency analysis
            deps = [d.dependency.__name__ if hasattr(d.dependency, '__name__') else str(d.dependency) for d in route.dependencies]
            
            matrix.append({
                "path": route.path,
                "methods": list(route.methods),
                "tags": route.tags,
                "auth_required": "get_current_user" in deps or any("require_role" in d for d in deps),
                "dependencies": deps
            })
    return matrix

@router.get("/meta/architecture", summary="Developer Architecture Registry", dependencies=[Depends(require_role("platform_admin", "admin"))])
async def architecture_registry() -> Dict[str, Any]:
    import os
    import json
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_dir))))
    architecture_dir = os.path.join(backend_dir, "architecture")
    
    domains = []
    total_entities = 0
    total_routes = 0
    total_public_endpoints = 0
    all_events = set()
    
    if os.path.exists(architecture_dir):
        for filename in os.listdir(architecture_dir):
            if filename.endswith(".json"):
                with open(os.path.join(architecture_dir, filename), "r", encoding="utf-8") as f:
                    try:
                        data = json.load(f)
                        domains.append({
                            "name": data.get("domain", ""),
                            "description": data.get("description", ""),
                            "tenant_protection": bool(data.get("tenant_helper") and data.get("tenant_helper") != "None"),
                            "public_endpoints_count": len(data.get("public_endpoints", []))
                        })
                        
                        total_entities += len(data.get("entities", []))
                        total_routes += len(data.get("routes", []))
                        total_public_endpoints += len(data.get("public_endpoints", []))
                        for e in data.get("events", []):
                            all_events.add(e)
                    except Exception:
                        pass
                        
    return {
        "domains": sorted(domains, key=lambda x: x["name"]),
        "summary": {
            "total_domains": len(domains),
            "total_entities": total_entities,
            "total_routes": total_routes,
            "total_public_endpoints": total_public_endpoints,
            "all_events": sorted(list(all_events))
        }
    }
