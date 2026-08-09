// TODO Backend endpoint önerileri:
// GET    /api/manager/work-orders
// POST   /api/manager/work-orders
// GET    /api/manager/work-orders/:id
// PATCH  /api/manager/work-orders/:id
// POST   /api/manager/work-orders/:id/assign
// POST   /api/manager/work-orders/:id/cancel
// POST   /api/manager/work-orders/:id/reports/:reportId/images/:imageId/attach-to-store

export type WorkOrderStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type WorkOrderCategory = "ariza" | "tadilat" | "yeni_yapim";
export type WorkOrderPriority = "normal" | "important" | "critical";
export type ReportSeverity = "normal" | "important" | "critical";

export const CATEGORY_LABEL: Record<WorkOrderCategory, string> = {
  ariza: "Arıza",
  tadilat: "Tadilat",
  yeni_yapim: "Yeni Yapım",
};

export const PRIORITY_LABEL: Record<WorkOrderPriority, string> = {
  normal: "Normal",
  important: "Önemli",
  critical: "Kritik",
};

export const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  planned: "Planlanacak",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export const SEVERITY_LABEL: Record<ReportSeverity, string> = {
  normal: "Normal",
  important: "Önemli",
  critical: "Kritik",
};

export interface MockStore {
  id: string;
  name: string;
  code: string;
}

export const MOCK_STORES: MockStore[] = [
  { id: "store-1", name: "Ankara Çayyolu Migros", code: "AKC-001" },
  { id: "store-2", name: "İstanbul Bağcılar Migros", code: "IST-042" },
  { id: "store-3", name: "İzmir Konak Migros", code: "IZM-015" },
  { id: "store-4", name: "Bursa Nilüfer Migros", code: "BRS-008" },
  { id: "store-5", name: "Adana Yüreğir Migros", code: "ADN-003" },
];

export interface WorkOrderImage {
  id: string;
  name: string;
  url: string;
  transferred_to_store: boolean;
  transferred_at?: string;
}

export interface WorkOrderReport {
  id: string;
  title: string;
  description: string;
  severity: ReportSeverity;
  created_by: string;
  created_by_name: string;
  created_at: string;
  images: WorkOrderImage[];
}

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  store_id: string;
  store_name: string;
  store_code: string;
  assigned_to: string;
  assigned_to_name: string;
  due_date: string | null;
  manager_note: string;
  reports: WorkOrderReport[];
  images: WorkOrderImage[];
  created_at: string;
  updated_at: string;
}

const SEED: WorkOrder[] = [
  {
    id: "wo-1",
    title: "Soğutma Ünitesi Arızası",
    description: "Mağazanın soğutma ünitesi çalışmıyor, acil müdahale gerekiyor. Kompresör arızalı görünüyor.",
    category: "ariza",
    priority: "critical",
    status: "in_progress",
    store_id: "store-1",
    store_name: "Ankara Çayyolu Migros",
    store_code: "AKC-001",
    assigned_to: "user-1",
    assigned_to_name: "Buğra Türkoğlu",
    due_date: "2026-08-10",
    manager_note: "Öncelikli olarak soğutma sistemi kontrol edilmeli. Parça siparişi verildi.",
    reports: [
      {
        id: "rpt-1",
        title: "İlk İnceleme",
        description: "Kompresör arızalı, parça değişimi gerekiyor. Yedek parça temin edildi.",
        severity: "critical",
        created_by: "user-1",
        created_by_name: "Buğra Türkoğlu",
        created_at: "2026-08-07T11:00:00Z",
        images: [
          { id: "img-1", name: "kompressor_on.jpg", url: "", transferred_to_store: false },
          { id: "img-2", name: "ariza_detay.jpg", url: "", transferred_to_store: true, transferred_at: "2026-08-07T14:00:00Z" },
        ],
      },
    ],
    images: [],
    created_at: "2026-08-07T09:00:00Z",
    updated_at: "2026-08-07T11:00:00Z",
  },
  {
    id: "wo-2",
    title: "Tavan Aydınlatma Yenileme",
    description: "Mağaza tavan LED aydınlatmalarının yenilenmesi. Mevcut lambalar ömrünü tamamladı.",
    category: "tadilat",
    priority: "normal",
    status: "planned",
    store_id: "store-2",
    store_name: "İstanbul Bağcılar Migros",
    store_code: "IST-042",
    assigned_to: "user-1",
    assigned_to_name: "Buğra Türkoğlu",
    due_date: "2026-08-20",
    manager_note: "",
    reports: [],
    images: [],
    created_at: "2026-08-08T08:00:00Z",
    updated_at: "2026-08-08T08:00:00Z",
  },
  {
    id: "wo-3",
    title: "Klima Mevsimlik Bakımı",
    description: "Mevsimlik klima bakımı ve filtre değişimi. Tüm klima üniteleri kontrol edilecek.",
    category: "tadilat",
    priority: "important",
    status: "completed",
    store_id: "store-3",
    store_name: "İzmir Konak Migros",
    store_code: "IZM-015",
    assigned_to: "user-1",
    assigned_to_name: "Buğra Türkoğlu",
    due_date: "2026-08-01",
    manager_note: "Bakım tamamlandı. Belgeler mağaza kartına aktarıldı.",
    reports: [
      {
        id: "rpt-2",
        title: "Bakım Tamamlandı",
        description: "Tüm filtreler değiştirildi, sistem optimal çalışıyor.",
        severity: "normal",
        created_by: "user-1",
        created_by_name: "Buğra Türkoğlu",
        created_at: "2026-08-01T15:00:00Z",
        images: [
          { id: "img-3", name: "bakim_sonrasi.jpg", url: "", transferred_to_store: true, transferred_at: "2026-08-02T09:00:00Z" },
        ],
      },
    ],
    images: [],
    created_at: "2026-07-28T08:00:00Z",
    updated_at: "2026-08-01T15:00:00Z",
  },
  {
    id: "wo-4",
    title: "Yeni Şube Mekanik Tesisat Kurulumu",
    description: "Bursa Nilüfer şubesinin sıfırdan mekanik tesisat kurulumu. Klima, sprinkler ve havalandırma dahil.",
    category: "yeni_yapim",
    priority: "important",
    status: "planned",
    store_id: "store-4",
    store_name: "Bursa Nilüfer Migros",
    store_code: "BRS-008",
    assigned_to: "user-1",
    assigned_to_name: "Buğra Türkoğlu",
    due_date: "2026-09-01",
    manager_note: "İnşaat firmasıyla koordineli çalışılacak.",
    reports: [],
    images: [],
    created_at: "2026-08-06T10:00:00Z",
    updated_at: "2026-08-06T10:00:00Z",
  },
];

const STORAGE_KEY = "manager_work_orders_v2";

function load(): WorkOrder[] {
  if (typeof window === "undefined") return [...SEED];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
    return [...SEED];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [...SEED];
  }
}

function save(orders: WorkOrder[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }
}

export function getManagerWorkOrders(): WorkOrder[] {
  return load();
}

// Kullanıcı paneli entegrasyonu için
export function getUserWorkOrders(userId: string): WorkOrder[] {
  return load().filter((wo) => wo.assigned_to === userId && wo.status !== "cancelled");
}

export function getManagerWorkOrderById(id: string): WorkOrder | null {
  return load().find((wo) => wo.id === id) ?? null;
}

export interface CreateWorkOrderPayload {
  title: string;
  description: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  store_id: string;
  store_name: string;
  store_code: string;
  assigned_to: string;
  assigned_to_name: string;
  due_date: string | null;
}

export function createWorkOrder(payload: CreateWorkOrderPayload): WorkOrder {
  const orders = load();
  const wo: WorkOrder = {
    id: crypto.randomUUID(),
    ...payload,
    status: "planned",
    manager_note: "",
    reports: [],
    images: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  save([...orders, wo]);
  // TODO: Audit log — "İş emri oluşturuldu"
  // TODO: Bildirim — atanan kullanıcıya push/email
  return wo;
}

export interface UpdateWorkOrderPayload {
  title?: string;
  description?: string;
  priority?: WorkOrderPriority;
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: string | null;
  manager_note?: string;
  status?: WorkOrderStatus;
}

export function updateWorkOrder(id: string, payload: UpdateWorkOrderPayload): WorkOrder | null {
  const orders = load();
  const idx = orders.findIndex((wo) => wo.id === id);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...payload, updated_at: new Date().toISOString() };
  save(orders);
  // TODO: Audit log — "İş emri güncellendi"
  return orders[idx];
}

export function assignWorkOrder(id: string, userId: string, userName: string): WorkOrder | null {
  return updateWorkOrder(id, { assigned_to: userId, assigned_to_name: userName });
}

export function cancelWorkOrder(id: string): WorkOrder | null {
  const orders = load();
  const idx = orders.findIndex((wo) => wo.id === id);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], status: "cancelled", updated_at: new Date().toISOString() };
  save(orders);
  // TODO: Audit log — "İş emri iptal edildi"
  return orders[idx];
}

export function transferWorkOrderImageToStore(
  workOrderId: string,
  reportId: string,
  imageId: string
): { success: boolean; alreadyTransferred: boolean } {
  const orders = load();
  const idx = orders.findIndex((wo) => wo.id === workOrderId);
  if (idx === -1) return { success: false, alreadyTransferred: false };

  let alreadyTransferred = false;
  let updated = false;

  orders[idx].reports = orders[idx].reports.map((rpt) => {
    if (rpt.id !== reportId) return rpt;
    return {
      ...rpt,
      images: rpt.images.map((img) => {
        if (img.id !== imageId) return img;
        if (img.transferred_to_store) { alreadyTransferred = true; return img; }
        updated = true;
        return { ...img, transferred_to_store: true, transferred_at: new Date().toISOString() };
      }),
    };
  });

  if (updated) {
    orders[idx].updated_at = new Date().toISOString();
    save(orders);
    // TODO: Audit log — "Görsel mağaza kartına aktarıldı"
    // TODO: Mağaza kartı servisi: storeCardService.addImage(storeId, image, source="İş Emri")
  }

  return { success: updated || alreadyTransferred, alreadyTransferred };
}
