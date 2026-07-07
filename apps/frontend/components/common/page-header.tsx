import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, className }) => {
  return (
    <div className={cn("md:flex md:items-center md:justify-between pb-5 border-b border-gray-200 mb-6", className)}>
      <div className="min-w-0 flex-1">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {actions && <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">{actions}</div>}
    </div>
  );
};
