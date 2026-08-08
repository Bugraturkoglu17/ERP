"use client";

import { Shield } from "lucide-react";

const ROLES = [
  {
    name: "platform_admin",
    label: "Platform Yöneticisi",
    description: "Firma ve lisans yönetimi, tam sistem erişimi",
    color: "bg-slate-700 text-slate-300",
  },
  {
    name: "admin",
    label: "Admin",
    description: "Kullanıcı yönetimi, rol atama, audit log erişimi",
    color: "bg-indigo-500/20 text-indigo-400",
  },
  {
    name: "manager",
    label: "Yönetici",
    description: "İş emirleri yönetimi, kullanıcı listeleme, raporlama",
    color: "bg-blue-500/20 text-blue-400",
  },
  {
    name: "saha_muhendisi",
    label: "Saha Mühendisi",
    description: "Kendine atanan iş emirlerini görüntüleme ve güncelleme",
    color: "bg-teal-500/20 text-teal-400",
  },
  {
    name: "depo_sorumlusu",
    label: "Depo Sorumlusu",
    description: "Malzeme ve envanter yönetimi",
    color: "bg-amber-500/20 text-amber-400",
  },
  {
    name: "musteri_kullanici",
    label: "Müşteri Kullanıcı",
    description: "Kendi iş emirlerini sadece görüntüleme",
    color: "bg-rose-500/20 text-rose-400",
  },
];

export default function AdminRolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Roller & Yetkiler</h1>
        <p className="mt-1 text-sm text-slate-400">
          Sistemdeki roller ve erişim seviyeleri — DB'den yönetilir (Aşama 3)
        </p>
      </div>

      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">
        Dinamik rol yönetimi Aşama 3'te eklenecek. Şu an roller veritabanında statik olarak tanımlı.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ROLES.map((role) => (
          <div
            key={role.name}
            className="rounded-xl bg-slate-800 border border-slate-700/60 p-5"
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${role.color}`}>
                <Shield className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-200">{role.label}</p>
                </div>
                <p className="text-xs text-slate-500 font-mono mb-2">{role.name}</p>
                <p className="text-sm text-slate-400">{role.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
