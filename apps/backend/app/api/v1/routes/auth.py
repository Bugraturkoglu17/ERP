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


# ── User CRUD for Admin & RBAC ───────────────────────────────────────────────

from app.db.schemas import UserCreate, UserUpdate

@router.get("/users", response_model=list[UserRead], tags=["auth"])
async def list_users(
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
) -> list[User]:
    """Tüm kullanıcıları listele."""
    if "admin" not in (user.default_role or ""):
        raise HTTPException(status_code=403, detail="Kullanıcıları listeleme yetkiniz yok.")
        
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars())


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED, tags=["auth"])
async def create_user(
    user_in: UserCreate,
    db:      AsyncSession = Depends(get_db),
    admin:   User         = Depends(get_current_user),
) -> User:
    """Yeni kullanıcı oluştur."""
    if "admin" not in (admin.default_role or ""):
        raise HTTPException(status_code=403, detail="Kullanıcı oluşturma yetkiniz yok.")

    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var.")

    db_user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        default_role=user_in.roles[0] if user_in.roles else "saha_muhendisi",
        discipline=user_in.discipline,
        discipline_only=user_in.discipline_only,
        is_active=True,
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


@router.patch("/users/{user_id}", response_model=UserRead, tags=["auth"])
async def update_user_details(
    user_id: str,
    user_in: UserUpdate,
    db:      AsyncSession = Depends(get_db),
    admin:   User         = Depends(get_current_user),
) -> User:
    """Kullanıcı bilgilerini ve yetkilerini güncelle."""
    if "admin" not in (admin.default_role or ""):
        raise HTTPException(status_code=403, detail="Kullanıcı güncelleme yetkiniz yok.")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.phone is not None:
        user.phone = user_in.phone
    if user_in.discipline is not None:
        user.discipline = user_in.discipline
    if user_in.is_active is not None:
        user.is_active = user_in.is_active

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["auth"])
async def delete_user_account(
    user_id: str,
    db:      AsyncSession = Depends(get_db),
    admin:   User         = Depends(get_current_user),
):
    """Kullanıcı hesabını sil (soft veya hard)."""
    if "admin" not in (admin.default_role or ""):
        raise HTTPException(status_code=403, detail="Kullanıcı silme yetkiniz yok.")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    
    user.is_active = False
    db.add(user)
    await db.commit()
