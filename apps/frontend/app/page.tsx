"use client";

import Link from "next/link";

const modules = [
  {
    title:   "Proje & Şantiye Yönetimi",
    desc:    "Müşteri → Bölge → Şube → Proje hiyerarşisi ile dijital proje kartları, kanban, Gantt ve takım atamaları.",
    icon:    "🏗️",
    badge:   "Core",
    color:   "from-blue-500 to-indigo-600",
  },
  {
    title:   "Doküman & Çizim Yönetimi",
    desc:    "Bulut depolama ile AutoCAD/Revit dosyalarının versiyon takibi, proje klasörleme ve mobil önizleme.",
    icon:    "📁",
    badge:   "Arşiv",
    color:   "from-emerald-500 to-teal-600",
  },
  {
    title:   "Depo & Envanter Kontrolü",
    desc:    "Merkez + şantiye depoları, stok hareketleri, kritik stok uyarıları ve otomatik transfer fişleri.",
    icon:    "📦",
    badge:   "Stok",
    color:   "from-amber-500 to-orange-600",
  },
  {
    title:   "Finans & Hakediş",
    desc:    "Zincir marketler için aylık icmallar, proje bazlı karlılık raporları ve vade takibi.",
    icon:    "💰",
    badge:   "Finans",
    color:   "from-rose-500 to-pink-600",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid place-content-center h-9 w-9 rounded-lg bg-blue-600 text-white text-lg font-bold">
              S
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">
              Sismik<span className="text-blue-600">Mekanik</span>
            </span>
            <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-200">
              ERP v0.1
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Hemen Başla
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                        bg-blue-50 text-blue-700 text-xs font-semibold tracking-wide
                        border border-blue-200 mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          Şantiye ERP Çözümü — Beta Sürümü
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight max-w-4xl mx-auto">
          Mekanik Tesisat, Sismik Koruma &amp;{" "}
          <span className="text-blue-600">Yangın Söndürme</span>
          <br />Sektörü İçin Tümleşik ERP
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Kağıt süreçleri bırakın. Proje kartlarından stok takibine, hakedişten
          karlılık raporlarına — tüm operasyonunuz tek panelde.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="btn-primary text-base px-6 py-3 shadow-lg shadow-blue-600/30"
          >
            Giriş Yap →
          </Link>
          <a
            href="#moduller"
            className="btn-secondary text-base px-6 py-3"
          >
            Modülleri Keşfet
          </a>
        </div>
      </main>

      {/* ── Module Cards ─────────────────────────────────────────────────── */}
      <section id="moduller" className="max-w-7xl mx-auto px-6 pb-32">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
            Modüller
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            Her departmanın ihtiyacını karşılıyor
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((m) => (
            <div
              key={m.title}
              className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-6
                         shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{m.icon}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                                 bg-gradient-to-r ${m.color} text-white`}>
                  {m.badge}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{m.title}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
