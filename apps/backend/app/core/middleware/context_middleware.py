from __future__ import annotations

import json
from uuid import UUID
from fastapi import Request, status, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.services.context_service import decode_context_token
from app.core.database import AsyncSessionLocal
from app.db.models import PlatformAdminAction, PlatformContextSession
from sqlalchemy import select

class TenantContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        x_tenant_context = request.headers.get("X-Tenant-Context") or request.headers.get("x-tenant-context")
        
        if x_tenant_context:
            try:
                # Decrypt and verify the context token (verifies exp & signature)
                payload = decode_context_token(x_tenant_context)
                mode = payload.get("mode")
                tenant_id = payload.get("tenant_id")
                actor_user_id = payload.get("sub")
                context_id = payload.get("context_id")
                
                if not context_id:
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={"detail": "Bağlam içinde oturum kimliği bulunamadı.", "type": "CONTEXT_INVALID"}
                    )
                
                # Stateful check: query database to verify the session status
                from datetime import datetime, timezone
                async with AsyncSessionLocal() as db:
                    session_stmt = select(PlatformContextSession).where(PlatformContextSession.id == UUID(context_id))
                    session_res = await db.execute(session_stmt)
                    session_obj = session_res.scalar_one_or_none()
                    
                    if not session_obj:
                        return JSONResponse(
                            status_code=status.HTTP_403_FORBIDDEN,
                            content={"detail": "Aktif destek oturumu bulunamadı.", "type": "CONTEXT_INVALID"}
                        )
                    if session_obj.status != "active":
                        return JSONResponse(
                            status_code=status.HTTP_403_FORBIDDEN,
                            content={
                                "detail": f"Destek oturumu sonlandırılmış. Durum: {session_obj.status.upper()}",
                                "type": "CONTEXT_INVALID"
                            }
                        )
                    if session_obj.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
                        session_obj.status = "expired"
                        session_obj.ended_at = datetime.now(timezone.utc).replace(tzinfo=None)
                        db.add(session_obj)
                        await db.commit()
                        return JSONResponse(
                            status_code=status.HTTP_403_FORBIDDEN,
                            content={"detail": "Destek oturumu süresi dolmuş.", "type": "CONTEXT_EXPIRED"}
                        )

                # Check path: platform paths, auth paths, health/ready are exempt
                path = request.url.path
                is_tenant_path = not (
                    path.startswith("/api/v1/platform") or 
                    path.startswith("/api/v1/auth") or 
                    path.startswith("/health") or 
                    path.startswith("/ready") or
                    path.startswith("/static")
                )
                
                if is_tenant_path:
                    # 1. Read-Only Protection
                    if mode == "read_only" and request.method in ["POST", "PUT", "PATCH", "DELETE"]:
                        return JSONResponse(
                            status_code=status.HTTP_403_FORBIDDEN,
                            content={
                                "detail": "Bu işlem için yetkiniz yok. Salt okunur (Read-Only) moddasınız.",
                                "type": "CONTEXT_READ_ONLY"
                            }
                        )
                        
                    # 2. Support-Write Auditing
                    if mode == "support_write" and request.method in ["POST", "PUT", "PATCH", "DELETE"]:
                        # Record write action in audit log
                        async with AsyncSessionLocal() as db:
                            details = {
                                "context_id": payload.get("context_id"),
                                "mode": mode,
                                "endpoint": path,
                                "method": request.method,
                                "query_params": dict(request.query_params),
                            }
                            event = PlatformAdminAction(
                                actor_user_id=UUID(actor_user_id),
                                action="context_write_action",
                                tenant_id=UUID(tenant_id),
                                details=json.dumps(details, ensure_ascii=False)
                            )
                            db.add(event)
                            await db.commit()
                            
            except HTTPException as http_exc:
                return JSONResponse(
                    status_code=http_exc.status_code,
                    content={"detail": http_exc.detail, "type": "CONTEXT_INVALID"}
                )
            except Exception as e:
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "Firma bağlamı (context) geçersiz veya süresi dolmuş.", "type": "CONTEXT_INVALID"}
                )
                
        return await call_next(request)
