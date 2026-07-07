"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FolderTree, CheckCircle, Clock, Briefcase, TrendingUp } from "lucide-react";

interface ProjectSummaryCardsProps {
  total: number;
  inProgress: number;
  completed: number;
  contractSum: number;
}

export const ProjectSummaryCards: React.FC<ProjectSummaryCardsProps> = ({
  total,
  inProgress,
  completed,
  contractSum,
}) => {
  const cards = [
    { label: "Toplam Proje",   value: total,      color: "text-indigo-700",  icon: FolderTree  },
    { label: "Aktif Proje",    value: inProgress, color: "text-blue-700",    icon: Clock       },
    { label: "Tamamlanan",     value: completed,  color: "text-emerald-700", icon: CheckCircle },
    {
      label: "Toplam Sözleşme",
      value: `₺${Number(contractSum).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`,
      color: "text-amber-700",
      icon: TrendingUp
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-slate-50 ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-lg font-extrabold ${card.color}`}>{card.value}</p>
                <p className="text-[10px] text-slate-400 font-medium">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
