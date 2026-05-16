/**
 * apps/frontend/src/components/Providers.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sismik Mekanik ERP — Client-side Provider Takısı
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}
