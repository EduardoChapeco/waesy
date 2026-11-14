import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const dsBadgeVariants = cva(
  "inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium tracking-tight whitespace-nowrap select-none transition-colors",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground border border-border",
        primary: "bg-secondary text-foreground border border-border",
        success: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800",
        warning: "bg-muted text-warning-strong border border-border",
        danger: "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-200 dark:border-rose-800",
        info: "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200 border border-sky-200 dark:border-sky-800",
        ai: "bg-muted text-foreground border border-border",
      },
      size: {
        default: "text-xs px-2 py-1",
        sm: "text-2xs px-2 py-1",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "default",
    },
  }
);

export interface DSBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof dsBadgeVariants> {
  withDot?: boolean;
}

export function Badge({
  className,
  variant,
  size,
  withDot = false,
  children,
  ...props
}: DSBadgeProps) {
  const dotColorClasses: Record<string, string> = {
    neutral: "bg-muted-foreground",
    primary: "bg-primary",
    success: "bg-emerald-600 dark:bg-emerald-400",
    warning: "bg-warning ",
    danger: "bg-rose-600 dark:bg-rose-400",
    info: "bg-sky-600 dark:bg-sky-400",
    ai: "bg-purple-600 dark:bg-purple-400",
  };

  const activeDotClass = dotColorClasses[variant ?? "neutral"] || "bg-muted-foreground";

  return (
    <span className={cn(dsBadgeVariants({ variant, size }), className)} {...props}>
      {withDot && (
        <span
          className={cn("size-1.5 rounded-full shrink-0", activeDotClass)}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export interface DSStatusBadgeProps {
  status: "active" | "pending" | "completed" | "cancelled" | "danger" | "draft" | "review";
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: DSStatusBadgeProps) {
  const statusConfig = {
    active: { variant: "success" as const, defaultLabel: "Ativo" },
    completed: { variant: "success" as const, defaultLabel: "Concluído" },
    pending: { variant: "warning" as const, defaultLabel: "Pendente" },
    review: { variant: "warning" as const, defaultLabel: "Em Revisão" },
    cancelled: { variant: "neutral" as const, defaultLabel: "Cancelado" },
    draft: { variant: "neutral" as const, defaultLabel: "Rascunho" },
    danger: { variant: "danger" as const, defaultLabel: "Crítico" },
  }[status];

  return (
    <Badge
      variant={statusConfig.variant}
      withDot
      className={className}
    >
      {label ?? statusConfig.defaultLabel}
    </Badge>
  );
}
