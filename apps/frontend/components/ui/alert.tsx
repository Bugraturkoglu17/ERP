import React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/utils";

const alertVariants = tv({
  base: "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  variants: {
    variant: {
      success: "bg-green-50 text-green-800 border-green-200 [&>svg]:text-green-600",
      info: "bg-blue-50 text-blue-800 border-blue-200 [&>svg]:text-blue-600",
      warning: "bg-yellow-50 text-yellow-800 border-yellow-200 [&>svg]:text-yellow-600",
      danger: "bg-red-50 text-red-800 border-red-200 [&>svg]:text-red-600",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  icon?: React.ReactNode;
}

export function Alert({ className, variant, title, icon, children, ...props }: AlertProps) {
  return (
    <div className={alertVariants({ variant, className })} {...props}>
      {icon && <div className="absolute left-4 top-4">{icon}</div>}
      {title && <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>}
      <div className="text-sm [&_p]:leading-relaxed">{children}</div>
    </div>
  );
}
export { alertVariants };
