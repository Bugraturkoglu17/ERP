"""
Sismik Mekanik ERP — SQLModel Veritabanı Modelleri
Teknoloji: SQLModel (SQLAlchemy 2.0 + Pydantic v2)
"""

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import List, Optional, Literal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    func,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import mapped_column, relationship, Mapped
from sqlmodel import SQLModel, Field, Relationship


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ═══════════════════════════════════════════════════════════════════════════════
#  1 · ENUMS  (DB'de look-up tablosu, Python'da Enum olarak taşımlanır)
# ═══════════════════════════════════════════════════════════════════════════════

class ProjectStatus(str, Enum):
    INQUIRY      = "inquiry"        # Keşif Aşamasında
    OFFER_SENT   = "offer_sent"     # Teklif Verildi
    APPROVED     = "approved"       # Onaylandı
    IN_PROGRESS  = "in_progress"    # Sahada
    INVOICE_PEND = "invoice_pend"   # Hakediş Bekliyor
    COMPLETED    = "completed"      # Teslim Edildi
    CANCELLED    = "cancelled"      # İptal


class WorkScope(str, Enum):
    HVAC        = "hvac"         # İklimlendirme / Havalandırma
    FIRE        = "fire"         # Yangın Söndürme
    SEISMIC     = "seismic"      # Sismik Koruma
    MECHANICAL  = "mechanical"   # Mekanik Tesisat
    ELECTRICAL  = "electrical"   # Elektrik Tesisatı


class WarehouseType(str, Enum):
    """Depo türü."""
    MAIN      = "main"       # Merkez Depo
    SITE      = "site"       # Şantiye / Proje Deposu


class StockMovementType(str, Enum):
    IN         = "in"          # Alış / depo girişi
    OUT        = "out"         # Proje çıkışı / kullanım
    TRANSFER   = "transfer"    # Depo-transferi
    RETURN     = "return"      # İade
    ADJUSTMENT = "adjustment"  # Düzeltme kaydı


class InvoiceStatus(str, Enum):
    DRAFT       = "draft"
    SENT        = "sent"
    APPROVED    = "approved"
    PAID        = "paid"
    OVERDUE     = "overdue"
    CANCELLED   = "cancelled"


class ExpenseCategory(str, Enum):
    LABOUR          = "labour"        # Adam-saat / taşeron ücreti
    MATERIAL        = "material"      # Malzeme maliyeti
    TRANSPORT       = "transport"     # Nakliye
    EQUIPMENT       = "equipment"     # Kiralama
    MISCELLANEOUS   = "miscellaneous" # Diğer


# ═══════════════════════════════════════════════════════════════════════════════
#  2 · RBAC  —  Kullanıcılar, Roller, İzinler
# ═══════════════════════════════════════════════════════════════════════════════

class Role(SQLModel, table=True):
    """
    Sistem genelinde rol tanımları.
    Örnek: admin, saha_muhendisi, depo_sorumlusu, musteri_kullanici
    """

    __tablename__ = "roles"

    id:           UUID         = Field(default_factory=uuid4, primary_key=True)
    name:         str          = Field(max_length=80, unique=True, index=True)
    display_name: str          = Field(max_length=120)
    description:  Optional[str] = Field(default=None, max_length=255)
    is_active:    bool         = Field(default=True)
    created_at:   datetime     = Field(
        default_factory=utc_now, nullable=False
    )

    # Back-reference
    permissions: List["RolePermission"] = Relationship(back_populates="role")
    users:      List["UserRole"]        = Relationship(back_populates="role")


class Permission(SQLModel, table=True):
    """
    Tek tek izin kayıtları. Bir rol birden fazla izine sahip olabilir.
    resource  →  modül adı (projects / inventory / finance …)
    action    →  eylem     (create / read / update / delete / export …)
    """

    __tablename__ = "permissions"

    id:         UUID      = Field(default_factory=uuid4, primary_key=True)
    code:       str       = Field(max_length=100, unique=True, index=True)
    # Erişim maliyeti: yüksek = ciddi izin
    scope:      str       = Field(max_length=30, index=True)
    description: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime  = Field(
        default_factory=utc_now, nullable=False
    )

    roles: List["RolePermission"] = Relationship(back_populates="permission")


class RolePermission(SQLModel, table=True):
    """Rol ↔ İzin  many-to-many bağlantı tablosu."""

    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_id", "permission_id"),)

    role_id:       UUID = Field(foreign_key="roles.id", primary_key=True)
    permission_id: UUID = Field(foreign_key="permissions.id", primary_key=True)

    role:       Role       = Relationship(back_populates="permissions")
    permission: Permission = Relationship(back_populates="roles")


class UserRole(SQLModel, table=True):
    """Kullanıcı ↔ Rol  many-to-many (bir kullanıcı birden fazla rol alabilir)."""

    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id"),)

    user_id: UUID = Field(foreign_key="users.id", primary_key=True)
    role_id: UUID = Field(foreign_key="roles.id", primary_key=True)

    user: Mapped["User"] = Relationship(back_populates="user_roles")
    role: Mapped["Role"] = Relationship(back_populates="users")


class User(SQLModel, table=True):
    """Sistem kullanıcısı — Yetkilendirme merkezi."""

    __tablename__ = "users"

    id:                UUID          = Field(default_factory=uuid4, primary_key=True)
    email:             str           = Field(max_length=255, unique=True, index=True)
    hashed_password:   str
    full_name:         str           = Field(max_length=200)
    phone:             Optional[str] = Field(default=None, max_length=30)
    # Varsayılan rol — kişisel yetki için genişletilebilir
    default_role:      str           = Field(max_length=80, index=True)
    # Tek disiplin bağlantısı: HVAC / FIRE / SEISMIC / ELECTRICAL / MECHANICAL
    discipline:        Optional[str] = Field(default=None, max_length=50, index=True)
    # Disiplin içi özel yetki (sadece kendi branşın dökümanları mı görsün? 1 = Evet)
    discipline_only:   bool          = Field(default=False)
    is_active:         bool          = Field(default=True)
    is_verified:       bool          = Field(default=False)
    last_login_at:     Optional[datetime] = None
    created_at:        datetime      = Field(
        default_factory=utc_now, nullable=False
    )
    updated_at:        datetime      = Field(
        default_factory=utc_now,
        sa_column_kwargs={"onupdate": utc_now},
    )

    user_roles:    List["UserRole"]       = Relationship(back_populates="user")
    assignments:   List["ProjectAssignment"] = Relationship(back_populates="user")
    authored_reports: List["FieldReport"] = Relationship(
        back_populates="author",
        sa_relationship_kwargs={"foreign_keys": "[FieldReport.author_id]"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  3 · MÜŞTERİ / LOKASYON HİYERARŞİSİ
# ═══════════════════════════════════════════════════════════════════════════════

class Customer(SQLModel, table=True):
    """
    Zincir market / müşteri firma bilgisi.
    Örnek: X Süpermarket A.Ş.
    """

    __tablename__ = "customers"

    id:            UUID          = Field(default_factory=uuid4, primary_key=True)
    name:          str           = Field(max_length=200, index=True)
    tax_no:        Optional[str] = Field(default=None, max_length=30)  # Vergi no
    contact_email: Optional[str] = Field(default=None, max_length=255)
    contact_phone: Optional[str] = Field(default=None, max_length=30)
    address:       Optional[str] = Field(default=None, max_length=500)
    is_active:     bool          = Field(default=True)
    created_at:    datetime      = Field(
        default_factory=utc_now, nullable=False
    )

    regions:  List["Region"]          = Relationship(back_populates="customer")
    projects: List["Project"]         = Relationship(back_populates="customer")
    invoices: List["Invoice"]         = Relationship(back_populates="customer")


class Region(SQLModel, table=True):
    """Bölge (ör. İstanbul Bölgesi). Bir bölge birden fazla müşteriye ait OLMAMALI.
    → customer_id NULL KAHRAMAN olabilir, çünkü bölge müşteriye özel değildir.
    Burada tercihen her bölge bir müşteriye bağlı kabul edilir."""

    __tablename__ = "regions"

    id:          UUID          = Field(default_factory=uuid4, primary_key=True)
    customer_id: UUID          = Field(foreign_key="customers.id", index=True)
    name:        str           = Field(max_length=100, index=True)
    code:        Optional[str] = Field(default=None, max_length=20, index=True)
    city:        str           = Field(max_length=100)
    created_at:  datetime      = Field(
        default_factory=utc_now, nullable=False
    )

    customer:  Mapped["Customer"] = Relationship(back_populates="regions")
    branches:  List["Branch"]     = Relationship(back_populates="region")
    projects:  List["Project"]    = Relationship(back_populates="region")


class Branch(SQLModel, table=True):
    """Şube / lokasyon — proje açılacak en düşük hiyerarşi birimi.
    Örnek: X Süpermarket, Ankara Cankaya Şubesi"""

    __tablename__ = "branches"

    id:          UUID          = Field(default_factory=uuid4, primary_key=True)
    region_id:   UUID          = Field(foreign_key="regions.id", index=True)
    name:        str           = Field(max_length=200, index=True)
    code:        Optional[str] = Field(default=None, max_length=30, index=True)
    address:     Optional[str] = Field(default=None, max_length=500)
    latitude:    Optional[float] = Field(default=None)
    longitude:   Optional[float] = Field(default=None)
    # Saha çalışmasına hazır mı?
    ready_for_field: bool = Field(default=False)
    created_at:  datetime      = Field(
        default_factory=utc_now, nullable=False
    )

    region:  Mapped["Region"]      = Relationship(back_populates="branches")
    projects: List["Project"]      = Relationship(back_populates="branch")


# ═══════════════════════════════════════════════════════════════════════════════
#  4 · PROJE MODÜLÜ
# ═══════════════════════════════════════════════════════════════════════════════

class Project(SQLModel, table=True):
    """
    Tek bir şantiye projesi.
    Hiyerarşi: Customer → Region → Branch → Project
    """

    __tablename__ = "projects"

    id:          UUID        = Field(default_factory=uuid4, primary_key=True)
    # ── Hiyerarşi ──────────────────────────────────────────
    customer_id: UUID       = Field(foreign_key="customers.id", index=True)
    region_id:   UUID       = Field(foreign_key="regions.id", index=True)
    branch_id:   UUID       = Field(foreign_key="branches.id", index=True)
    # ── Temel bilgiler ─────────────────────────────────────
    name:        str        = Field(max_length=255, index=True)
    project_no:  Optional[str] = Field(default=None, max_length=80, index=True)
    description: Optional[str] = Field(default=None)
    # ── Zamanlama ──────────────────────────────────────────
    start_date:  Optional[datetime] = None
    due_date:    Optional[datetime] = None
    # ── İş Kapsamı ─────────────────────────────────────────
    scope_codes: str        = Field(
        default="[]",
        description="JSON array ['hvac','fire','seismic']",
    )
    # ── Statü ──────────────────────────────────────────────
    status:      ProjectStatus = Field(
        default=ProjectStatus.INQUIRY, index=True
    )
    # ── Finans ─────────────────────────────────────────────
    contract_value: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    # ── Audit ──────────────────────────────────────────────
    created_by:  Optional[UUID] = Field(foreign_key="users.id", default=None)
    created_at:  datetime       = Field(
        default_factory=utc_now, nullable=False
    )
    updated_at:  datetime       = Field(
        default_factory=utc_now,
        sa_column_kwargs={"onupdate": utc_now},
    )

    customer:    Mapped["Customer"]           = Relationship(back_populates="projects")
    region:     Mapped["Region"]             = Relationship(back_populates="projects")
    branch:     Mapped["Branch"]             = Relationship(back_populates="projects")
    assignments: List["ProjectAssignment"]   = Relationship(back_populates="project")
    documents:   List["Document"]            = Relationship(back_populates="project")
    warehouse:   Optional["Warehouse"]       = Relationship(back_populates="project")
    reports:     List["FieldReport"]         = Relationship(back_populates="project")
    expenses:    List["Expense"]             = Relationship(back_populates="project")
    invoices:    List["Invoice"]             = Relationship(back_populates="project")


class ProjectAssignment(SQLModel, table=True):
    """Proje → Kullanıcı (saha mühendisi / taşeron) ataması."""

    __tablename__ = "project_assignments"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", "role_at_project"),
    )

    id:              UUID   = Field(default_factory=uuid4, primary_key=True)
    project_id:      UUID   = Field(foreign_key="projects.id", index=True)
    user_id:         UUID   = Field(foreign_key="users.id", index=True)
    # Roler: saha_muhendisi, taseron, musteri_temsilcisi …
    role_at_project: str   = Field(max_length=80)
    is_lead:         bool   = Field(default=False)   # Ekip başı mı?
    assigned_at:     datetime = Field(
        default_factory=utc_now, nullable=False
    )
    unassigned_at:   Optional[datetime] = None

    project: Mapped["Project"] = Relationship(back_populates="assignments")
    user:    Mapped["User"]    = Relationship(back_populates="assignments")


# ═══════════════════════════════════════════════════════════════════════════════
#  5 · DOKÜMAN / ÇİZİM YÖNETİMİ
# ═══════════════════════════════════════════════════════════════════════════════

DOC_TYPE_ENUM: list[str] = [
    "contract",      # Sözleşme
    "drawing_hvac",  # Havalandırma çizimi
    "drawing_fire",  # Yangın çizimi
    "drawing_seismic",# Sismik
    "drawing_mep",   # Genel MEP
    "invoice_doc",   # Hakediş dosyası
    "field_report",  # Saha raporu
    "photo",         # Saha fotoğrafı
    "revision",      # Revizyon
    "other",         # Diğer
]

class Document(SQLModel, table=True):
    """Bulut depolamadaki (OCI Object Storage) tüm dosya kayıtları."""

    __tablename__ = "documents"

    id:              UUID   = Field(default_factory=uuid4, primary_key=True)
    project_id:      UUID   = Field(foreign_key="projects.id", index=True)
    # Dosya türü — DOC_TYPE_ENUM
    doc_type:        str    = Field(max_length=50, index=True)
    original_name:   str    = Field(max_length=255)
    file_key:        str    = Field(max_length=512, unique=True)  # S3 / OCI path
    bucket_name:     str    = Field(max_length=128)
    file_size_bytes: Optional[int] = None
    mime_type:       Optional[str] = Field(default=None, max_length=128)
    # ── Versiyon kontrolü ──────────────────────────────────
    version:         int    = Field(default=1)
    revision_note:   Optional[str] = Field(default=None, max_length=255)
    # ── Kalıcı eski versiyonlar ─────────────────────────────
    archived:        bool   = Field(default=False)
    # ── Yükleyen ───────────────────────────────────────────
    uploaded_by:     Optional[UUID] = Field(foreign_key="users.id", default=None)
    created_at:      datetime       = Field(
        default_factory=utc_now, nullable=False
    )

    project:   Mapped["Project"] = Relationship(back_populates="documents")


# ═══════════════════════════════════════════════════════════════════════════════
#  6 · ENVANTER VE DEPO
# ═══════════════════════════════════════════════════════════════════════════════

# ── 6-a · Depo ─────────────────────────────────────────────────────────────────

class Warehouse(SQLModel, table=True):
    """
    Depo kaydı.
    type == MAIN  → project_id NULL  (merkez depo, tüm şantiyelere malzeme çıkışı)
    type == SITE  → project_id dolu (ilgili projeye özel şantiye deposu)
    """

    __tablename__ = "warehouses"
    __table_args__ = (
        UniqueConstraint("code", name="uq_warehouse_code"),
    )

    id:           UUID              = Field(default_factory=uuid4, primary_key=True)
    type:         WarehouseType     = Field(index=True)
    name:         str               = Field(max_length=200, index=True)
    code:         Optional[str]     = Field(default=None, max_length=30, index=True)
    location:     Optional[str]     = Field(default=None, max_length=255)
    # İlgili proje (SITE tipindeyse dolu, MAIN ise NULL)
    project_id:   Optional[UUID]    = Field(foreign_key="projects.id", default=None, index=True)
    is_active:    bool              = Field(default=True)
    created_at:   datetime          = Field(
        default_factory=utc_now, nullable=False
    )

    # ── Back-references ───────────────────────────────────────────────────────
    project:          Mapped[Optional["Project"]]    = Relationship(back_populates="warehouse")
    stock_levels:     List["Stock"]                  = Relationship(back_populates="warehouse")
    transactions_out: List["InventoryTransaction"]   = Relationship(
        back_populates="from_warehouse",
        sa_relationship_kwargs={"foreign_keys": "[InventoryTransaction.from_warehouse_id]"},
    )
    transactions_in:  List["InventoryTransaction"]   = Relationship(
        back_populates="to_warehouse",
        sa_relationship_kwargs={"foreign_keys": "[InventoryTransaction.to_warehouse_id]"},
    )


# ── 6-b · Düşük Stok Uyarısı ───────────────────────────────────────────────────

class LowStockAlert(SQLModel, table=True):
    """Kritik stok altına düşen malzemeler için otomatik uyarı kaydı."""

    __tablename__ = "low_stock_alerts"

    id:            UUID         = Field(default_factory=uuid4, primary_key=True)
    item_id:       UUID         = Field(foreign_key="materials.id", index=True)
    current_stock: int          = Field(ge=0)
    min_level:     int          = Field(ge=0)
    notified:      bool         = Field(default=False)
    created_at:    datetime     = Field(
        default_factory=utc_now, nullable=False
    )


# ── 6-c · Malzeme Kataloğu ─────────────────────────────────────────────────────

class Material(SQLModel, table=True):
    """
    Şirketin kullandığı malzeme / ekipman ana kataloğu.
    Örnek: Sismik Askı Aparatı, Çelik Boru DN100, Yangın Vanası.
    """

    __tablename__ = "materials"

    id:              UUID            = Field(default_factory=uuid4, primary_key=True)
    # Üretici / tedarikçi stok kodu
    sku:             str             = Field(max_length=100, unique=True, index=True)
    name:            str             = Field(max_length=255, index=True)
    description:     Optional[str]   = Field(default=None, max_length=1000)
    # Birim: adet, kg, metre, litre, set …
    unit:            str             = Field(max_length=20, default="adet")
    # Barkod (opsiyonel)
    barcode:         Optional[str]   = Field(default=None, max_length=128)
    # Birim alış maliyeti (TL) — proje karlılık hesaplaması için
    unit_cost:       Optional[Decimal] = Field(default=None, max_digits=12, decimal_places=2)
    # Kritik stok eşiği — bu miktarın altına düşünce otomatik uyarı tetiklenir
    min_stock_level: int             = Field(default=0, ge=0)
    is_active:       bool            = Field(default=True, index=True)
    created_at:      datetime        = Field(
        default_factory=utc_now, nullable=False, index=True
    )

    # ── Back-references ───────────────────────────────────────────────────────
    stock_levels:  List["Stock"]                  = Relationship(back_populates="material")
    transactions:  List["InventoryTransaction"]    = Relationship(back_populates="material")


# ── 6-b · Depo × Malzeme Stok Durumu ─────────────────────────────────────────

class Stock(SQLModel, table=True):
    """
    Junction (ara) tablo: her (depo, malzeme) çifti için BİR stok kaydı.
    Anlık stok durumu her zaman buradan okunur; doğrudan değiştirilmez —
    tüm güncellemeler InventoryTransaction üzerinden yapılır.

    Composite Primary Key: (warehouse_id, material_id)
    """

    __tablename__ = "stock"
    __table_args__ = (
        UniqueConstraint("warehouse_id", "material_id", name="uq_stock_wh_mat"),
    )

    warehouse_id:  UUID        = Field(foreign_key="warehouses.id", primary_key=True)
    material_id:   UUID        = Field(foreign_key="materials.id", primary_key=True)
    # Anlık miktar (negatif olamaz)
    quantity:      int         = Field(default=0, ge=0)
    # Son güncelleyen (NULL = otomatik / seed)
    updated_by:    Optional[UUID] = Field(foreign_key="users.id", default=None)
    updated_at:    datetime    = Field(
        default_factory=utc_now,
        sa_column_kwargs={"onupdate": utc_now},
        nullable=False,
    )

    # ── Back-references ───────────────────────────────────────────────────────
    warehouse: Mapped["Warehouse"] = Relationship(back_populates="stock_levels")
    material:  Mapped["Material"]  = Relationship(back_populates="stock_levels")


# ── 6-c · Stok Hareketi / Transfer Fişi ─────────────────────────────────────

class InventoryTransactionType(str, Enum):
    """Stok hareketi türü — DB'de TEXT olarak saklanır."""
    IN         = "in"          # Alış / depo girişi (tedarikçiden gelen mal)
    OUT        = "out"         # Çıkış / projeye gönderim / kullanım
    TRANSFER   = "transfer"    # Depo-transferi  (merkez → şantiye vb.)
    RETURN     = "return"      # İade (şantiyeden merkeze geri dönen mal)
    ADJUSTMENT = "adjustment"  # Sayım düzeltmesi (fire/missing kaydedildi)


class InventoryTransaction(SQLModel, table=True):
    """
    Tüm stok işlemlerinin kaydedildiği kalıcı hareket/denetim tablosu.
    Ir=saliye numarası, maliyet ve notlar ile muhasebeleştirilebilir.

    Hareket türüne göre FK alanları:
      IN         → from_warehouse_id NULL,  to_warehouse_id dolu
      OUT        → from_warehouse_id dolu,  to_warehouse_id NULL
      TRANSFER   → from_warehouse_id dolu,  to_warehouse_id dolu
    """

    __tablename__ = "inventory_transactions"

    id:               UUID                  = Field(default_factory=uuid4, primary_key=True)
    # Malzeme
    material_id:      UUID                  = Field(foreign_key="materials.id", index=True)
    # Kaynak depo (çıkış yapan)
    from_warehouse_id: Optional[UUID]       = Field(foreign_key="warehouses.id", default=None, index=True)
    # Hedef depo (giriş yapan)
    to_warehouse_id:   Optional[UUID]       = Field(foreign_key="warehouses.id", default=None, index=True)
    # İlgili proje (TRANSFER / OUT işlemlerinde)
    related_project_id: Optional[UUID]      = Field(foreign_key="projects.id", default=None, index=True)
    # Miktar
    quantity:         int                   = Field(gt=0)
    # Birim maliyet — tüketim maliyetini kaydetmek için
    unit_cost:        Optional[Decimal]     = Field(default=None, max_digits=12, decimal_places=2)
    # Toplam maliyet (quantity × unit_cost)
    total_cost:       Optional[Decimal]     = Field(default=None, max_digits=14, decimal_places=2)
    # Hareket türü (IN / OUT / TRANSFER / RETURN / ADJUSTMENT)
    transaction_type: InventoryTransactionType = Field(index=True)
    # İrsaliye / fiş no
    reference_no:     Optional[str]         = Field(default=None, max_length=100, index=True)
    # Notlar (fire, revizyon, neden vb.)
    notes:            Optional[str]         = Field(default=None, max_length=500)
    # İşlemi yapan kullanıcı
    performed_by:     Optional[UUID]        = Field(foreign_key="users.id", default=None)
    performed_at:     datetime              = Field(
        default_factory=utc_now, nullable=False, index=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    material:         Mapped["Material"]    = Relationship(back_populates="transactions")
    from_warehouse:   Mapped[Optional[Warehouse]] = Relationship(
        back_populates="transactions_out",
        sa_relationship_kwargs={"foreign_keys": "[InventoryTransaction.from_warehouse_id]"},
    )
    to_warehouse:     Mapped[Optional[Warehouse]] = Relationship(
        back_populates="transactions_in",
        sa_relationship_kwargs={"foreign_keys": "[InventoryTransaction.to_warehouse_id]"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  7 · SAHA RAPORU
# ═══════════════════════════════════════════════════════════════════════════════

class FieldReport(SQLModel, table=True):
    """Günlük / haftalık saha raporu."""

    __tablename__ = "field_reports"

    id:              UUID         = Field(default_factory=uuid4, primary_key=True)
    project_id:      UUID         = Field(foreign_key="projects.id", index=True)
    author_id:       UUID         = Field(foreign_key="users.id", index=True)
    report_date:     datetime     = Field(index=True)
    summary:         Optional[str] = Field(default=None, max_length=1000)
    weather:         Optional[str] = Field(default=None, max_length=50)
    # Çalışan ekip sayısı / saat
    team_size:       Optional[int] = None
    hours_worked:    Optional[float] = None
    # Görseller / ek dosyalar (JSON array of S3 keys)
    attachment_keys: str          = Field(default="[]")
    # Onay durumu
    submitted:       bool          = Field(default=False)
    approved_by:     Optional[UUID] = Field(foreign_key="users.id", default=None)
    approved_at:     Optional[datetime] = None
    created_at:      datetime      = Field(
        default_factory=utc_now, nullable=False
    )

    project: Mapped["Project"] = Relationship(back_populates="reports")
    author:  Mapped["User"]    = Relationship(
        back_populates="authored_reports",
        sa_relationship_kwargs={"foreign_keys": "[FieldReport.author_id]"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  8 · FİNANS, İCMAL VE HAKEDİŞ
# ═══════════════════════════════════════════════════════════════════════════════

class Expense(SQLModel, table=True):
    """
    Projeye ait tüm harcamalar.
    - Labour  : adam-saat / taşeron ücreti
    - Material: depodan çıkış (stok hareketi idsi ile ilişkili)
    - Diğer   : nakliye, kiralama, dış hizmet
    """

    __tablename__ = "expenses"

    id:               UUID              = Field(default_factory=uuid4, primary_key=True)
    project_id:       UUID              = Field(foreign_key="projects.id", index=True)
    category:         ExpenseCategory   = Field(index=True)
    description:      str               = Field(max_length=255)
    amount:           Decimal           = Field(max_digits=14, decimal_places=2)
    quantity:         Optional[float]   = None
    # İlgili stok hareketi (malzeme harcamalarında)
    stock_movement_id:Optional[UUID]    = Field(foreign_key="inventory_transactions.id", default=None)
    # İlgili personel / taşeron
    user_id:          Optional[UUID]    = Field(foreign_key="users.id", default=None)
    # Harcama tarihi
    expense_date:     datetime          = Field(index=True)
    created_by:       Optional[UUID]    = Field(foreign_key="users.id", default=None)
    created_at:       datetime          = Field(
        default_factory=utc_now, nullable=False
    )

    project: Mapped["Project"] = Relationship(back_populates="expenses")


class InvoiceItem(SQLModel, table=True):
    """Hakediş / fatura kalemi — bir icmaldaki maddeler."""

    __tablename__ = "invoice_items"

    id:              UUID         = Field(default_factory=uuid4, primary_key=True)
    invoice_id:      UUID         = Field(foreign_key="invoices.id", index=True)
    description:     str          = Field(max_length=255)
    quantity:        Decimal      = Field(max_digits=10, decimal_places=2)
    unit_price:      Decimal      = Field(max_digits=12, decimal_places=2)
    total_amount:    Decimal      = Field(max_digits=14, decimal_places=2)
    sort_order:      int          = Field(default=0)

    invoice: Mapped["Invoice"] = Relationship(back_populates="items")


class Invoice(SQLModel, table=True):
    """
    Müşteriden kesilen fatura / hakediş belgesi.
    Tek bir fatura birden fazla projeden kalemler içerebilir;
    ya da tek proje → tek fatura (yukarıdada modellenir).
    """

    __tablename__ = "invoices"

    id:                UUID            = Field(default_factory=uuid4, primary_key=True)
    # Üçlü eşleştirme: hangi müşteri, hangi bölge / şubedeki projeler?
    customer_id:       UUID            = Field(foreign_key="customers.id", index=True)
    region_id:         Optional[UUID]  = Field(foreign_key="regions.id", default=None, index=True)
    branch_id:         Optional[UUID]  = Field(foreign_key="branches.id", default=None, index=True)
    # Not: proje seviyesinde fatura için project_id eklenir
    project_id:        Optional[UUID]  = Field(foreign_key="projects.id", default=None, index=True)
    # ── Fatura bilgileri ───────────────────────────────────
    invoice_no:        str             = Field(max_length=100, unique=True, index=True)
    title:             str             = Field(max_length=255)
    issue_date:        datetime        = Field(index=True)
    due_date:          Optional[datetime] = Field(default=None, index=True)
    # ── Tutarlar ───────────────────────────────────────────
    subtotal:          Decimal         = Field(max_digits=14, decimal_places=2)
    tax_rate:          Decimal         = Field(max_digits=5, decimal_places=2, default=0)
    tax_amount:        Decimal         = Field(max_digits=14, decimal_places=2, default=0)
    grand_total:       Decimal         = Field(max_digits=14, decimal_places=2)
    # ── Statü ──────────────────────────────────────────────
    status:            InvoiceStatus   = Field(default=InvoiceStatus.DRAFT, index=True)
    # ── Ödeme takibi ────────────────────────────────────────
    paid_amount:       Decimal         = Field(max_digits=14, decimal_places=2, default=0)
    paid_at:           Optional[datetime] = None
    # ── İçerik ─────────────────────────────────────────────
    items:             List["InvoiceItem"] = Relationship(back_populates="invoice")
    # ── Relations ──────────────────────────────────────────
    customer:          Mapped["Customer"] = Relationship(back_populates="invoices")
    project:           Mapped["Project"]  = Relationship(back_populates="invoices")


class Payment(SQLModel, table=True):
    """Tahsilat / tedarikçi ödemesi — fatura ile veya doğrudan."""

    __tablename__ = "payments"

    id:                UUID         = Field(default_factory=uuid4, primary_key=True)
    invoice_id:        Optional[UUID] = Field(foreign_key="invoices.id", default=None, index=True)
    # Ödeme yönü: alacak = müşteriden tahsilat, borç = tedarikçi ödemesi
    direction:         str          = Field(max_length=20, index=True)   # incoming / outgoing
    amount:            Decimal      = Field(max_digits=14, decimal_places=2)
    payment_method:    str          = Field(max_length=50)               # havale / eft / nakit …
    reference_no:      Optional[str] = Field(default=None, max_length=100)
    payment_date:      datetime     = Field(index=True)
    notes:             Optional[str] = Field(default=None, max_length=500)
    recorded_by:       Optional[UUID] = Field(foreign_key="users.id", default=None)
    created_at:        datetime     = Field(
        default_factory=utc_now, nullable=False
    )
