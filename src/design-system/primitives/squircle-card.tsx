import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ============================================================================
 * Waesy Platform — SquircleCard & AntiTruncateText Primitives (Apple HIG)
 * ============================================================================
 * Geometria canônica de cantos contínuos Apple HIG com prevenção absoluta
 * de truncamento de texto preguiçoso e suporte a elevação em camadas (Level 0-3).
 * ============================================================================
 */

export interface AppleSquircleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "subtle" | "interactive";
  size?: "default" | "lg" | "compact";
  asChild?: boolean;
}
export type { AppleSquircleCardProps as SquircleCardProps };

export const SquircleCard = React.forwardRef<HTMLDivElement, AppleSquircleCardProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      children,
      tabIndex,
      ...props
    },
    ref
  ) => {
    const isInteractive = variant === "interactive";

    return (
      <div
        ref={ref}
        tabIndex={isInteractive ? tabIndex ?? 0 : tabIndex}
        role={isInteractive ? "button" : undefined}
        className={cn(
          "transition-colors duration-200 duration-200 min-w-0",
          // Curvatura contínua Apple HIG
          size === "compact" && "rounded-xl p-3",
          size === "default" && "rounded-2xl p-4 sm:p-5",
          size === "lg" && "rounded-3xl p-5 sm:p-6",
          // Variantes de superfície e elevação
          variant === "default" && "bg-card border border-border/70 text-card-foreground",
          variant === "elevated" && "bg-card border border-border/80 text-card-foreground shadow-sm",
          variant === "subtle" && "bg-muted/40 border border-border/40 text-card-foreground",
          variant === "interactive" &&
            "cursor-pointer bg-card border border-border/70 text-card-foreground active:scale-[0.98] hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SquircleCard.displayName = "SquircleCard";

export interface AntiTruncateTextProps extends React.HTMLAttributes<HTMLElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
  variant?: "display" | "title" | "subtitle" | "body" | "caption" | "price";
}

export function AntiTruncateText({
  as: Component = "p",
  variant = "body",
  className,
  children,
  ...props
}: AntiTruncateTextProps) {
  return (
    <Component
      className={cn(
        "whitespace-normal break-words leading-tight [overflow-wrap:anywhere]",
        variant === "display" && "text-2xl sm:text-3xl font-bold tracking-tight text-foreground",
        variant === "title" && "text-base sm:text-lg font-semibold tracking-tight text-foreground",
        variant === "subtitle" && "text-sm sm:text-base font-medium text-muted-foreground",
        variant === "body" && "text-sm text-foreground/90 leading-snug",
        variant === "caption" && "text-xs text-muted-foreground leading-normal",
        variant === "price" && "text-base sm:text-lg font-bold font-mono tracking-tight text-foreground tabular-nums",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
