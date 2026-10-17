import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatTileProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export function StatTile({
  label,
  value,
  sublabel,
  trend,
  trendValue,
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border border-border/70 bg-card flex flex-col justify-between gap-2",
        className
      )}
    >
      <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>

      <div className="text-xl font-bold font-mono tabular-nums text-foreground">
        {value}
      </div>

      {(sublabel || trendValue) && (
        <div className="flex items-center gap-2 text-2xs text-muted-foreground">
          {trendValue && (
            <span
              className={cn(
                "font-semibold",
                trend === "up" && "text-emerald-600 dark:text-emerald-400",
                trend === "down" && "text-rose-600 dark:text-rose-400"
              )}
            >
              {trendValue}
            </span>
          )}
          {sublabel && <span>{sublabel}</span>}
        </div>
      )}
    </div>
  );
}

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  label?: string;
}

export function Divider({
  orientation = "horizontal",
  label,
  className,
  ...props
}: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div
        className={cn("w-px h-full bg-border/60 self-stretch", className)}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  if (label) {
    return (
      <div className={cn("flex items-center gap-3 my-4", className)}>
        <div className="flex-1 h-px bg-border/60" />
        <span className="text-2xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        <div className="flex-1 h-px bg-border/60" />
      </div>
    );
  }

  return (
    <hr
      className={cn("border-t border-border/60 my-4", className)}
      {...props}
    />
  );
}
