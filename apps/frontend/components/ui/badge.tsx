import React from "react";
import { tv, type VariantProps } from "tailwind-variants";

const badgeVariants = tv({
  base: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  variants: {
    variant: {
      success: "bg-green-100 text-green-800",
      warning: "bg-yellow-100 text-yellow-800",
      danger: "bg-red-100 text-red-800",
      info: "bg-blue-100 text-blue-800",
      secondary: "bg-gray-100 text-gray-800",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={badgeVariants({ variant, className })} {...props} />;
}
export { badgeVariants };
