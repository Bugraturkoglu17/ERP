import React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            className={cn(
              "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {label && (
          <div className="ml-3 text-sm">
            <label className="font-medium text-gray-700">{label}</label>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
