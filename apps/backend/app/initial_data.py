"""
backend/app/initial_data.py
───────────────────────────
Golabs ERP — İlk Veri (Seed) Script
"""

from __future__ import annotations

import argparse
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config       import settings
from app.core.database     import AsyncSessionLocal
from app.core.security     import hash_password
from app.db.models         import (
    Branch,
    Customer,
    Invoice,
    InvoiceItem,
    Permission,
    Project,
    ProjectAssignment,
    Region,
    Role,
    RolePermission,
    User,
    UserRole,
    WorkScope,
    Material,
    Warehouse,
    WarehouseType,
    Stock,
)

# ── Consts ───────────────────────────────────────────────────────────────────

SEED_ADMIN_PASSWORD   = "Admin@2026!"
SEED_USERS_PASSWORD   = "User@2026!"
RUN_ENV               = "development"

ZINCIR_MARKET_ADMIN   = "admin@golabs.local"
ENGINEER_HVAC_EMAIL   = "hvac@golabs.local"
ENGINEER_FIRE_EMAIL   = "fire@golabs.local"
WAREHOUSE_MGR_EMAIL   = "depo@golabs.local"


from app.core.utils.helpers import utc_now


async def get_or_create(model: type, session: AsyncSession, **kwargs: Any) -> tuple[bool, Any]:
    result = await session.execute(select(model).filter_by(**kwargs))
    instance = result.scalar_one_or_none()
    if instance:
        return False, instance
    instance = model(**kwargs)
    session.add(instance)
    return True, instance


async def link_role_permission(session: AsyncSession, role_name: str, permission_code: str) -> None:
    role_result = await session.execute(select(Role).where(Role.name == role_name))
    role = role_result.scalar_one_or_none()
    if not role: return
    perm_result = await session.execute(select(Permission).where(Permission.code == permission_code))
    perm = perm_result.scalar_one_or_none()
    if not perm: return
    existing = await session.execute(
        select(RolePermission).where(RolePermission.role_id == role.id, RolePermission.permission_id == perm.id)
    )
    if existing.scalar_one_or_none(): return
    session.add(RolePermission(role_id=role.id, permission_id=perm.id))


async def run_seed(dry_run: bool = False) -> dict[str, int]:
    counts = {
        "roles": 0, "permissions": 0, "users": 0, "customers": 0,
        "regions": 0, "branches": 0, "projects": 0, "assignments": 0,
        "materials": 0, "warehouses": 0, "stocks": 0
    }

    async with AsyncSessionLocal() as session:
        async with session.begin():
            # ── 1 · Roller ──────────────────────────────────────────────────────
            role_defs = [
                ("admin",               "Yönetici",              "Tüm sistem, finans, karlılık ve ayarlara tam erişim."),
                ("saha_muhendisi",      "Saha Mühendisi",         "Atandığı projelerin çizimlerine erişirim, rapor girebilir."),
                ("depo_sorumlusu",      "Depo Sorumlusu",          "Sadece envanter işlemleri ve transfer fişleri."),
                ("musteri_kullanici",   "Müşteri Temsilcisi",      "Sadece kendi projelerinin durumunu görür."),
            ]
            for name, display, desc in role_defs:
                _, _ = await get_or_create(Role, session, name=name, display_name=display, description=desc)
                counts["roles"] += 1

            # ── 2 · İzinler ─────────────────────────────────────────────────────
            permission_defs = {
                "projects:read":    ("PROJECTS", "Proje listeleme ve detay görme"),
                "projects:create":  ("PROJECTS", "Yeni proje oluşturma"),
                "projects:update":  ("PROJECTS", "Proje düzenleme"),
                "projects:delete":  ("PROJECTS", "Proje silme"),
                "projects:assign":  ("PROJECTS", "Projeye ekip atama"),
                "documents:read":   ("DOCUMENTS","Çizim/doküman görüntüleme"),
                "documents:upload": ("DOCUMENTS","Doküman yükleme / güncelleme"),
                "inventory:read":   ("INVENTORY","Envanter listeleme"),
                "inventory:write":  ("INVENTORY","Stok giriş/çıkış / transfer"),
                "inventory:alerts": ("INVENTORY","Kritik stok uyarıları görme"),
                "finance:read":     ("FINANCE",  "Finans ekranları görme"),
                "finance:icmal":    ("FINANCE",  "İcmal/fatura işlemleri"),
                "users:read":       ("USERS",    "Kullanıcı listeleme"),
                "users:manage":     ("USERS",    "Kullanıcı ekleme/silme/değiştirme"),
            }
            for code, (scope, desc) in permission_defs.items():
                _, _ = await get_or_create(Permission, session, code=code, scope=scope, description=desc)
                counts["permissions"] += 1

            # ── 3 · Rol-İzin Bağlantıları ────────────────────────────────────────
            role_permission_map = {
                "admin":            list(permission_defs.keys()),
                "saha_muhendisi":   ["projects:read", "projects:assign", "documents:read", "documents:upload", "inventory:read", "inventory:write"],
                "depo_sorumlusu":   ["inventory:read", "inventory:write", "inventory:alerts"],
                "musteri_kullanici":["projects:read", "documents:read"],
            }
            for role_name, perms in role_permission_map.items():
                for perm_code in perms:
                    await link_role_permission(session, role_name, perm_code)

            # ── 4 · Kullanıcılar ─────────────────────────────────────────────────
            user_defs = [
                {"email": ZINCIR_MARKET_ADMIN, "full_name": "Sistem Yöneticisi", "roles": ["admin"]},
                {"email": ENGINEER_HVAC_EMAIL, "full_name": "Ahmet Yılmaz (HVAC Mühendisi)", "roles": ["saha_muhendisi"], "discipline": "hvac"},
                {"email": ENGINEER_FIRE_EMAIL, "full_name": "Fatma Demir (Yangın Mühendisi)", "roles": ["saha_muhendisi"], "discipline": "fire"},
                {"email": WAREHOUSE_MGR_EMAIL, "full_name": "Mehmet Kaya (Depo Sorumlusu)", "roles": ["depo_sorumlusu"]},
            ]
            user_uuids = {}
            for ud in user_defs:
                pw = SEED_ADMIN_PASSWORD if ud["email"] == ZINCIR_MARKET_ADMIN else SEED_USERS_PASSWORD
                user_result = await session.execute(select(User).where(User.email == ud["email"]))
                user = user_result.scalar_one_or_none()
                if not user:
                    user = User(email=ud["email"])
                    session.add(user)
                user.hashed_password = hash_password(pw)
                user.full_name = ud["full_name"]
                user.is_active = True
                user.is_verified = True
                user.default_role = ud["roles"][0]
                user.discipline = ud.get("discipline")
                await session.flush()
                user_uuids[ud["email"]] = user.id
                counts["users"] += 1

            for ud in user_defs:
                uid = user_uuids[ud["email"]]
                for role_name in ud["roles"]:
                    role_result = await session.execute(select(Role).where(Role.name == role_name))
                    role = role_result.scalar_one_or_none()
                    if role:
                        existing_ur = await session.execute(select(UserRole).where(UserRole.user_id == uid, UserRole.role_id == role.id))
                        if not existing_ur.scalar_one_or_none():
                            session.add(UserRole(user_id=uid, role_id=role.id))
                            counts["assignments"] += 1

            # ── 5 · Müşteri + Lokasyon Hiyerarşisi ───────────────────────────────
            customer_defs = [
                {"name": "X Süpermarket A.Ş.", "tax_no": "1234567890", "contact_email": "teknik@xsupermarket.com.tr", "contact_phone": "0212 111 22 33", "address": "İstanbul, Türkiye"},
                {"name": "Y Zincir Marketler Tic. A.Ş.", "tax_no": "0987654321", "contact_email": "proje@ymarkets.com.tr", "contact_phone": "0312 444 55 66", "address": "Ankara, Türkiye"},
            ]
            customer_uuids = {}
            for cd in customer_defs:
                _, cust = await get_or_create(Customer, session, name=cd["name"])
                cust.tax_no = cd.get("tax_no")
                cust.contact_email = cd.get("contact_email")
                cust.contact_phone = cd.get("contact_phone")
                cust.address = cd.get("address")
                customer_uuids[cd["name"]] = cust.id
                counts["customers"] += 1

            x_cust_id, y_cust_id = customer_uuids["X Süpermarket A.Ş."], customer_uuids["Y Zincir Marketler Tic. A.Ş."]
            region_defs = [(x_cust_id, "İstanbul Bölgesi", "IST", "İstanbul"), (y_cust_id, "Ankara Bölgesi", "ANK", "Ankara"), (y_cust_id, "İzmir Bölgesi", "IZM", "İzmir")]
            region_uuids = {}
            for cid, name, code, city in region_defs:
                _, reg = await get_or_create(Region, session, customer_id=cid, name=name)
                reg.code, reg.city = code, city
                region_uuids[f"{cid}::{name}"] = reg.id
                counts["regions"] += 1

            x_ist_rg, y_ank_rg, y_izm_rg = region_uuids[f"{x_cust_id}::İstanbul Bölgesi"], region_uuids[f"{y_cust_id}::Ankara Bölgesi"], region_uuids[f"{y_cust_id}::İzmir Bölgesi"]
            branch_defs = [
                (x_ist_rg, "X Market Şişli Şubesi", "X-SIS-001", "Şişli, İstanbul", True),
                (x_ist_rg, "X Market Kadıköy Şubesi", "X-KAD-002", "Kadıköy, İstanbul", True),
                (y_ank_rg, "Y Market Çankaya Şubesi", "Y-CAN-001", "Çankaya, Ankara", True),
                (y_izm_rg, "Y Market Karşıyaka Şubesi", "Y-KAR-001", "Karşıyaka, İzmir", False),
            ]
            branch_uuids = {}
            for rid, name, code, addr, ready in branch_defs:
                _, br = await get_or_create(Branch, session, region_id=rid, name=name)
                br.code, br.address, br.ready_for_field = code, addr, ready
                branch_uuids[f"{rid}::{name}"] = br.id
                counts["branches"] += 1

            br_sis, br_kad, br_can, br_kar = branch_uuids[f"{x_ist_rg}::X Market Şişli Şubesi"], branch_uuids[f"{x_ist_rg}::X Market Kadıköy Şubesi"], branch_uuids[f"{y_ank_rg}::Y Market Çankaya Şubesi"], branch_uuids[f"{y_izm_rg}::Y Market Karşıyaka Şubesi"]

            # ── 5-a · Depolar ve Malzemeler ─────────────────────────────────────
            # Depo ve malzeme eklemeleri daha sonra eklenebilir.
            
    return counts


async def main() -> None:
    print("Seeding database...")
    counts = await run_seed()
    print(f"Seeding complete: {counts}")

if __name__ == "__main__":
    asyncio.run(main())
