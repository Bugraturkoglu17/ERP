import React from "react";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";

interface DataStateProps {
  loading: boolean;
  error: Error | string | null;
  isEmpty: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
}

export const DataState: React.FC<DataStateProps> = ({
  loading,
  error,
  isEmpty,
  emptyTitle = "Veri Bulunamadı",
  emptyDescription = "Gösterilecek herhangi bir veri bulunmuyor.",
  emptyIcon,
  emptyAction,
  children,
}) => {
  if (loading) {
    return (
      <div className="flex h-48 w-full items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : error;
    return (
      <div className="p-4 w-full">
        <Alert variant="danger" title="Hata">
          {message || "Veri yüklenirken bir hata oluştu. Lütfen tekrar deneyin."}
        </Alert>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
        className="w-full"
      />
    );
  }

  return <>{children}</>;
};
