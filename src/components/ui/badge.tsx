import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10",
        secondary:
          "bg-muted/60 text-muted-foreground border border-border/50 hover:bg-muted",
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15",
        outline: "bg-transparent text-foreground border border-border hover:bg-muted/30",
        /** Informational status (e.g. "Approved", "Processing") */
        info: "bg-info/10 text-info border border-info/20 hover:bg-info/15",
        /** Success status (e.g. "Refunded", "Delivered") */
        success: "bg-success/10 text-success border border-success/20 hover:bg-success/15",
        /** Warning status (e.g. "Pending review") */
        warning: "bg-warning/10 text-warning border border-warning/20 hover:bg-warning/15",
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
