/**
 * apps/frontend/src/components/ui/Toast.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sismik Mekanik ERP — Toast Bildirim Bileşeni
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "success" | "error" | "warning" | "info";

const iconMap: Record<Variant, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5" />,
  error:   <AlertCircle  className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info:    <Info         className="h-5 w-5" />,
};

const variantStyles: Record<Variant, string> = {
  success: "bg-green-50 border-green-200 text-green-800 [&>svg]:text-green-500",
  error:   "bg-red-50   border-red-200   text-red-800   [&>svg]:text-red-500",
  warning: "bg-amber-50 border-amber-200 text-amber-800 [&>svg]:text-amber-500",
  info:    "bg-blue-50  border-blue-200  text-blue-800  [&>svg]:text-blue-500",
};

interface ToastProps {
  id:             string;
  title?:         string;
  description?:   string;
  variant?:       Variant;
  onClose:        (id: string) => void;
}

export function Toast({ id, title, description, variant = "info", onClose }: ToastProps) {
  return (
    <div
      role="alert"
      className={cn(
        "relative flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg",
        "min-w-[300px] max-w-sm",
        "animate-in slide-in-from-right-full duration-300",
        variantStyles[variant],
      )}
    >
      <span className="mt-0.5 shrink-0">{iconMap[variant]}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium text-sm">{title}</p>}
        {description && (
          <p className="text-sm opacity-90 mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="absolute right-2 top-2 rounded-md p-0.5 hover:bg-black/5 transition-colors"
        aria-label="Kapat"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
