"use client";

import { Archive, Search, Upload } from "lucide-react";

export default function GenelArsivPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
            <Archive className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Genel Arşiv</h1>
            <p className="text-xs text-slate-500">
              PDF, DWG, görsel, Excel ve diğer dokümanları tek merkezde yönetin.
            </p>
          </div>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          onClick={() => alert("Dosya yükleme yakında aktif olacak.")}
        >
          <Upload className="h-4 w-4" /> Dosya Yükle
        </button>
      </div>

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
        <input
          type="text"
          placeholder="Dosya adı, kategori veya etiket ara..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Boş durum */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-24 gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <Archive className="h-7 w-7 text-slate-300" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-600">Henüz genel arşive dosya yüklenmemiş.</p>
          <p className="text-xs text-slate-400 mt-1">
            Dosya Yükle butonuyla ilk dosyanızı ekleyebilirsiniz.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          onClick={() => alert("Dosya yükleme yakında aktif olacak.")}
        >
          <Upload className="h-4 w-4" /> Dosya Yükle
        </button>
      </div>
    </div>
  );
}
