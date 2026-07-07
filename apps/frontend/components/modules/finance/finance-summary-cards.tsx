"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CircleDollarSign, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";

interface FinanceSummaryCardsProps {
  totalRevenue: number;
  totalExpenses: number;
  totalPaid: number;
  unpaidInvoices: number;
}

export const FinanceSummaryCards: React.FC<FinanceSummaryCardsProps> = ({
  totalRevenue,
  totalExpenses,
  totalPaid,
  unpaidInvoices,
}) => {
  const netProfit = totalRevenue - totalExpenses;

  const cards = [
    {
      label: "Toplam Fatura",
      value: `₺${totalRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
      icon: CircleDollarSign,
    },
    {
      label: "Net Kâr (Brüt)",
      value: `₺${netProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      color: netProfit >= 0 ? "text-emerald-700" : "text-red-700",
      bg: netProfit >= 0 ? "bg-emerald-50" : "bg-red-50",
      icon: TrendingUp,
    },
    {
      label: "Tahsil Edilen",
      value: `₺${totalPaid.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      color: "text-blue-700",
      bg: "bg-blue-50",
      icon: CheckCircle2,
    },
    {
      label: "Ödenmemiş Fatura",
      value: unpaidInvoices,
      color: unpaidInvoices > 0 ? "text-amber-700" : "text-slate-500",
      bg: unpaidInvoices > 0 ? "bg-amber-50" : "bg-slate-50",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="border-slate-200 hover:shadow-sm transition-shadow">
            <CardContent className="p-5 flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${card.bg} shrink-0`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className={`text-sm font-extrabold ${card.color}`}>{card.value}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
