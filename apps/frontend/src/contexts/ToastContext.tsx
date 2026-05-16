/**
 * apps/frontend/src/contexts/ToastContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sismik Mekanik ERP — Toast Bildirim Context
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Toast }                       from "@/components/ui/Toast";

interface Toast {
  id:         string;
  title?:     string;
  description?: string;
  variant:    "success" | "error" | "warning" | "info";
  createdAt:  number;  // ms since epoch — en eskiyi önce kaldır
}

interface ToastContextValue {
  toasts:        Toast[];
  toastSuccess:  (title: string, description?: string) => void;
  toastError:    (title: string, description?: string) => void;
  toastWarning:  (title: string, description?: string) => void;
  toastInfo:     (title: string, description?: string) => void;
  removeToast:   (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 5;     // ekranda aynı anda en fazla 5 toast

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id" | "createdAt">) => {
    setToasts((prev) => {
      const next = [...prev, { ...toast, id: crypto.randomUUID(), createdAt: Date.now() }];
      // Maksimum sayıyı aşmayı engelle — en eskileri çıkar
      return next.length > MAX_TOASTS
        ? next.slice(next.length - MAX_TOASTS)
        : next;
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastSuccess = useCallback(
    (title: string, description?: string) => addToast({ title, description, variant: "success" }),
    [addToast],
  );
  const toastError = useCallback(
    (title: string, description?: string) => addToast({ title, description, variant: "error" }),
    [addToast],
  );
  const toastWarning = useCallback(
    (title: string, description?: string) => addToast({ title, description, variant: "warning" }),
    [addToast],
  );
  const toastInfo = useCallback(
    (title: string, description?: string) => addToast({ title, description, variant: "info" }),
    [addToast],
  );

  return (
    <ToastContext.Provider
      value={{ toasts, toastSuccess, toastError, toastWarning, toastInfo, removeToast }}
    >
      {/* Fixed toaster — sağ alt köşe */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast id={t.id} title={t.title} description={t.description} variant={t.variant} onClose={removeToast} />
          </div>
        ))}
      </div>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast hook, ToastProvider içinde kullanılmalıdır.");
  }
  return ctx;
}
