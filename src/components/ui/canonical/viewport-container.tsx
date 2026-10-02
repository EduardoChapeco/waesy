import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ============================================================================
 * Waesy Platform — Os 5 Viewports Canônicos Normativos (Fase S31)
 * ============================================================================
 */
export const CANONICAL_VIEWPORTS = {
  mobileSmall: 320,
  mobileModern: 390,
  tablet: 768,
  desktop: 1280,
  ultraWide: 1920,
} as const;

export type CanonicalViewportKey = keyof typeof CANONICAL_VIEWPORTS;

export interface CanonicalViewportMeta {
  key: CanonicalViewportKey;
  width: number;
  label: string;
  category: "compact" | "medium" | "expanded";
  description: string;
}

export const CANONICAL_VIEWPORT_LIST: CanonicalViewportMeta[] = [
  {
    key: "mobileSmall",
    width: CANONICAL_VIEWPORTS.mobileSmall,
    label: "320px",
    category: "compact",
    description: "Mobile Compacto (iPhone SE / Telas Estreitas)",
  },
  {
    key: "mobileModern",
    width: CANONICAL_VIEWPORTS.mobileModern,
    label: "390px",
    category: "compact",
    description: "Mobile Padrão (iPhone 13/14/15 / Galaxy S)",
  },
  {
    key: "tablet",
    width: CANONICAL_VIEWPORTS.tablet,
    label: "768px",
    category: "medium",
    description: "Tablet Vertical (iPad / Foldables)",
  },
  {
    key: "desktop",
    width: CANONICAL_VIEWPORTS.desktop,
    label: "1280px",
    category: "expanded",
    description: "Desktop Padrão (Laptops / FHD)",
  },
  {
    key: "ultraWide",
    width: CANONICAL_VIEWPORTS.ultraWide,
    label: "1920px",
    category: "expanded",
    description: "Ultra-Wide / Monitores Amplos (1080p+)",
  },
];

/**
 * Container Adaptativo com contenção anti-overflow e margens progressivas
 */
export interface AdaptiveViewportContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: React.ElementType;
}

export const AdaptiveViewportContainer = React.forwardRef<
  HTMLDivElement,
  AdaptiveViewportContainerProps
>(({ className, children, as: Component = "div", ...props }, ref) => {
  return (
    <Component
      ref={ref}
      className={cn(
        "w-full overflow-x-hidden mx-auto",
        "px-4 sm:px-6 lg:px-8 pb-16",
        "max-w-7xl",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});
AdaptiveViewportContainer.displayName = "AdaptiveViewportContainer";

/**
 * Bento Grid Canônico adaptativo para dados e dashboards
 */
export interface CanonicalBentoGridProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CanonicalBentoGrid = React.forwardRef<
  HTMLDivElement,
  CanonicalBentoGridProps
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
CanonicalBentoGrid.displayName = "CanonicalBentoGrid";

/**
 * Item dentro do Bento Grid com suporte a spans adaptativos
 */
export interface CanonicalBentoItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  span?: "normal" | "wide" | "tall" | "featured";
}

export const CanonicalBentoItem = React.forwardRef<
  HTMLDivElement,
  CanonicalBentoItemProps
>(({ className, span = "normal", children, ...props }, ref) => {
  const spanClass = React.useMemo(() => {
    switch (span) {
      case "wide":
        return "md:col-span-2";
      case "tall":
        return "md:row-span-2";
      case "featured":
        return "md:col-span-2 lg:col-span-2 xl:col-span-2 md:row-span-2";
      default:
        return "col-span-1";
    }
  }, [span]);

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground p-4 flex flex-col justify-between transition-colors",
        spanClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
CanonicalBentoItem.displayName = "CanonicalBentoItem";

/**
 * Steven Hoober Thumb Zone — Ancoragem ergonômica de ações no terço inferior mobile
 */
export interface CanonicalHooberThumbZoneProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CanonicalHooberThumbZone = React.forwardRef<
  HTMLDivElement,
  CanonicalHooberThumbZoneProps
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "sticky bottom-0 z-30 w-full",
        "bg-card/95 backdrop-blur-md border-t border-border",
        "p-3 sm:p-4",
        "flex items-center justify-between gap-3",
        "safe-area-bottom",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
CanonicalHooberThumbZone.displayName = "CanonicalHooberThumbZone";
