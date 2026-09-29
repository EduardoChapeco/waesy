import * as React from "react";
import { cn } from "@/lib/utils";

export interface FrostedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Nivel de contraste da superficie:
   * - "subtle": superficie suave (bg-muted/40).
   * - "standard": cartao solido padrao (bg-card).
   * - "deep": cartao solido com sombra minima de elevacao (bg-card shadow-sm).
   */
  intensity?: "subtle" | "standard" | "deep";
  /**
   * Se verdadeiro, remove a borda perimétrica de 1px.
   */
  borderless?: boolean;
}

/**
 * FrostedCard — Superficie Canonica de Cartao Silencioso
 *
 * Caracteristicas:
 * - Superficie Solida e Calibrada: elimina efeito de vidro/blur conforme diretriz de silencio visual.
 * - Anti-Hardcode: Usa tokens semanticos `bg-card` e `border-border/70`.
 * - Geometria Canonica: rounded-2xl para ergonomia visual.
 */
const FrostedCard = React.forwardRef<HTMLDivElement, FrostedCardProps>(
  ({ className, intensity = "standard", borderless = false, ...props }, ref) => {
    const intensityMap = {
      subtle: "bg-muted/40",
      standard: "bg-card",
      deep: "bg-card shadow-sm",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl text-card-foreground transition-all",
          intensityMap[intensity],
          !borderless && "border border-border/70",
          className
        )}
        {...props}
      />
    );
  }
);
FrostedCard.displayName = "FrostedCard";

const FrostedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4 sm:p-6", className)}
    {...props}
  />
));
FrostedCardHeader.displayName = "FrostedCardHeader";

const FrostedCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg sm:text-xl font-bold leading-tight tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
FrostedCardTitle.displayName = "FrostedCardTitle";

const FrostedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs sm:text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
FrostedCardDescription.displayName = "FrostedCardDescription";

const FrostedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 sm:p-6 pt-0 sm:pt-0", className)} {...props} />
));
FrostedCardContent.displayName = "FrostedCardContent";

const FrostedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 sm:p-6 pt-0 sm:pt-0", className)}
    {...props}
  />
));
FrostedCardFooter.displayName = "FrostedCardFooter";

export {
  FrostedCard,
  FrostedCardHeader,
  FrostedCardTitle,
  FrostedCardDescription,
  FrostedCardContent,
  FrostedCardFooter,
};
