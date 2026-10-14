import * as React from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isSelected?: boolean;
  onRemove?: () => void;
  count?: number;
  icon?: React.ReactNode;
}

export function Chip({
  className,
  isSelected = false,
  onRemove,
  count,
  icon,
  children,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer select-none",
        "min-h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isSelected
          ? "bg-primary text-primary-foreground font-semibold"
          : "bg-muted/70 text-foreground hover:bg-muted border border-border/50",
        className
      )}
      {...props}
    >
      {isSelected && !icon && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={cn(
            "text-3xs px-2 py-1 rounded-full",
            isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-foreground/10 dark:hover:bg-background/10 rounded-full p-1"
          aria-label="Remover filtro"
        >
          <X className="size-3" />
        </span>
      )}
    </button>
  );
}
