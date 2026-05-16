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
    email:          str
    full_name:      str
    phone:          str  | None
    discipline:     str | None
    discipline_only:bool
    is_active:      bool
    model_config   = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name:  str | None         = None
    phone:      str | None         = None
    discipline: str | None         = None
    is_active:  bool | None        = None


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


class BranchRead(BaseModel):
    id:         UUID
    region_id:  UUID
    name:       str
    code:       str | None
    address:    str | None
    model_config = ConfigDict(from_attributes=True)


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


# ── Finance ──────────────────────────────────────────────────────────────────

class InvoiceRead(BaseModel):
    id:            UUID
    invoice_no:    str
    grand_total:   float
    status:        str
    issue_date:    datetime
    model_config  = ConfigDict(from_attributes=True)
