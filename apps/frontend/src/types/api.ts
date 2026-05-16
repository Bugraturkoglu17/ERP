/**
 * apps/frontend/src/types/api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sismik Mekanik ERP — Frontend TypeScript Arayüzleri
 * Her arayüz backend'deki Pydantic şemalarla birebir uyumludur.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ── UUID ───────────────────────────────────────────────────────────────────── */
export type UUID = string;

/* ── Kullanıcı ──────────────────────────────────────────────────────────────── */
export interface User {
  id:             UUID;
  email:          string;
  full_name:      string;
  phone:          string | null;
  discipline:     string | null;
  discipline_only: boolean;
  is_active:      boolean;
  default_role:   string;
}

/* ── Proje ──────────────────────────────────────────────────────────────────── */
export interface ProjectCreate {
  customer_id:    UUID;
  region_id:      UUID;
  branch_id:      UUID;
  name:           string;
  project_no:     string | null;
  description:    string | null;
  start_date:     string | null;   // ISO 8601
  due_date:       string | null;   // ISO 8601
  scope_codes:    string[];
  contract_value: number | string | null;
  status:         string;
}

export interface Project extends ProjectCreate {
  id:          UUID;
  created_by:  UUID | null;
  created_at:  string;   // ISO 8601
  updated_at:  string;   // ISO 8601
}

export interface ProjectUpdate extends Partial<ProjectCreate> {}

/* ── Proje Ataması ───────────────────────────────────────────────────────────── */
export interface ProjectAssignment {
  id:              UUID;
  project_id:      UUID;
  user_id:         UUID;
  role_at_project: string;
  is_lead:         boolean;
  assigned_at:     string;
  unassigned_at:   string | null;
}

/* ── Müşteri ────────────────────────────────────────────────────────────────── */
export interface Customer {
  id:            UUID;
  name:          string;
  tax_no:        string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address:       string | null;
  is_active:     boolean;
  created_at:    string;
}

/* ── Lokasyon Hiyerarşisi ───────────────────────────────────────────────────── */
export interface Region {
  id:          UUID;
  customer_id: UUID;
  name:        string;
  code:        string | null;
  city:        string;
  created_at:  string;
}

export interface Branch {
  id:              UUID;
  region_id:       UUID;
  name:            string;
  code:            string | null;
  address:         string | null;
  ready_for_field: boolean;
  created_at:      string;
}

/* ── Fatura / Hakediş ────────────────────────────────────────────────────────── */
export interface Invoice {
  id:           UUID;
  invoice_no:   string;
  title:        string;
  grand_total:  number | string;
  status:       string;
  issue_date:   string;
  paid_amount:  number | string;
  customer_id:  UUID;
  project_id:   UUID | null;
}

/* ── Envanter ────────────────────────────────────────────────────────────────── */
export interface InventoryItem {
  id:             UUID;
  sku:            string;
  name:           string;
  description:    string | null;
  type:           number;
  unit:           string;
  current_stock:  number;
  min_stock_level: number;
  is_active:      boolean;
}

export interface StockMovement {
  id:              UUID;
  movement_type:   string;
  quantity:        number;
  performed_at:    string;
  reference_no:    string | null;
  notes:           string | null;
}

/* ── Auth ────────────────────────────────────────────────────────────────── */
export interface Token {
  access_token:  string;
  refresh_token: string;
  token_type:    string;
}

export interface LoginRequest {
  email:    string;
  password: string;
}
