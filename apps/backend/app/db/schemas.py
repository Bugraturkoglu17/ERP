"""
Pydantic v2 Schemas — parsed DTO'lar, DB'ye direkt map edilmez.
Modellerin kendisi core/db/models.py'da tanımlanır; şemalar core/db/schemas.py'da.
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.db.models import (
    WarehouseType,
    InventoryTransactionType,
    TenantEmailMode,
)


# ── Auth ──────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class CompletePasswordResetRequest(BaseModel):
    email: EmailStr
    temporary_password: str
    new_password: str


class MessageResponse(BaseModel):
    message: str


class TenantContextRead(BaseModel):
    tenant_id: UUID
    tenant_name: str
    tenant_code: str
    logo_url: str | None = None
    tax_no: str | None = None
    sector: str | None = None
    country: str | None = None
    theme_color: str | None = None
    domain: str | None = None
    subdomain: str | None = None
    email_mode: TenantEmailMode = TenantEmailMode.PLATFORM
    from_name: str | None = None
    from_email: str | None = None
    reply_to: str | None = None
    email_domain_verified: bool = False
    email_provider_identity_id: str | None = None
    email_branding: dict[str, Any] | None = None
    
    # Yeni eklenen kurumsal, operasyonel, bölgesel ve güvenlik ayarları
    contact_phone: str | None = None
    address: str | None = None
    default_currency: str = "TRY"
    vat_rate: float = 20.0
    low_stock_threshold: int = 10
    auto_invoice_no: bool = True
    require_approval_for_expenses: bool = True
    default_payment_term_days: int = 30
    
    locale: str = "tr-TR"
    timezone: str = "Europe/Istanbul"
    date_format: str = "DD.MM.YYYY"
    session_timeout_minutes: int = 60
    mfa_required_for_admins: bool = True
    login_ip_whitelist: str | None = None
    email_notifications: bool = True
    push_notifications: bool = False
    daily_summary_hour: str = "18:00"
    backup_frequency: str = "daily"
    retention_days: int = 180


class TenantProfileUpdate(BaseModel):
    tenant_name: str | None = None
    logo_url: str | None = None


# ── User ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email:       EmailStr
    password:    str
    full_name:   str
    phone:       str | None         = None
    roles:       list[str]
    discipline:  str | None         = None
    discipline_only: bool = False


class UserRead(BaseModel):
    id:             UUID
    tenant_id:      UUID | None
    email:          str
    full_name:      str
    phone:          str  | None
    discipline:     str | None
    discipline_only:bool
    is_active:      bool
    model_config   = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name:       str | None       = None
    phone:           str | None       = None
    discipline:      str | None       = None
    discipline_only: bool | None      = None
    roles:           list[str] | None = None
    is_active:       bool | None      = None


class TenantCreate(BaseModel):
    name: str
    code: str
    logo_url: str | None = None


class TenantRead(BaseModel):
    id: UUID
    name: str
    code: str
    logo_url: str | None
    status: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TenantAdminProvisionRequest(BaseModel):
    tenant_id: UUID
    email: EmailStr
    full_name: str
    temporary_password: str


class TenantUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    logo_url: str | None = None
    status: str | None = None
    is_active: bool | None = None


class TenantSettingsUpsert(BaseModel):
    tax_no: str | None = None
    sector: str | None = None
    country: str | None = None
    theme_color: str | None = None
    domain: str | None = None
    subdomain: str | None = None
    email_mode: TenantEmailMode | None = None
    from_name: str | None = None
    from_email: str | None = None
    reply_to: str | None = None
    email_domain_verified: bool | None = None
    email_provider_identity_id: str | None = None
    email_branding: dict[str, Any] | None = None
    
    # Yeni eklenen kurumsal, operasyonel, bölgesel ve güvenlik ayarları
    contact_phone: str | None = None
    address: str | None = None
    default_currency: str | None = None
    vat_rate: float | None = None
    low_stock_threshold: int | None = None
    auto_invoice_no: bool | None = None
    require_approval_for_expenses: bool | None = None
    default_payment_term_days: int | None = None
    
    locale: str | None = None
    timezone: str | None = None
    date_format: str | None = None
    session_timeout_minutes: int | None = None
    mfa_required_for_admins: bool | None = None
    login_ip_whitelist: str | None = None
    email_notifications: bool | None = None
    push_notifications: bool | None = None
    daily_summary_hour: str | None = None
    backup_frequency: str | None = None
    retention_days: int | None = None


class TenantSettingsRead(TenantSettingsUpsert):
    tenant_id: UUID
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TenantAdminRead(UserRead):
    force_password_change: bool = False


class TenantAdminResetRequest(BaseModel):
    temporary_password: str
    force_password_change: bool = True


class TenantAdminUpdateRequest(BaseModel):
    full_name: str | None = None
    is_active: bool | None = None
    force_password_change: bool | None = None


class PlatformPlanCreate(BaseModel):
    code: str
    name: str
    max_users: int = 10
    storage_limit_gb: int = 5
    modules: list[str] = []


class PlatformPlanRead(BaseModel):
    id: UUID
    code: str
    name: str
    max_users: int
    storage_limit_gb: int
    modules: list[str]
    is_active: bool
    created_at: datetime


class PlatformSubscriptionAssignRequest(BaseModel):
    tenant_id: UUID
    plan_id: UUID
    status: str = "active"
    ends_at: datetime | None = None


class PlatformSubscriptionRead(BaseModel):
    id: UUID
    tenant_id: UUID
    plan_id: UUID
    status: str
    starts_at: datetime
    ends_at: datetime | None
    created_at: datetime


class PlatformAuditRead(BaseModel):
    id: UUID
    actor_user_id: UUID
    action: str
    tenant_id: UUID | None
    target_user_id: UUID | None
    details: str | None
    created_at: datetime


# ── Role / Permission ─────────────────────────────────────────────────────────

class RoleRead(BaseModel):
    id:           UUID
    name:         str
    display_name: str
    description:  str  | None
    is_active:    bool
    model_config  = ConfigDict(from_attributes=True)


# ── Customer ──────────────────────────────────────────────────────────────────

class CustomerBase(BaseModel):
    name:          str
    tax_no:        str | None         = None
    contact_email: str | None         = None
    contact_phone: str | None         = None
    address:       str | None         = None


class CustomerCreate(CustomerBase):
    pass


class CustomerRead(CustomerBase):
    id:        UUID
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Hierarchy ─────────────────────────────────────────────────────────────────

class RegionRead(BaseModel):
    id:          UUID
    customer_id: UUID
    name:        str
    code:        str | None
    city:        str
    model_config = ConfigDict(from_attributes=True)


class RegionCreate(BaseModel):
    customer_id: UUID
    name: str
    code: str | None = None
    city: str


class RegionUpdate(BaseModel):
    customer_id: UUID | None = None
    name: str | None = None
    code: str | None = None
    city: str | None = None


class BranchRead(BaseModel):
    id:         UUID
    region_id:  UUID
    name:       str
    code:       str | None
    address:    str | None
    model_config = ConfigDict(from_attributes=True)


class BranchCreate(BaseModel):
    region_id: UUID
    name: str
    code: str | None = None
    address: str | None = None


class BranchUpdate(BaseModel):
    region_id: UUID | None = None
    name: str | None = None
    code: str | None = None
    address: str | None = None


# ── Projects ─────────────────────────────────────────────────────────────────

class ProjectScope(BaseModel):
    code: str
    name: str


class ProjectCreate(BaseModel):
    customer_id:    UUID
    region_id:      UUID
    branch_id:      UUID
    name:           str
    project_no:     str | None         = None
    description:    str | None         = None
    start_date:     datetime | None    = None
    due_date:       datetime | None    = None
    scope_codes:    list[str]         = []
    contract_value: float | None       = None
    status:         str               = "inquiry"


class ProjectRead(ProjectCreate):
    id:          UUID
    created_by:  UUID | None
    created_at:  datetime
    updated_at:  datetime
    model_config = ConfigDict(from_attributes=True)


class ProjectUpdate(BaseModel):
    name:           str | None          = None
    project_no:     str | None          = None
    description:    str | None          = None
    start_date:     datetime | None     = None
    due_date:       datetime | None     = None
    scope_codes:    list[str] | None    = None
    status:         str | None          = None
    contract_value: float | None        = None


class ProjectAssignmentCreate(BaseModel):
    user_id:        UUID
    role_at_project: str
    is_lead:        bool = False


class ProjectAssignmentRead(ProjectAssignmentCreate):
    id:             UUID
    project_id:     UUID
    assigned_at:    datetime
    unassigned_at:  datetime | None
    model_config   = ConfigDict(from_attributes=True)


# ── Inventory ─────────────────────────────────────────────────────────────────

class WarehouseCreate(BaseModel):
    type:        WarehouseType
    name:        str
    code:        str | None = None
    location:    str | None = None
    project_id:  UUID | None = None
    is_active:   bool = True


class WarehouseUpdate(BaseModel):
    type:        WarehouseType | None = None
    name:        str | None = None
    code:        str | None = None
    location:    str | None = None
    project_id:  UUID | None = None
    is_active:   bool | None = None


class WarehouseRead(BaseModel):
    id:         UUID
    type:       str
    name:       str
    code:       str | None
    location:   str | None
    project_id: UUID | None
    is_active:  bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class MaterialCreate(BaseModel):
    sku:             str
    name:            str
    description:     str | None = None
    unit:            str = "adet"
    barcode:         str | None = None
    unit_cost:       float | None = None
    min_stock_level: int = 0
    is_active:       bool = True


class MaterialCreateWithStock(MaterialCreate):
    warehouse_id:     UUID | None = None
    initial_quantity: int | None = None


class MaterialUpdate(BaseModel):
    sku:             str | None = None
    name:            str | None = None
    description:     str | None = None
    unit:            str | None = None
    barcode:         str | None = None
    unit_cost:       float | None = None
    min_stock_level: int | None = None
    is_active:       bool | None = None


class MaterialRead(BaseModel):
    id:               UUID
    sku:              str
    name:             str
    description:      str | None
    unit:             str
    barcode:          str | None
    unit_cost:        float | None
    min_stock_level:  int
    is_active:        bool
    created_at:       datetime
    model_config      = ConfigDict(from_attributes=True)


class StockRead(BaseModel):
    warehouse_id: UUID
    material_id:  UUID
    quantity:     int
    updated_at:   datetime
    updated_by:   UUID | None
    model_config = ConfigDict(from_attributes=True)


class WarehouseStockItem(BaseModel):
    """Material + quantity for a given warehouse's stock listing."""
    material_id:   UUID
    sku:           str
    name:           str
    unit:           str
    quantity:       int
    min_stock_level: int
    unit_cost:      float | None
    model_config   = ConfigDict(from_attributes=True)


class TransferRequest(BaseModel):
    material_id:       UUID
    from_warehouse_id: UUID
    to_warehouse_id:   UUID
    quantity:          int
    reference_no:      str | None = None
    notes:             str | None = None
    related_project_id: UUID | None = None
    unit_cost:         float | None = None


class InventoryTransactionCreate(BaseModel):
    material_id:        UUID
    from_warehouse_id:  UUID | None = None
    to_warehouse_id:    UUID | None = None
    quantity:           int
    transaction_type:   InventoryTransactionType
    reference_no:       str | None = None
    notes:              str | None = None
    related_project_id: UUID | None = None
    unit_cost:          float | None = None


class InventoryTransactionRead(BaseModel):
    id:                  UUID
    material_id:         UUID
    from_warehouse_id:   UUID | None
    to_warehouse_id:     UUID | None
    related_project_id:  UUID | None
    quantity:            int
    unit_cost:           float | None
    total_cost:          float | None
    transaction_type:    str
    reference_no:        str | None
    notes:               str | None
    performed_by:        UUID | None
    performed_at:        datetime
    model_config        = ConfigDict(from_attributes=True)


class LowStockAlertRead(BaseModel):
    id:            UUID
    item_id:       UUID
    current_stock: int
    min_level:     int
    notified:      bool
    created_at:    datetime
    model_config  = ConfigDict(from_attributes=True)


# ── Documents ────────────────────────────────────────────────────────────────────
 
class DocumentCreate(BaseModel):
    project_id:   UUID
    doc_type:     str
    original_name: str
    revision_note: str | None = None
 
class DocumentUpdate(BaseModel):
    doc_type:     str | None = None
    original_name: str | None = None
    revision_note: str | None = None
 
class DocumentRead(BaseModel):
    id:              UUID
    project_id:      UUID
    doc_type:        str
    original_name:   str
    file_key:        str
    bucket_name:     str
    file_size_bytes: int | None
    mime_type:       str | None
    version:         int
    revision_note:   str | None
    archived:        bool
    uploaded_by:     UUID | None
    uploaded_by_name:  str | None = None
    uploaded_by_email: str | None = None
    created_at:      datetime
    model_config    = ConfigDict(from_attributes=True)
 
class DocumentVersionCreate(BaseModel):
    doc_id:         UUID
    revision_note:  str | None = None
 
class DocumentDownloadResponse(BaseModel):
    url: str
    expires_in: int
 
# ── Finance ──────────────────────────────────────────────────────────────────────

class InvoiceRead(BaseModel):
    id:            UUID
    invoice_no:    str
    grand_total:   float
    status:        str
    issue_date:    datetime
    title:         str | None = None
    customer_id:   UUID | None = None
    project_id:    UUID | None = None
    subtotal:      float | None = None
    tax_rate:      float | None = None
    tax_amount:    float | None = None
    due_date:      datetime | None = None
    model_config  = ConfigDict(from_attributes=True)

class InvoiceItemCreate(BaseModel):
    description:     str
    quantity:        float
    unit_price:      float

class InvoiceItemRead(BaseModel):
    id:              UUID
    invoice_id:      UUID
    description:     str
    quantity:        float
    unit_price:      float
    total_amount:    float
    model_config  = ConfigDict(from_attributes=True)

class InvoiceCreate(BaseModel):
    customer_id:       UUID
    project_id:        UUID | None = None
    invoice_no:        str
    title:             str
    issue_date:        datetime
    due_date:          datetime | None = None
    subtotal:          float
    tax_rate:          float = 20.0
    tax_amount:        float
    grand_total:       float
    status:            str = "draft"
    items:             list[InvoiceItemCreate] = []

class ExpenseCreate(BaseModel):
    project_id:        UUID
    category:          str
    description:       str
    amount:            float
    quantity:          float | None = None
    expense_date:      datetime

class ExpenseRead(BaseModel):
    id:                UUID
    project_id:        UUID
    category:          str
    description:       str
    amount:            float
    quantity:          float | None
    expense_date:      datetime
    created_at:        datetime
    model_config  = ConfigDict(from_attributes=True)

class PaymentCreate(BaseModel):
    invoice_id:        UUID | None = None
    direction:         str = "incoming"
    amount:            float
    payment_method:    str
    reference_no:      str | None = None
    payment_date:      datetime
    notes:             str | None = None

class PaymentRead(BaseModel):
    id:                UUID
    invoice_id:        UUID | None
    direction:         str
    amount:            float
    payment_method:    str
    reference_no:      str | None
    payment_date:      datetime
    created_at:        datetime
    model_config  = ConfigDict(from_attributes=True)
