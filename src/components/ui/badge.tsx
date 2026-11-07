import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium tracking-tight tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default:
          "bg-muted text-foreground hover:bg-muted/80",
        secondary:
          "bg-muted text-muted-foreground hover:bg-muted/80",
        destructive:
          "bg-destructive/15 text-destructive hover:bg-destructive/20",
        outline: "bg-muted/60 text-foreground hover:bg-muted",
        /** Informational status (e.g. "Approved", "Processing") */
        info: "bg-info/15 text-info hover:bg-info/20",
        /** Success status (e.g. "Refunded", "Delivered") */
        success: "bg-success/15 text-success hover:bg-success/20",
        /** Warning status (e.g. "Pending review") */
        warning: "bg-warning/15 text-warning-strong hover:bg-warning/20",
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
