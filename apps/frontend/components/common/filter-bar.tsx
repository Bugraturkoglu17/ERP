import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  options: FilterOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  options,
  selectedValue,
  onChange,
  className,
}) => {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((opt) => {
        const isActive = opt.value === selectedValue;
        return (
          <Button
            key={opt.value}
            variant={isActive ? "primary" : "outline"}
            size="sm"
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
};
