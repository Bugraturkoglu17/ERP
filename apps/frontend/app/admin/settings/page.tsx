"use client";

import { Settings } from "lucide-react";

const SECTIONS = [
  {
    title: "Genel Ayarlar",
    items: [
      { label: "Uygulama Adı", value: "SİSMİK Kurumsal Operasyon Sistemi", editable: false },
      { label: "Tenant Sayısı", value: "—", editable: false },
      { label: "Token Süresi", value: "24 saat", editable: false },
    ],
  },
  {
    title: "Güvenlik",
    items: [
      { label: "Şifre Uzunluğu Minimum", value: "8 karakter", editable: false },
      { label: "Oturum Zaman Aşımı", value: "1440 dk", editable: false },
    ],
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Sistem Ayarları</h1>
        <p className="mt-1 text-sm text-slate-400">Genel konfigürasyon ve güvenlik parametreleri</p>
      </div>

      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">
        Ayar düzenleme Aşama 3'te aktifleştirilecek. Şu an salt-okunur görünüm.
      </div>

      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="rounded-xl bg-slate-800 border border-slate-700/60 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-700/60 bg-slate-900">
              <Settings className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-300">{section.title}</h2>
            </div>
            <dl className="divide-y divide-slate-700/40">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between px-5 py-3">
                  <dt className="text-sm text-slate-400">{item.label}</dt>
                  <dd className="text-sm font-medium text-slate-200">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
