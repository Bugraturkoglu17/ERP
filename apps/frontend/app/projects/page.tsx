"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Edit2, FileUp, FolderOpen, Loader2, MapPin,
  MoreVertical, Plus, Search, Store, Trash2, X,
} from "lucide-react";
import { apiGet, apiPost, apiPatch } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

type Project = {
  id: string; name: string; project_no?: string; description?: string;
  status: string; scope_codes?: string[];
  start_date?: string; due_date?: string;
  created_at?: string; updated_at?: string;
  customer_id?: string; region_id?: string; branch_id?: string;
};

type Customer = { id: string; name: string; code?: string };
type Region   = { id: string; name: string; city: string; customer_id: string };
type Branch   = { id: string; name: string; city: string; region_id: string };

type DescExtra = {
  store_type?: string; format?: string;
  bolge?: string; sehir?: string;
  tel1?: string; tel2?: string; tel3?: string; tel4?: string;
  adres?: string; acilis_tarihi?: string;
};

function parseDesc(desc?: string): DescExtra {
  if (!desc) return {};
  try { return JSON.parse(desc); } catch { return {}; }
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STORE_TYPE_OPTS = [
  { value: "existing_store", label: "Mevcut Mağaza" },
  { value: "new_build",      label: "Yeni Yapım"    },
  { value: "closed_store",   label: "Kapanan Mağaza"},
  { value: "facility",       label: "Tesis"         },
];

const STORE_TYPE_BADGE: Record<string, string> = {
  existing_store: "bg-blue-50 text-blue-700",
  new_build:      "bg-emerald-50 text-emerald-700",
  closed_store:   "bg-slate-100 text-slate-500",
  facility:       "bg-purple-50 text-purple-700",
};


const STATUS_OPTS = [
  { value: "inquiry",      label: "Keşif"        },
  { value: "approved",     label: "Onaylandı"    },
  { value: "in_progress",  label: "Devam Ediyor" },
  { value: "invoice_pend", label: "Beklemede"    },
  { value: "completed",    label: "Tamamlandı"   },
  { value: "cancelled",    label: "İptal Edildi" },
];


function getIstipi(codes: string[] = []) {
  if (codes.includes("bakim"))      return { value: "bakim",      label: "Bakım"      };
  if (codes.includes("tadilat"))    return { value: "tadilat",    label: "Tadilat"    };
  if (codes.includes("yeni_yapim")) return { value: "yeni_yapim", label: "Yeni Yapım" };
  return undefined;
}

const IS_TIPI_BADGE: Record<string, string> = {
  bakim:      "bg-sky-50 text-sky-700",
  tadilat:    "bg-amber-50 text-amber-700",
  yeni_yapim: "bg-emerald-50 text-emerald-700",
};

function isCancelled(s: string) { return s === "cancelled" || s === "CANCELLED"; }

// ── Mağaza Kartı ───────────────────────────────────────────────────────────────

function MagazaKart({ p, regionName, onEdit, onDeactivate }: {
  p: Project; regionName?: string;
  onEdit: (p: Project) => void; onDeactivate: (p: Project) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const extra    = parseDesc(p.description);
  const stType   = STORE_TYPE_OPTS.find(o => o.value === extra.store_type);
  const tipi     = getIstipi(p.scope_codes);
  const isCancl  = isCancelled(p.status);

  return (
    <div className={`relative flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 group ${
      isCancl ? "border-slate-100 opacity-50" : "border-slate-200 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5"
    }`}>
      {/* Context menu */}
      <div className="absolute top-3 right-3">
        <button onClick={() => setMenuOpen(v => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <button onClick={() => { setMenuOpen(false); onEdit(p); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                <Edit2 className="h-3.5 w-3.5 text-slate-400" /> Düzenle
              </button>
              <button onClick={() => { setMenuOpen(false); onDeactivate(p); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 ${isCancl ? "text-green-700" : "text-red-600 hover:bg-red-50"}`}>
                <Trash2 className="h-3.5 w-3.5" /> {isCancl ? "Aktife Al" : "Pasifleştir"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start gap-2.5 mb-3 pr-6">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100">
          <Store className="h-4 w-4 text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 leading-tight line-clamp-2">{p.name}</p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{p.project_no ?? "—"}</p>
        </div>
      </div>

      {regionName && (
        <div className="flex items-center gap-1.5 mb-2.5">
          <MapPin className="h-3 w-3 text-slate-300 shrink-0" />
          <span className="text-[11px] text-slate-500 truncate">{regionName}</span>
        </div>
      )}

      {/* Badges — store_type + is_tipi */}
      <div className="flex flex-wrap gap-1.5 mb-3 min-h-[22px]">
        {stType && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STORE_TYPE_BADGE[stType.value] ?? "bg-slate-100 text-slate-600"}`}>
            {stType.label}
          </span>
        )}
        {tipi && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${IS_TIPI_BADGE[tipi.value] ?? "bg-slate-100 text-slate-600"}`}>
            {tipi.label}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
        <p className="text-[10px] text-slate-300">
          {p.updated_at ? new Date(p.updated_at).toLocaleDateString("tr-TR") : "—"}
        </p>
        <Link href={`/projects/${p.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
          <FolderOpen className="h-3.5 w-3.5" /> Klasörü Aç
        </Link>
      </div>
    </div>
  );
}

// ── Store Form Modal ───────────────────────────────────────────────────────────

type StoreFormState = {
  customer_id: string; region_id: string; branch_id: string;
  name: string; project_no: string; status: string;
  bolge: string; sehir: string; adres: string; tel1: string;
};

function defaultForm(): StoreFormState {
  return {
    customer_id: "", region_id: "", branch_id: "",
    name: "", project_no: "", status: "inquiry",
    bolge: "", sehir: "", adres: "", tel1: "",
  };
}

function editForm(p: Project): StoreFormState {
  const extra = parseDesc(p.description);
  return {
    customer_id: p.customer_id ?? "", region_id: p.region_id ?? "", branch_id: p.branch_id ?? "",
    name: p.name, project_no: p.project_no ?? "", status: p.status.toLowerCase(),
    bolge: extra.bolge ?? "", sehir: extra.sehir ?? "", adres: extra.adres ?? "",
    tel1: extra.tel1 ?? "",
  };
}

function buildDescription(existing: string | undefined, form: StoreFormState): string {
  let base: DescExtra = {};
  try { base = JSON.parse(existing || "{}"); } catch {}
  if (form.bolge.trim())      base.bolge      = form.bolge.trim();      else delete base.bolge;
  if (form.sehir.trim())      base.sehir      = form.sehir.trim();      else delete base.sehir;
  if (form.adres.trim())      base.adres      = form.adres.trim();      else delete base.adres;
  if (form.tel1.trim())       base.tel1       = form.tel1.trim();       else delete base.tel1;
  return JSON.stringify(base);
}

function StoreFormModal({ mode, initial, projectId, existingDescription, existingScopeCodes, customers, onClose, onDone }: {
  mode: "create" | "edit"; initial: StoreFormState; projectId?: string;
  existingDescription?: string; existingScopeCodes?: string[];
  customers: Customer[]; onClose: () => void; onDone: () => void;
}) {
  const [form,     setForm]     = useState<StoreFormState>(initial);
  const [regions,  setRegions]  = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState("");

  useEffect(() => {
    if (initial.customer_id) {
      apiGet<Region[]>(`/projects/regions/${initial.customer_id}`)
        .then(d => setRegions(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, [initial.customer_id]);
  useEffect(() => {
    if (initial.region_id) {
      apiGet<Branch[]>(`/projects/branches/${initial.region_id}`)
        .then(d => setBranches(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, [initial.region_id]);

  const onCustomerChange = async (id: string) => {
    setForm(p => ({ ...p, customer_id: id, region_id: "", branch_id: "" }));
    setRegions([]); setBranches([]);
    if (!id) return;
    const d = await apiGet<Region[]>(`/projects/regions/${id}`).catch(() => [] as Region[]);
    setRegions(Array.isArray(d) ? d : []);
  };

  const onRegionChange = async (id: string) => {
    setForm(p => ({ ...p, region_id: id, branch_id: "" }));
    setBranches([]);
    if (!id) return;
    const d = await apiGet<Branch[]>(`/projects/branches/${id}`).catch(() => [] as Branch[]);
    setBranches(Array.isArray(d) ? d : []);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === "create" && (!form.customer_id || !form.region_id || !form.branch_id)) {
      setErr("Konum bilgisi zorunludur (Zincir, Şehir, Konum)."); return;
    }
    setBusy(true); setErr("");
    try {
      const desc = buildDescription(existingDescription, form);
      const payload: Record<string, unknown> = {
        name: form.name.trim(), project_no: form.project_no.trim() || null,
        description: desc, status: form.status, contract_value: null,
      };
      if (mode === "create") {
        await apiPost("/projects", { ...payload, customer_id: form.customer_id, region_id: form.region_id, branch_id: form.branch_id });
      } else {
        // scope_codes değiştirilmez — bakım/tadilat/yeni_yapım modüllerinden yönetilir
        await apiPatch(`/projects/${projectId}`, { ...payload, scope_codes: existingScopeCodes ?? [] });
      }
      onDone(); onClose();
    } catch (ex: any) {
      const detail = ex?.response?.data?.detail;
      setErr(typeof detail === "string" ? detail : "İşlem başarısız.");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">
            {mode === "create" ? "Yeni Mağaza Ekle" : "Mağaza Bilgilerini Düzenle"}
          </h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[75vh] px-6 py-5 space-y-4">
          {mode === "create" && (
            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Konum Bilgisi</p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mağaza Zinciri *</label>
                <select required value={form.customer_id} onChange={e => onCustomerChange(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="">Zincir seçin...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Şehir / Bölge *</label>
                <select required value={form.region_id} onChange={e => onRegionChange(e.target.value)}
                  disabled={!form.customer_id}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50">
                  <option value="">Şehir seçin...</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.city}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mağaza Konumu *</label>
                <select required value={form.branch_id} onChange={e => setForm(p => ({ ...p, branch_id: e.target.value }))}
                  disabled={!form.region_id}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50">
                  <option value="">Konum seçin...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Mağaza Adı *</label>
              <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Örn: Migros Ataşehir MMM" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Mağaza Kodu</label>
              <input value={form.project_no} onChange={e => setForm(p => ({ ...p, project_no: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Örn: 3421" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Bölge</label>
              <input value={form.bolge} onChange={e => setForm(p => ({ ...p, bolge: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Örn: İç Anadolu" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Şehir</label>
              <input value={form.sehir} onChange={e => setForm(p => ({ ...p, sehir: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Örn: Ankara" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Telefon</label>
              <input value={form.tel1} onChange={e => setForm(p => ({ ...p, tel1: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="0XXX XXX XX XX" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Adres</label>
              <textarea rows={2} value={form.adres} onChange={e => setForm(p => ({ ...p, adres: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:border-blue-500 focus:outline-none"
                placeholder="Tam adres..." />
            </div>
          </div>

          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Vazgeç
            </button>
            <button type="submit" disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "Mağaza Oluştur" : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Pasifleştir Modal ──────────────────────────────────────────────────────────

function DeactivateModal({ project, onClose, onDone }: { project: Project; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const isCancl = isCancelled(project.status);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await apiPatch(`/projects/${project.id}`, { status: isCancl ? "inquiry" : "cancelled" });
      onDone(); onClose();
    } catch { alert("İşlem başarısız."); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-2">
          {isCancl ? "Mağazayı Aktife Al" : "Mağazayı Pasifleştir"}
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          {isCancl
            ? `"${project.name}" tekrar aktif listeye alınacak.`
            : `"${project.name}" pasifleştirilecek. Dosyalar ve geçmiş korunacak.`}
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Vazgeç
          </button>
          <button onClick={handleConfirm} disabled={busy}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              isCancl ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            }`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isCancl ? "Aktife Al" : "Pasifleştir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ana Sayfa ──────────────────────────────────────────────────────────────────

export default function MagazalarPage() {
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [customers,  setCustomers]  = useState<Customer[]>([]);
  const [regionMap,  setRegionMap]  = useState<Record<string, string>>({});
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [loading,    setLoading]    = useState(true);

  const [search,           setSearch]           = useState("");
  const [filterStoreType,  setFilterStoreType]  = useState("all");
  const [filterTipi,       setFilterTipi]       = useState("all");
  const [filterRegion,     setFilterRegion]     = useState("all");
  const [showCancelled,    setShowCancelled]    = useState(false);

  const [createOpen,     setCreateOpen]     = useState(false);
  const [editProject,    setEditProject]    = useState<Project | null>(null);
  const [deactivateProj, setDeactivateProj] = useState<Project | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [projs, custs] = await Promise.all([
        apiGet<Project[]>("/projects?limit=5000").catch(() => [] as Project[]),
        apiGet<Customer[]>("/projects/customers").catch(() => [] as Customer[]),
      ]);
      const projArr = Array.isArray(projs) ? projs : [];
      const custArr = Array.isArray(custs) ? custs : [];
      setProjects(projArr);
      setCustomers(custArr);

      const regionResults = await Promise.all(
        custArr.map(c => apiGet<Region[]>(`/projects/regions/${c.id}`).catch(() => [] as Region[]))
      );
      const regions: Region[] = regionResults.flat();
      setAllRegions(regions);
      const rMap: Record<string, string> = {};
      for (const r of regions) rMap[r.id] = r.name;
      setRegionMap(rMap);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projects.filter(p => {
      if (!showCancelled && isCancelled(p.status)) return false;
      const extra = parseDesc(p.description);
      const matchSearch  = !q || p.name.toLowerCase().includes(q) || (p.project_no ?? "").toLowerCase().includes(q);
      const matchType    = filterStoreType === "all" || extra.store_type === filterStoreType;
      const tipi         = p.scope_codes?.find(c => ["bakim","tadilat","yeni_yapim"].includes(c)) ?? "";
      const matchTipi    = filterTipi === "all" || tipi === filterTipi;
      const matchRegion  = filterRegion === "all" || p.region_id === filterRegion;
      return matchSearch && matchType && matchTipi && matchRegion;
    });
  }, [projects, search, filterStoreType, filterTipi, filterRegion, showCancelled]);

  const cancelledCount = projects.filter(p => isCancelled(p.status)).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mağaza Kartı</h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading ? "Yükleniyor..." : `${projects.length} mağaza · ${allRegions.length} bölge`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Link href="/projects/import"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <FileUp className="h-4 w-4" /> Excel'den İçe Aktar
          </Link>
          <button onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors">
            <Plus className="h-4 w-4" /> Yeni Mağaza Ekle
          </button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Mağaza adı veya kodu ara..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none" />
        </div>

        {/* Mağaza Türü filtresi — STATUS yerine */}
        <select value={filterStoreType} onChange={e => setFilterStoreType(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none">
          <option value="all">Tüm Mağazalar</option>
          {STORE_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select value={filterTipi} onChange={e => setFilterTipi(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none">
          <option value="all">Tüm İş Tipleri</option>
          <option value="bakim">Bakım</option>
          <option value="tadilat">Tadilat</option>
          <option value="yeni_yapim">Yeni Yapım</option>
        </select>

        {allRegions.length > 0 && (
          <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none">
            <option value="all">Tüm Bölgeler</option>
            {allRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}

        {cancelledCount > 0 && (
          <button onClick={() => setShowCancelled(v => !v)}
            className={`rounded-xl border px-3 py-2.5 text-sm transition-colors ${
              showCancelled ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}>
            {showCancelled ? `Pasifleri Gizle (${cancelledCount})` : `Pasifleri Göster (${cancelledCount})`}
          </button>
        )}
      </div>

      {/* İçerik */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
          <p className="text-sm text-slate-400">Mağazalar yükleniyor...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Store className="mx-auto h-8 w-8 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600">
            {projects.length === 0 ? "Henüz mağaza eklenmemiş." : "Filtreye uygun mağaza bulunamadı."}
          </p>
          {projects.length === 0 && (
            <button onClick={() => setCreateOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> Yeni Mağaza Ekle
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400">{filtered.length} mağaza gösteriliyor</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map(p => (
              <MagazaKart key={p.id} p={p} regionName={regionMap[p.region_id ?? ""]}
                onEdit={setEditProject} onDeactivate={setDeactivateProj} />
            ))}
          </div>
        </>
      )}

      {createOpen && (
        <StoreFormModal mode="create" initial={defaultForm()} customers={customers}
          onClose={() => setCreateOpen(false)} onDone={load} />
      )}
      {editProject && (
        <StoreFormModal mode="edit" initial={editForm(editProject)} projectId={editProject.id}
          existingDescription={editProject.description} existingScopeCodes={editProject.scope_codes}
          customers={customers} onClose={() => setEditProject(null)} onDone={load} />
      )}
      {deactivateProj && (
        <DeactivateModal project={deactivateProj} onClose={() => setDeactivateProj(null)} onDone={load} />
      )}
    </div>
  );
}
