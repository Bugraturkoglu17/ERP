"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "info" | "warning" | "danger" | "secondary" }> = {
  in_progress:   { label: "Devam Ediyor", variant: "success" },
  pending:       { label: "Bekliyor",     variant: "warning" },
  completed:     { label: "Tamamlandı",   variant: "info" },
  cancelled:     { label: "İptal Edildi", variant: "secondary" },
  deleted:       { label: "Silindi",      variant: "danger" },
};

interface ProcessStatusBadgeProps {
  status: string;
  className?: string;
}

export const ProcessStatusBadge: React.FC<ProcessStatusBadgeProps> = ({ status, className }) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: "secondary" as const };
  return (
    <Badge variant={cfg.variant} className={className}>
      {cfg.label}
    </Badge>
  );
};
