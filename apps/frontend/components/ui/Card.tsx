import clsx from "clsx";
import { cn } from "@/lib/utils";

export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

const baseClass =
  "rounded-xl border border-gray-200 bg-white shadow-sm";

export const Card = ({
  className,
  children,
  ...rest
}: BaseProps & Omit<React.HTMLAttributes<HTMLDivElement>, "className">) => (
  <div className={cn(baseClass, className)} {...rest}>
    {children}
  </div>
);

export const CardHeader = ({
  className,
  children,
  ...rest
}: BaseProps & Omit<React.HTMLAttributes<HTMLDivElement>, "className">) => (
  <div
    className={cn("flex items-center justify-between px-5 py-4 border-b border-gray-100", className)}
    {...rest}
  >
    {children}
  </div>
);

export const CardTitle = ({
  className,
  children,
  ...rest
}: BaseProps & Omit<React.HTMLAttributes<HTMLHeadingElement>, "className">) => (
  <h2
    className={cn("text-base font-semibold text-gray-900", className)}
    {...rest}
  >
    {children}
  </h2>
);

export const CardContent = ({
  className,
  children,
  ...rest
}: BaseProps & Omit<React.HTMLAttributes<HTMLDivElement>, "className">) => (
  <div className={cn("px-5 py-4", className)} {...rest}>
    {children}
  </div>
);
