import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* 1. PageHeader                                                              */
/* -------------------------------------------------------------------------- */

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  breadcrumbsSlot?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actionsSlot,
  breadcrumbsSlot,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-3 pb-4 border-b border-border/40", className)}>
      {breadcrumbsSlot && <div>{breadcrumbsSlot}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actionsSlot && (
          <div className="flex items-center gap-2 shrink-0">{actionsSlot}</div>
        )}
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. MetricStrip                                                             */
/* -------------------------------------------------------------------------- */

export interface MetricStripProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function MetricStrip({
  children,
  columns = 4,
  className,
}: MetricStripProps) {
  const colClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return <div className={cn("grid gap-4", colClasses, className)}>{children}</div>;
}

/* -------------------------------------------------------------------------- */
/* 3. FilterSection                                                           */
/* -------------------------------------------------------------------------- */

export interface FilterSectionProps {
  searchSlot?: React.ReactNode;
  chipsSlot?: React.ReactNode;
  viewsSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  className?: string;
}

export function FilterSection({
  searchSlot,
  chipsSlot,
  viewsSlot,
  actionsSlot,
  className,
}: FilterSectionProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-card",
        className
      )}
    >
      <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3 min-w-0">
        {searchSlot && <div className="w-full sm:w-72 shrink-0">{searchSlot}</div>}
        {chipsSlot && <div className="flex-1 min-w-0">{chipsSlot}</div>}
      </div>

      <div className="flex items-center gap-2 shrink-0 justify-end">
        {viewsSlot}
        {actionsSlot}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. EmptySection                                                            */
/* -------------------------------------------------------------------------- */

export interface EmptySectionProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionSlot?: React.ReactNode;
  className?: string;
}

export function EmptySection({
  icon,
  title,
  description,
  actionSlot,
  className,
}: EmptySectionProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-lg border border-dashed border-border/80 bg-muted/10 space-y-3",
        className
      )}
    >
      {icon && (
        <div className="size-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {actionSlot && <div className="pt-2">{actionSlot}</div>}
    </div>
  );
}
