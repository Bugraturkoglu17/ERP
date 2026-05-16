import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "info" | "danger" | "neutral";

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  success: "bg-green-50 text-green-700 border-green-200 [&>span:first-child]:bg-green-500",
  warning: "bg-amber-50  text-amber-700  border-amber-200  [&>span:first-child]:bg-amber-500",
  info:    "bg-blue-50   text-blue-700   border-blue-200   [&>span:first-child]:bg-blue-500",
  danger:  "bg-red-50    text-red-700    border-red-200    [&>span:first-child]:bg-red-500",
  neutral: "bg-gray-50   text-gray-600   border-gray-200   [&>span:first-child]:bg-gray-400",
};

export function StatusBadge({
  label,
  variant = "neutral",
  dot  = true,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-xs font-semibold tracking-tight",
        variantStyles[variant],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" />}
      {label}
    </span>
  );
}
