"""
backend/app/initial_data.py
───────────────────────────
Sismik Mekanik ERP — İlk Veri (Seed) Script

Amaç:
  • Veritabanı tamamen boşsa varsayılan rolleri, izinleri, test kullanıcıyı,
    müşteri/şube/proje örneklerini tek seferde ekler.
  • Production'da çalıştırmak için --confirm bayrağı GEREKLİDIR.

Kullanım (Windows PowerShell / Bash):
  cd apps/backend
  $env:DATABASE_URL="postgresql+asyncpg://..."
  python -m app.initial_data              # dry-run: sadece kontrol eder
  python -m app.initial_data --confirm    # gerçek kayıt ekler

Docker Compose ile çalıştırmak için:
  docker compose exec api python -m app.initial_data --confirm
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
)


# ── Consts ───────────────────────────────────────────────────────────────────

SEED_ADMIN_PASSWORD   = "Admin@2026!"
SEED_USERS_PASSWORD   = "User@2026!"
RUN_ENV               = "development"

ZINCIR_MARKET_ADMIN   = "admin@sismikmekanik.local"
ENGINEER_HVAC_EMAIL   = "hvac@sismikmekanik.local"
ENGINEER_FIRE_EMAIL   = "fire@sismikmekanik.local"
WAREHOUSE_MGR_EMAIL   = "depo@sismikmekanik.local"


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ── Helpers ──────────────────────────────────────────────────────────────────

async def get_or_create(model: type, session: AsyncSession, **kwargs: Any) -> tuple[bool, Any]:
    """Var olan kaydı döndür, yoksa oluştur. (created, instance) döner."""
    result = await session.execute(select(model).filter_by(**kwargs))
    instance = result.scalar_one_or_none()
    if instance:
        return False, instance
    instance = model(**kwargs)
    session.add(instance)
    return True, instance


async def link_role_permission(
    session: AsyncSession,
    role_name: str,
    permission_code: str,
) -> None:
    """Var olan Role + Permission'ı RolePermission ile birbirine bağla."""
    role_result = await session.execute(select(Role).where(Role.name == role_name))
    role = role_result.scalar_one_or_none()
    if not role:
        return
    perm_result = await session.execute(select(Permission).where(Permission.code == permission_code))
    perm = perm_result.scalar_one_or_none()
    if not perm:
        return
    existing = await session.execute(
        select(RolePermission).where(
            RolePermission.role_id == role.id,
            RolePermission.permission_id == perm.id,
        )
    )
    if existing.scalar_one_or_none():
        return
    session.add(RolePermission(role_id=role.id, permission_id=perm.id))


# ── Main Seed Logic ───────────────────────────────────────────────────────────

async def run_seed(dry_run: bool = False) -> dict[str, int]:
    """Tüm seed verilerini veritabanına ekler. dry_run ise sadece kontrol eder."""

    counts = {"roles": 0, "permissions": 0, "users": 0, "customers": 0,
              "regions": 0, "branches": 0, "projects": 0, "assignments": 0}

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
                # projects
                "projects:read":    ("PROJECTS", "Proje listeleme ve detay görme"),
                "projects:create":  ("PROJECTS", "Yeni proje oluşturma"),
                "projects:update":  ("PROJECTS", "Proje düzenleme"),
                "projects:delete":  ("PROJECTS", "Proje silme"),
                "projects:assign":  ("PROJECTS", "Projeye ekip atama"),
                # documents
                "documents:read":   ("DOCUMENTS","Çizim/doküman görüntüleme"),
                "documents:upload": ("DOCUMENTS","Doküman yükleme / güncelleme"),
                # inventory
                "inventory:read":   ("INVENTORY","Envanter listeleme"),
                "inventory:write":  ("INVENTORY","Stok giriş/çıkış / transfer"),
                "inventory:alerts": ("INVENTORY","Kritik stok uyarıları görme"),
                # finance
                "finance:read":     ("FINANCE",  "Finans ekranları görme"),
                "finance:icmal":    ("FINANCE",  "İcmal/fatura işlemleri"),
                # auth
                "users:read":       ("USERS",    "Kullanıcı listeleme"),
                "users:manage":     ("USERS",    "Kullanıcı ekleme/silme/değiştirme"),
            }
            for code, (scope, desc) in permission_defs.items():
                _, _ = await get_or_create(
                    Permission, session,
                    code=code, scope=scope, description=desc,
                )
                counts["permissions"] += 1

            # ── 3 · Rol-İzin Bağlantıları ────────────────────────────────────────
            admin_perms = list(permission_defs.keys())
            eng_perms   = [
                "projects:read", "projects:assign",
                "documents:read", "documents:upload",
                "inventory:read", "inventory:write",
            ]
            depo_perms  = [
                "inventory:read", "inventory:write", "inventory:alerts",
            ]
            cust_perms  = ["projects:read", "documents:read"]

            role_permission_map = {
                "admin":            admin_perms,
                "saha_muhendisi":   eng_perms,
                "depo_sorumlusu":   depo_perms,
                "musteri_kullanici":cust_perms,
            }
            for role_name, perms in role_permission_map.items():
                for perm_code in perms:
                    await link_role_permission(session, role_name, perm_code)
                counts["permissions"] += len(perms)

            # ── 4 · Kullanıcılar ─────────────────────────────────────────────────
            user_defs = [
                {
                    "email": ZINCIR_MARKET_ADMIN,
                    "full_name": "Sistem Yöneticisi",
                    "roles": ["admin"],
                },
                {
                    "email": ENGINEER_HVAC_EMAIL,
                    "full_name": "Ahmet Yılmaz (HVAC Mühendisi)",
                    "roles": ["saha_muhendisi"],
                    "discipline": "hvac",
                },
                {
                    "email": ENGINEER_FIRE_EMAIL,
                    "full_name": "Fatma Demir (Yangın Mühendisi)",
                    "roles": ["saha_muhendisi"],
                    "discipline": "fire",
                },
                {
                    "email": WAREHOUSE_MGR_EMAIL,
                    "full_name": "Mehmet Kaya (Depo Sorumlusu)",
                    "roles": ["depo_sorumlusu"],
                },
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

            # Kullanıcı → Rol atamaları (UserRole)
            for ud in user_defs:
                uid = user_uuids[ud["email"]]
                for role_name in ud["roles"]:
                    role_result = await session.execute(select(Role).where(Role.name == role_name))
                    role = role_result.scalar_one_or_none()
                    if not role:
                        continue
                    existing_ur = await session.execute(
                        select(UserRole).where(UserRole.user_id == uid, UserRole.role_id == role.id)
                    )
                    if not existing_ur.scalar_one_or_none():
                        session.add(UserRole(user_id=uid, role_id=role.id))
                        counts["assignments"] += 1

            # ── 5 · Müşteri + Lokasyon Hiyerarşisi ───────────────────────────────
            customer_defs = [
                {
                    "name": "X Süpermarket A.Ş.",
                    "tax_no": "1234567890",
                    "contact_email": "teknik@xsupermarket.com.tr",
                    "contact_phone": "0212 111 22 33",
                    "address": "İstanbul, Türkiye",
                },
                {
                    "name": "Y Zincir Marketler Tic. A.Ş.",
                    "tax_no": "0987654321",
                    "contact_email": "proje@ymarkets.com.tr",
                    "contact_phone": "0312 444 55 66",
                    "address": "Ankara, Türkiye",
                },
            ]
            customer_uuids: dict[str, uuid.UUID] = {}
            for cd in customer_defs:
                _, cust = await get_or_create(Customer, session, name=cd["name"])
                cust.tax_no        = cd.get("tax_no")
                cust.contact_email = cd.get("contact_email")
                cust.contact_phone = cd.get("contact_phone")
                cust.address       = cd.get("address")
                customer_uuids[cd["name"]] = cust.id
                counts["customers"] += 1

            x_cust_id = customer_uuids["X Süpermarket A.Ş."]
            y_cust_id = customer_uuids["Y Zincir Marketler Tic. A.Ş."]

            # Bölgeler
            region_defs = [
                (x_cust_id, "İstanbul Bölgesi",     "IST", "İstanbul"),
                (y_cust_id, "Ankara Bölgesi",       "ANK", "Ankara"),
                (y_cust_id, "İzmir Bölgesi",        "IZM", "İzmir"),
            ]
            region_uuids: dict[str, uuid.UUID] = {}
            for cid, name, code, city in region_defs:
                key = f"{cid}::{name}"
                _, reg = await get_or_create(Region, session, customer_id=cid, name=name)
                reg.code = code
                reg.city = city
                region_uuids[key] = reg.id
                counts["regions"] += 1

            x_ist_key = f"{x_cust_id}::İstanbul Bölgesi"
            y_ank_key = f"{y_cust_id}::Ankara Bölgesi"
            y_izm_key = f"{y_cust_id}::İzmir Bölgesi"
            x_ist_rg = region_uuids[x_ist_key]
            y_ank_rg = region_uuids[y_ank_key]
            y_izm_rg = region_uuids[y_izm_key]

            # Şubeler
            branch_defs = [
                (x_ist_rg, "X Market Şişli Şubesi",    "X-SIS-001", "Şişli, İstanbul",     True),
                (x_ist_rg, "X Market Kadıköy Şubesi",  "X-KAD-002", "Kadıköy, İstanbul",   True),
                (y_ank_rg, "Y Market Çankaya Şubesi",  "Y-CAN-001", "Çankaya, Ankara",     True),
                (y_izm_rg, "Y Market Karşıyaka Şubesi","Y-KAR-001", "Karşıyaka, İzmir",    False),
            ]
            branch_uuids: dict[str, uuid.UUID] = {}
            for rid, name, code, addr, ready in branch_defs:
                key = f"{rid}::{name}"
                _, br = await get_or_create(Branch, session, region_id=rid, name=name)
                br.code           = code
                br.address        = addr
                br.ready_for_field = ready
                branch_uuids[key] = br.id
                counts["branches"] += 1

            br_sis = branch_uuids[f"{x_ist_rg}::X Market Şişli Şubesi"]
            br_kad = branch_uuids[f"{x_ist_rg}::X Market Kadıköy Şubesi"]
            br_can = branch_uuids[f"{y_ank_rg}::Y Market Çankaya Şubesi"]
            br_kar = branch_uuids[f"{y_izm_rg}::Y Market Karşıyaka Şubesi"]

            # Projeler
            admin_uuid     = user_uuids[ZINCIR_MARKET_ADMIN]
            eng_hvac_uuid  = user_uuids[ENGINEER_HVAC_EMAIL]
            eng_fire_uuid  = user_uuids[ENGINEER_FIRE_EMAIL]

            now = utc_now()
            project_defs = [
                {
                    "customer_id":    x_cust_id,
                    "branch_id":      br_sis,
                    "region_id":      x_ist_rg,
                    "name":           "X Şişli HVAC Yenileme Projesi",
                    "project_no":     "X-HVAC-2026-001",
                    "status":         "in_progress",
                    "contract_value": 1_500_000.0,
                    "start_date":     now,
                    "due_date":       datetime(2026, 9, 30),
                    "scope_codes":    ["hvac"],
                    "created_by":     admin_uuid,
                },
                {
                    "customer_id":    x_cust_id,
                    "branch_id":      br_kad,
                    "region_id":      x_ist_rg,
                    "name":           "X Kadıköy HVAC + Sismik projesi",
                    "project_no":     "X-HVAC-2026-003",
                    "status":         "approved",
                    "contract_value": 2_200_000.0,
                    "start_date":     datetime(2026, 7, 1),
                    "due_date":       datetime(2026, 12, 31),
                    "scope_codes":    ["hvac", "seismic"],
                    "created_by":     admin_uuid,
                },
                {
                    "customer_id":    y_cust_id,
                    "branch_id":      br_can,
                    "region_id":      y_ank_rg,
                    "name":           "Y Çankaya Yangın Söndürme Sistemi",
                    "project_no":     "Y-FIRE-2026-002",
                    "status":         "inquiry",
                    "contract_value": 950_000.0,
                    "start_date":     None,
                    "due_date":       None,
                    "scope_codes":    ["fire"],
                    "created_by":     admin_uuid,
                },
            ]
            project_uuids: dict[str, uuid.UUID] = {}
            for pd in project_defs:
                _, proj = await get_or_create(Project, session, name=pd["name"])
                proj.customer_id    = pd["customer_id"]
                proj.branch_id      = pd["branch_id"]
                proj.region_id      = pd["region_id"]
                proj.project_no     = pd["project_no"]
                proj.status         = pd["status"]
                proj.contract_value = pd["contract_value"]
                proj.start_date     = pd.get("start_date")
                proj.due_date       = pd.get("due_date")
                proj.scope_codes    = str(pd["scope_codes"])
                proj.created_by     = pd["created_by"]
                project_uuids[pd["name"]] = proj.id
                counts["projects"] += 1

            proj_sis = project_uuids["X Şişli HVAC Yenileme Projesi"]
            proj_kad = project_uuids["X Kadıköy HVAC + Sismik projesi"]
            proj_can = project_uuids["Y Çankaya Yangın Söndürme Sistemi"]

            # ── 6 · Proje Atamaları ──────────────────────────────────────────────
            assignment_defs = [
                (proj_sis, eng_hvac_uuid, "saha_muhendisi", True),
                (proj_sis, eng_fire_uuid, "taseron",        False),
                (proj_kad, eng_hvac_uuid, "saha_muhendisi", True),
                (proj_can, eng_fire_uuid, "saha_muhendisi", True),
            ]
            for proj_id, uid, role, is_lead in assignment_defs:
                _, _ = await get_or_create(
                    ProjectAssignment, session,
                    project_id=proj_id,
                    user_id=uid,
                    role_at_project=role,
                    is_lead=is_lead,
                )
                counts["assignments"] += 1

            # ── 7 · Örnek Fatura (İcmal) ─────────────────────────────────────────
            now_str = utc_now().strftime("%Y%m")
            _, inv = await get_or_create(
                Invoice, session,
                invoice_no=f"INV-{now_str}-001",
            )
            inv.customer_id  = x_cust_id
            inv.project_id   = proj_sis
            inv.title        = "X Şişli ATM Projesi — Nisan 2026 İcmalı"
            inv.issue_date   = datetime(2026, 4, 30)
            inv.subtotal     = 450_000.0
            inv.tax_rate     = 20.0
            inv.tax_amount   = 90_000.0
            inv.grand_total  = 540_000.0
            inv.status       = "approved"
            inv.paid_amount  = 0.0

            now_izm = utc_now().strftime("%Y%m")
            _, inv2 = await get_or_create(
                Invoice, session,
                invoice_no=f"INV-{now_izm}-001",
            )
            inv2.customer_id = y_cust_id
            inv2.project_id  = proj_can
            inv2.title       = "Y Çankaya Yangın Projesi — Nisan 2026 İcmalı"
            inv2.issue_date  = datetime(2026, 4, 30)
            inv2.subtotal    = 180_000.0
            inv2.tax_rate    = 20.0
            inv2.tax_amount  = 36_000.0
            inv2.grand_total = 216_000.0
            inv2.status      = "sent"

    print("\n─── Seed tamamlandı ────────────────────")
    for k, v in counts.items():
        print(f"  {k:<18} → {v} kayıt eklendi")
    print(f"  {'───':>20}")
    print(f"  {'Toplam':<18} → {sum(counts.values())} kayıt")
    print("────────────────────────────────────────\n")

    return counts


# ── CLI Entry Point ────────────────────────────────────────────────────────────

async def main() -> None:
    parser = argparse.ArgumentParser(description="Sismik Mekanik ERP — İlk Veri Oluşturucu")
    parser.add_argument(
        "--confirm",
        action="store_true",
        default=False,
        help="Gerçek veritabanına kayıt ekle (olmazsa dry-run modunda çalışır).",
    )
    args = parser.parse_args()

    if not args.confirm:
        print("⚠  Dry-run modu: kayıt eklenmeyecek. Gerçek eklemek için --confirm kullanın.")
    else:
        print("✔  Veritabanına kayıt ekleme modu aktif.")

    try:
        counts = await run_seed(dry_run=not args.confirm)
        print(f"\nSeed tamamlandı: {sum(counts.values())} kayıt işlendi.")
    except Exception as exc:
        print(f"\n❌ Hata: {exc}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
