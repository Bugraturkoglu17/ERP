import React from "react";
import { Package, Edit2, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Material {
  id: string;
  sku: string;
  name: string;
  unit: string;
  unit_cost: number;
  min_stock_level: number;
}

interface MaterialListProps {
  materials: Material[];
  isSuper: boolean;
  onEdit: (material: Material) => void;
  onDelete: (id: string) => void;
}

export const MaterialList: React.FC<MaterialListProps> = ({
  materials,
  isSuper,
  onEdit,
  onDelete,
}) => {
  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-gray-300 text-center">
        <Package className="w-12 h-12 text-gray-300 mb-2" />
        <p className="text-sm font-medium text-gray-500 italic">Kayıtlı malzeme bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU (Kod)</TableHead>
            <TableHead>Malzeme Tanımı</TableHead>
            <TableHead>Takip Birimi</TableHead>
            <TableHead>Birim Maliyet</TableHead>
            <TableHead>Eşik Seviyesi (Min)</TableHead>
            {isSuper && <th className="p-4 text-center align-middle font-medium text-gray-500">İşlemler</th>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map((m) => (
            <TableRow key={m.id} className="group">
              <TableCell className="font-mono font-bold text-xs text-indigo-700 bg-gray-50/50 group-hover:bg-gray-150/50 transition-colors">
                {m.sku}
              </TableCell>
              <TableCell>
                <div className="font-bold text-gray-800 text-sm">{m.name}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 font-semibold">
                  Sistem ID: {m.id.substring(0, 8)}...
                </div>
              </TableCell>
              <TableCell className="text-xs font-semibold text-gray-650">{m.unit}</TableCell>
              <TableCell className="text-sm font-extrabold text-gray-900">
                ₺{Number(m.unit_cost || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell>
                {m.min_stock_level > 0 ? (
                  <Badge variant="warning">
                    {m.min_stock_level} {m.unit}
                  </Badge>
                ) : (
                  <span className="text-xs font-semibold text-gray-400">Belirtilmemiş</span>
                )}
              </TableCell>
              {isSuper && (
                <TableCell>
                  <div className="flex items-center justify-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(m)}
                      title="Düzenle"
                      className="p-1.5 h-8 w-8"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(m.id)}
                      title="Katalogdan Sil"
                      className="p-1.5 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
