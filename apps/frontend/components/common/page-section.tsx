import React from "react";
import { cn } from "@/lib/utils";

interface PageSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export const PageSection: React.FC<PageSectionProps> = ({ className, title, description, children, ...props }) => {
  return (
    <section className={cn("bg-white shadow rounded-lg p-6 mb-6", className)} {...props}>
      {(title || description) && (
        <div className="mb-4 pb-3 border-b border-gray-100">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
};
