from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
import jwt
from fastapi import HTTPException, status
from app.core.config import settings

ALGORITHM = settings.ALGORITHM
SECRET_KEY = settings.SECRET_KEY

# We use a custom audience or claim to separate context tokens from regular login tokens
CONTEXT_AUDIENCE = "tenant-context-switching"

def create_context_token(
    actor_user_id: str,
    tenant_id: str,
    mode: str,  # "read_only" | "support_write"
    reason: str | None = None,
    ticket_ref: str | None = None,
    duration_minutes: int = 30,
    context_id: str | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=duration_minutes)
    
    payload = {
        "aud": CONTEXT_AUDIENCE,
        "sub": actor_user_id,
        "tenant_id": tenant_id,
        "mode": mode,
        "reason": reason,
        "ticket_ref": ticket_ref,
        "exp": expire,
        "iat": now,
        "context_id": context_id,
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_context_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            audience=CONTEXT_AUDIENCE,
            algorithms=[ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Firma bağlamı (context) süresi doldu. Lütfen yeniden bağlam başlatın.",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz firma bağlamı (context) token'ı.",
        )
