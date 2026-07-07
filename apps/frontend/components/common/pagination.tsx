import React from "react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Önceki
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Sonraki
        </Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Toplam <span className="font-medium">{totalCount}</span> kayıttan{" "}
            <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, totalCount)}</span> ile{" "}
            <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> arası gösteriliyor.
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-l-md"
            >
              Önceki
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const isCurrent = p === currentPage;
              return (
                <Button
                  key={p}
                  variant={isCurrent ? "primary" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(p)}
                  className="rounded-none border-x-0"
                >
                  {p}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-r-md"
            >
              Sonraki
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
};
