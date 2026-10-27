import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "default";
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  size = "default",
  className,
}: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center p-1 rounded-lg bg-muted/60 border border-border/50 select-none",
        size === "sm" ? "min-h-9" : "min-h-11",
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = opt.id === value;
        return (
          <button
            key={opt.id}
            role="tab"
            type="button"
            aria-selected={isSelected}
            onClick={() => onChange(opt.id)}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-3 rounded-lg text-xs font-medium transition-colors duration-200 cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              size === "sm" ? "py-1" : "py-2",
              isSelected
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            {opt.icon && <span className="size-3.5 shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.badge && (
              <span className="px-2 py-1 rounded-full bg-muted text-3xs font-medium text-muted-foreground">
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
