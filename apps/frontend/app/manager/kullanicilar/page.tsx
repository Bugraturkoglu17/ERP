"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  default_role: string;
  phone?: string;
  discipline?: string;
}

const ROLE_LABEL: Record<string, string> = {
  saha_muhendisi: "Saha Mühendisi",
  depo_sorumlusu: "Depo Sorumlusu",
  musteri_kullanici: "Müşteri",
  manager: "Yönetici",
  admin: "Admin",
};

export default function ManagerKullanicilarPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<UserRow[]>("/auth/users")
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fieldUsers = users.filter((u) =>
    ["saha_muhendisi", "depo_sorumlusu", "musteri_kullanici"].includes(u.default_role)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kullanıcılar</h1>
        <p className="mt-1 text-sm text-slate-500">Saha ve müşteri kullanıcıları</p>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : fieldUsers.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">Henüz kullanıcı yok.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {fieldUsers.map((u) => (
              <li key={u.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  {u.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{u.full_name}</p>
                  <p className="truncate text-xs text-slate-400">{u.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-slate-600">
                    {ROLE_LABEL[u.default_role] ?? u.default_role}
                  </p>
                  <span
                    className={`text-xs ${u.is_active ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    {u.is_active ? "Aktif" : "Pasif"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
