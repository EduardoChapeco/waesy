import * as React from "react";
import { cn } from "@/lib/utils";

export interface FrostedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Nível de intensidade do efeito de vidro fosco:
   * - "subtle": leve blur (backdrop-blur-sm), superfície translúcida suave.
   * - "standard": blur clássico Apple HIG (backdrop-blur-md), equilíbrio perfeito de contraste.
   * - "deep": blur pronunciado (backdrop-blur-xl), ideal para elementos flutuantes sobre mídia densa.
   */
  intensity?: "subtle" | "standard" | "deep";
  /**
   * Se verdadeiro, remove a borda perimétrica de 1px.
   */
  borderless?: boolean;
}

/**
 * 🏛️ FrostedCard — Superfície de Vidro Fosco Canônica (Spatial UI & Apple HIG)
 *
 * Características:
 * - Vidro Fosco Calibrado: backdrop-blur adaptativo com fundo translúcido nativo.
 * - Anti-Hardcode: Usa tokens de superfície `bg-card/80` e `border-border/40`.
 * - Sombra Fisiológica: Sombras leves e suaves que não poluem a interface.
 * - Cantos Suaves: Geometria rounded-2xl (squircle) para ergonomia visual.
 */
const FrostedCard = React.forwardRef<HTMLDivElement, FrostedCardProps>(
  ({ className, intensity = "standard", borderless = false, ...props }, ref) => {
    const intensityMap = {
      subtle: "backdrop-blur-sm bg-card/60 dark:bg-card/50",
      standard: "backdrop-blur-md bg-card/80 dark:bg-card/70",
      deep: "backdrop-blur-xl bg-card/90 dark:bg-card/85",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl text-card-foreground shadow-sm transition-all",
          intensityMap[intensity],
          !borderless && "border border-border/40 dark:border-border/30",
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
