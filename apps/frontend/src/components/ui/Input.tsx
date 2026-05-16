/**
 * apps/frontend/src/components/ui/Input.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sismik Mekanik ERP — Shadcn-uyumlu Girdi Bileşeni (Label + Input)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { InputHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:    string;
  hint?:     string;
  error?:    string;
  icon?:     ReactNode;
}

export function Input({
  label, hint, error, icon, className, id, ...rest
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-gray-700 leading-none"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            "w-full rounded-lg border px-3 py-2.5 text-sm",
            "placeholder:text-gray-400",
            "transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100",
            icon && "pl-10",
            error
              ? "border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:border-red-500"
              : "border-gray-300",
            "focus:outline-none focus-visible:ring-2",
            "focus-visible:ring-blue-500/30 focus-visible:border-blue-500",
            "bg-white",
            className,
          )}
          {...rest}
        />
      </div>
      {hint && !error && (
        <span className="text-xs text-gray-500">{hint}</span>
      )}
      {error && (
        <span className="text-xs text-red-600 font-medium">{error}</span>
      )}
    </div>
  );
}
