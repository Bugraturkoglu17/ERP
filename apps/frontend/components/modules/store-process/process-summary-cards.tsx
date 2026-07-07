"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface SummaryCard {
  label: string;
  value: string | number;
  color: string;
  icon: LucideIcon;
}

interface ProcessSummaryCardsProps {
  cards: SummaryCard[];
}

export const ProcessSummaryCards: React.FC<ProcessSummaryCardsProps> = ({ cards }) => {
  return (
    <div className={`grid gap-3 grid-cols-2 sm:grid-cols-${Math.min(cards.length, 4)} lg:grid-cols-${cards.length}`}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="border-slate-200">
            <CardContent className="p-3 flex items-center gap-2.5">
              <Icon className={`h-4 w-4 shrink-0 ${card.color}`} />
              <div className="min-w-0">
                <p className={`text-sm font-bold ${card.color} truncate`}>{card.value}</p>
                <p className="text-[9px] text-slate-400 leading-tight">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
