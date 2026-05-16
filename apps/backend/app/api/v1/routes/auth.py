# ─────────────────────────────────────────────────────────────────────────────
#  V1 Auth Router — Login / Refresh / Me
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.db.models import User
from app.db.schemas import Token, TokenRefresh, UserRead

router = APIRouter()


@router.post("/login", response_model=Token, tags=["auth"])
async def login(
    db:          AsyncSession = Depends(get_db),
    form_data:   OAuth2PasswordRequestForm = Depends(),
) -> Token:
    """E-posta + şifre ile JWT login."""
    result  = await db.execute(select(User).where(User.email == form_data.username))
    user    = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz e-posta veya şifre.",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Hesabınız pasif durumda.")

    roles:       list[str] = []
    permissions: list[str] = []

    access_token  = create_access_token(
        sub=str(user.id), roles=roles, permissions=permissions
    )
    refresh_token = create_refresh_token(sub=str(user.id))

    return Token(
        access_token  = access_token,
        refresh_token = refresh_token,
        token_type    = "bearer",
    )


@router.post("/refresh", response_model=Token, tags=["auth"])
async def refresh_token(
    body:  TokenRefresh,
    db:    AsyncSession = Depends(get_db),
) -> Token:
    try:
        from app.core.security import decode_token
        payload = decode_token(body.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Geçersiz refresh token.")

    user_result = await db.execute(
        select(User).where(User.id == payload["sub"])
    )
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı.")

    roles       = []
    permissions = []

    access_token  = create_access_token(sub=str(user.id), roles=roles, permissions=permissions)
    refresh_token = create_refresh_token(sub=str(user.id))

    return Token(
        access_token  = access_token,
        refresh_token = refresh_token,
        token_type    = "bearer",
    )


@router.get("/me", response_model=UserRead, tags=["auth"])
async def get_me(
    user: User = Depends(get_current_user),
) -> UserRead:
    """Token'ındaki kullanıcı profilini döner."""
    return UserRead.model_validate(user)
