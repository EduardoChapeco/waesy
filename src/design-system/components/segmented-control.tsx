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
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  size = "default",
  fullWidth = false,
  className,
}: SegmentedControlProps) {
  const isFull = fullWidth || className?.includes("w-full");
  return (
    <div
      role="tablist"
      className={cn(
        "p-1 rounded-xl bg-muted/50 select-none",
        isFull ? "flex w-full items-center" : "inline-flex items-center",
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
              "items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isFull ? "flex-1 flex" : "inline-flex",
              size === "sm" ? "py-1 min-h-7" : "py-2 min-h-9",
              isSelected
                ? "bg-background text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
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
