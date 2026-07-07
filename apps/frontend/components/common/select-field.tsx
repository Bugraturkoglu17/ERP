"use client";

import React from "react";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  required?: boolean;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, hint, options, required, className, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <Select
          ref={ref}
          options={options}
          className={cn(error && "border-red-400 focus:ring-red-400", className)}
          {...props}
        />
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {hint && !error && <p className="text-[10px] text-slate-400">{hint}</p>}
      </div>
    );
  }
);

SelectField.displayName = "SelectField";
