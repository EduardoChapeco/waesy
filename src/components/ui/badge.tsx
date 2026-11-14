import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium tracking-tight tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default:
          "bg-muted text-foreground hover:bg-accent",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent",
        destructive:
          "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-200 dark:border-rose-800",
        outline: "bg-card text-foreground border border-border hover:bg-muted",
        /** Informational status (e.g. "Approved", "Processing") */
        info: "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200 border border-sky-200 dark:border-sky-800",
        /** Success status (e.g. "Refunded", "Delivered") */
        success: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800",
        /** Warning status (e.g. "Pending review") */
        warning: "bg-muted text-warning-strong border border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
 extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
 return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export interface StatusBadgeProps extends BadgeProps {
  status?: string;
}

export function StatusBadge({ status, variant, className, children, ...props }: StatusBadgeProps) {
  let mappedVariant = variant;
  if (!mappedVariant && status) {
    const s = status.toLowerCase();
    if (["open", "confirmed", "active", "won", "paid", "success"].includes(s)) mappedVariant = "success";
    else if (["pending", "analyzing", "quoted", "warning", "planning"].includes(s)) mappedVariant = "warning";
    else if (["closed", "canceled", "cancelled", "lost", "destructive"].includes(s)) mappedVariant = "destructive";
    else mappedVariant = "secondary";
  }
  return (
    <Badge variant={mappedVariant || "default"} className={className} {...props}>
      {children || status}
    </Badge>
  );
}

export { Badge, badgeVariants };
