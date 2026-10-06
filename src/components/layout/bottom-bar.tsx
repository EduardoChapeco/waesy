import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface BottomBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Se true, oculta automaticamente no layout expandido (>=840px).
   * Padrão: true (ações de polegar nativas móveis).
   */
  mobileOnly?: boolean;
}

/**
 * Constante canônica para folga de conteúdo quando a BottomBar estiver ativa.
 * Evita sobreposição de elementos na rolagem da página (DL-24: pb-16).
 */
export const BOTTOM_BAR_CLEARANCE = "pb-16";

/**
 * Primitiva Canônica de Barra Inferior de Ações (BottomBar)
 * Fixada no terço inferior da viewport móvel respeitando safe-area-inset-bottom
 * e garantindo alvos de toque mínimos de 44px (h-11) para o polegar.
 */
export const BottomBar = forwardRef<HTMLDivElement, BottomBarProps>(
  ({ className, mobileOnly = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/80 px-4 py-3 pb-safe transition-colors",
          mobileOnly && "waesy-compact-medium-only",
          className
        )}
        {...props}
      >
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          {children}
        </div>
      </div>
    );
  }
);

BottomBar.displayName = "BottomBar";
