"use client";

import { FileText } from "lucide-react";

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-400">Sistem geneli işlem kayıtları</p>
      </div>

      <div className="rounded-xl bg-slate-800 border border-slate-700/60 flex flex-col items-center justify-center py-24 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-700">
          <FileText className="h-7 w-7 text-slate-400" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-200">Audit Log Henüz Hazır Değil</p>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">
            AuditLog modeli ve endpointleri Aşama 3'te backend'e eklenecek.
            Şimdilik bu sayfa hazır bekliyor.
          </p>
        </div>
        <div className="mt-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 text-xs text-indigo-400">
          Bekleyen: <code>AuditLog</code> modeli • <code>GET /audit-logs</code> endpoint
        </div>
      </div>
    </div>
  );
}
