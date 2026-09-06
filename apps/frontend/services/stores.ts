/**
 * Mağaza (store) veri erişim katmanı — role bağımsız, tek kaynak: backend /projects API.
 * Yetki kontrolü backend'de yapılır (bkz. app/api/v1/routes/projects.py: list_projects).
 *
 * Excel içe aktarma sihirbazı (kolon eşleştirme, önizleme, hata raporu) UI-ağırlıklı
 * olduğu için app/projects/import/page.tsx içinde kalır; o sihirbaz bu dosyadaki
 * createStore/updateStore fonksiyonlarını satır satır çağırır.
 */
import { apiGet, apiPost, apiPatch } from "@/lib/api";

export type Store = {
  id: string;
  name: string;
  project_no?: string;
  description?: string;
  status: string;
  scope_codes?: string[];
  region_id?: string;
  branch_id?: string;
  customer_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type StoreListParams = { limit?: number; skip?: number; q?: string };

/** Tüm mağaza listesini getirir. Görünürlük backend'de role göre sınırlanır. */
export async function getStores(params: StoreListParams = {}): Promise<Store[]> {
  const limit = params.limit ?? 5000;
  const skip = params.skip ?? 0;
  const query = new URLSearchParams({ limit: String(limit), skip: String(skip) });
  if (params.q?.trim()) query.set("q", params.q.trim());
  const data = await apiGet<Store[]>(`/projects?${query.toString()}`);
  return Array.isArray(data) ? data : [];
}

/** Tek bir mağazayı ID ile getirir. */
export async function getStoreById(id: string): Promise<Store> {
  return apiGet<Store>(`/projects/${id}`);
}

/**
 * Halihazırda yüklenmiş bir mağaza listesinde ad/koda göre arar.
 * Backend'de henüz server-side arama endpoint'i olmadığı için client-side filtreler.
 */
export function searchStores(stores: Store[], query: string): Store[] {
  const q = query.trim().toLowerCase();
  if (!q) return stores;
  return stores.filter(
    (s) => s.name.toLowerCase().includes(q) || (s.project_no ?? "").toLowerCase().includes(q)
  );
}

/** Büyük mağaza dizininde sunucu tarafında ad/kod araması yapar. */
export async function searchStoresRemote(query: string, limit = 20): Promise<Store[]> {
  if (!query.trim()) return [];
  return getStores({ q: query, limit, skip: 0 });
}

export type StoreCreateInput = {
  name: string;
  project_no?: string | null;
  description?: string;
  status?: string;
  customer_id: string;
  region_id: string;
  branch_id: string;
  scope_codes?: string[];
  contract_value?: number | null;
  start_date?: string;
  due_date?: string;
};

export async function createStore(input: StoreCreateInput): Promise<Store> {
  return apiPost<Store>("/projects", input);
}

export async function updateStore(id: string, input: Partial<StoreCreateInput>): Promise<Store> {
  return apiPatch<Store>(`/projects/${id}`, input);
}
