import * as React from "react";

/**
 * ============================================================================
 * Waesy Platform — Window Size Class Engine (DESIGN.md Princípio 6 / Prompt 15)
 * ============================================================================
 * Três classes operacionais canônicas:
 * 1. Compact:  < 600px   (Smartphones / Mobile First)
 * 2. Medium:   600-839px (Tablets portrait / Foldables abertos)
 * 3. Expanded: >= 840px  (Desktops / Laptops / Monitores)
 * ============================================================================
 */

export const COMPACT_MAX_WIDTH = 599;
export const MEDIUM_MIN_WIDTH = 600;
export const MEDIUM_MAX_WIDTH = 839;
export const EXPANDED_MIN_WIDTH = 840;

// Constantes históricas alinhadas aos tokens da doutrina (sem drift 768/1024)
export const MOBILE_BREAKPOINT = 600;
export const DESKTOP_BREAKPOINT = 840;

export type WindowSizeClass = "compact" | "medium" | "expanded";

export interface WindowSizeContextValue {
  sizeClass: WindowSizeClass;
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  width: number;
}

export function getWindowSizeClass(width: number): WindowSizeClass {
  if (width < 600) return "compact";
  if (width < 840) return "medium";
  return "expanded";
}

const WindowSizeContext = React.createContext<WindowSizeContextValue | null>(null);

export function WindowSizeProvider({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = React.useState<number>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth;
    }
    return 1280; // Default SSR fallback = Expanded desktop
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: number | null = null;
    const handleResize = () => {
      // Debounce sutil de 16ms (1 frame @ 60fps) para evitar micro janks
      if (timeoutId) window.cancelAnimationFrame(timeoutId);
      timeoutId = window.requestAnimationFrame(() => {
        setWidth(window.innerWidth);
      });
    };

    window.addEventListener("resize", handleResize, { passive: true });
    setWidth(window.innerWidth);

    return () => {
      if (timeoutId) window.cancelAnimationFrame(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const sizeClass = React.useMemo(() => getWindowSizeClass(width), [width]);
  const isCompact = sizeClass === "compact";
  const isMedium = sizeClass === "medium";
  const isExpanded = sizeClass === "expanded";

  const value = React.useMemo<WindowSizeContextValue>(
    () => ({
      sizeClass,
      isCompact,
      isMedium,
      isExpanded,
      width,
    }),
    [sizeClass, isCompact, isMedium, isExpanded, width]
  );

  return (
    <WindowSizeContext.Provider value={value}>
      {children}
    </WindowSizeContext.Provider>
  );
}

export function useWindowSizeClass(): WindowSizeContextValue {
  const context = React.useContext(WindowSizeContext);
  if (context) {
    return context;
  }

  // Fallback autônomo caso usado fora do WindowSizeProvider
  const [width, setWidth] = React.useState<number>(() => {
    if (typeof window !== "undefined") return window.innerWidth;
    return 1280;
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize, { passive: true });
    setWidth(window.innerWidth);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sizeClass = getWindowSizeClass(width);
  return {
    sizeClass,
    isCompact: sizeClass === "compact",
    isMedium: sizeClass === "medium",
    isExpanded: sizeClass === "expanded",
    width,
  };
}

export function useIsMobile(): boolean {
  const { isCompact } = useWindowSizeClass();
  return isCompact;
}

export function useIsTablet(): boolean {
  const { isMedium } = useWindowSizeClass();
  return isMedium;
}

export function useIsDesktop(customBreakpoint?: number): boolean {
  if (customBreakpoint !== undefined) {
    return useMediaQuery(`(min-width: ${customBreakpoint}px)`);
  }
  const { isExpanded } = useWindowSizeClass();
  return isExpanded;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
