"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ClipboardList, Shield, Activity, ArrowRight } from "lucide-react";
import { apiGet } from "@/lib/api";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  default_role: string;
}

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<UserRow[]>("/auth/users")
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeUsers = users.filter((u) => u.is_active).length;

  const cards = [
    { label: "Toplam Kullanıcı", value: loading ? "…" : users.length, icon: Users, color: "bg-indigo-500" },
    { label: "Aktif Kullanıcı", value: loading ? "…" : activeUsers, icon: Activity, color: "bg-emerald-500" },
    { label: "Rol Sayısı", value: "—", icon: Shield, color: "bg-violet-500" },
    { label: "İş Emri", value: "—", icon: ClipboardList, color: "bg-blue-500" },
  ];

  const shortcuts = [
    { label: "Yeni Kullanıcı Ekle", href: "/admin/users/new" },
    { label: "Rol Yönetimi", href: "/admin/roles" },
    { label: "Sistem Ayarları", href: "/admin/settings" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Sistem geneli özet görünümü</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-slate-800 border border-slate-700/60 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-400">{label}</span>
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hızlı Erişim */}
        <div className="rounded-xl bg-slate-800 border border-slate-700/60 p-6">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Hızlı Erişim</h2>
          <div className="grid grid-cols-2 gap-2">
            {shortcuts.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 hover:border-indigo-500 hover:text-indigo-400 transition-colors group"
              >
                <span>{label}</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>

        {/* Son Kullanıcılar */}
        <div className="rounded-xl bg-slate-800 border border-slate-700/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Son Kullanıcılar</h2>
            <Link href="/admin/users" className="text-xs text-indigo-400 hover:text-indigo-300">
              Tümünü gör →
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Henüz kullanıcı yok.</p>
          ) : (
            <ul className="space-y-2">
              {users.slice(0, 5).map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-semibold">
                      {u.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">{u.full_name}</p>
                      <p className="truncate text-xs text-slate-500">{u.email}</p>
                    </div>
                    <span
                      className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {u.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
