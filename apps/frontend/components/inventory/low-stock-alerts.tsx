import React from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StockItem {
  material_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  min_stock_level: number;
  warehouse_name?: string;
}

interface LowStockAlertsProps {
  stockItems: StockItem[];
}

export const LowStockAlerts: React.FC<LowStockAlertsProps> = ({ stockItems }) => {
  const lowStockItems = stockItems.filter(
    (item) => item.quantity <= (item.min_stock_level || 0) && item.min_stock_level > 0
  );

  if (lowStockItems.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900">Tüm Stoklar Güvenli Seviyede</h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              Bu depoda kritik limitin altına düşen herhangi bir malzeme bulunmamaktadır.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3 border-b border-amber-200/50 pb-2">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900">Kritik Stok Uyarısı</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Aşağıdaki malzemeler belirlenen minimum güvenlik sınırının altına düşmüştür:
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="bg-transparent">
            <TableHeader className="bg-transparent border-b border-amber-200/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-amber-800 font-bold h-8 py-1">Malzeme</TableHead>
                <TableHead className="text-amber-800 font-bold h-8 py-1">SKU</TableHead>
                <TableHead className="text-amber-800 font-bold h-8 py-1 text-right">Mevcut</TableHead>
                <TableHead className="text-amber-800 font-bold h-8 py-1 text-right">Eşik Seviyesi</TableHead>
                <TableHead className="text-amber-800 font-bold h-8 py-1 text-center">Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockItems.map((item) => (
                <TableRow key={item.material_id} className="hover:bg-amber-100/20 border-b border-amber-200/20">
                  <TableCell className="py-2 text-sm font-medium text-slate-800">{item.name}</TableCell>
                  <TableCell className="py-2 font-mono text-xs text-amber-900 font-bold">{item.sku}</TableCell>
                  <TableCell className="py-2 text-right font-bold text-red-650 text-sm">
                    {item.quantity.toLocaleString("tr-TR")} <span className="text-xs font-semibold text-slate-500">{item.unit}</span>
                  </TableCell>
                  <TableCell className="py-2 text-right font-bold text-slate-700 text-sm">
                    {item.min_stock_level.toLocaleString("tr-TR")} <span className="text-xs font-semibold text-slate-500">{item.unit}</span>
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    <Badge variant="danger" className="w-fit mx-auto">
                      Kritik Seviye
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
