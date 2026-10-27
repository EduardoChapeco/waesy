import * as React from "react";
import { useWindowSizeClass, type WindowSizeClass } from "@/hooks/use-mobile";
import { getSafeBuilderHref } from "@/lib/builder/safe-href";

export type BuilderForcedViewport = "desktop" | "mobile" | null;
export type DeviceVisibilityMode = "all" | "mobile_only" | "desktop_only";

export interface EffectiveViewportValue {
  sizeClass: WindowSizeClass;
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isForcedViewport: boolean;
  forcedViewport: BuilderForcedViewport;
  isEditorCanvas: boolean;
}

interface BuilderViewportContextValue {
  forcedViewport: BuilderForcedViewport;
  isEditorCanvas: boolean;
}

const BuilderViewportContext = React.createContext<BuilderViewportContextValue>({
  forcedViewport: null,
  isEditorCanvas: false,
});

export interface BuilderViewportProviderProps {
  viewport: BuilderForcedViewport;
  isEditorCanvas?: boolean;
  children: React.ReactNode;
}

export function BuilderViewportProvider({
  viewport,
  isEditorCanvas = false,
  children,
}: BuilderViewportProviderProps) {
  const value = React.useMemo<BuilderViewportContextValue>(
    () => ({
      forcedViewport: viewport,
      isEditorCanvas,
    }),
    [viewport, isEditorCanvas],
  );

  return (
    <BuilderViewportContext.Provider value={value}>
      {children}
    </BuilderViewportContext.Provider>
  );
}

/**
 * useEffectiveViewport — Resolve a classe de janela real na vitrine publicada
 * ou o viewport forçado no canvas do OmniEditor (Mobile 390px vs Desktop).
 * Respeita estritamente a Invariante B.42 (Zero Dual-DOM).
 */
export function useEffectiveViewport(): EffectiveViewportValue {
  const windowSize = useWindowSizeClass();
  const builderCtx = React.useContext(BuilderViewportContext);

  if (builderCtx.forcedViewport === "mobile") {
    return {
      sizeClass: "compact",
      isCompact: true,
      isMedium: false,
      isExpanded: false,
      isMobile: true,
      isDesktop: false,
      isForcedViewport: true,
      forcedViewport: "mobile",
      isEditorCanvas: builderCtx.isEditorCanvas,
    };
  }

  if (builderCtx.forcedViewport === "desktop") {
    return {
      sizeClass: "expanded",
      isCompact: false,
      isMedium: false,
      isExpanded: true,
      isMobile: false,
      isDesktop: true,
      isForcedViewport: true,
      forcedViewport: "desktop",
      isEditorCanvas: builderCtx.isEditorCanvas,
    };
  }

  const isMobile = windowSize.sizeClass === "compact";
  return {
    sizeClass: windowSize.sizeClass,
    isCompact: windowSize.isCompact,
    isMedium: windowSize.isMedium,
    isExpanded: windowSize.isExpanded,
    isMobile,
    isDesktop: !isMobile,
    isForcedViewport: false,
    forcedViewport: null,
    isEditorCanvas: builderCtx.isEditorCanvas,
  };
}

export function shouldRenderForDevice(
  visibility: DeviceVisibilityMode | undefined,
  isMobile: boolean,
): boolean {
  if (!visibility || visibility === "all") return true;
  if (visibility === "mobile_only") return isMobile;
  if (visibility === "desktop_only") return !isMobile;
  return true;
}

export function resolveBidirectionalMedia(
  media: {
    imageMobileUrl?: string | null;
    imageDesktopUrl?: string | null;
    imageUrl?: string | null;
  },
  isMobile: boolean,
): string {
  const mobile = media.imageMobileUrl?.trim() || "";
  const desktop = media.imageDesktopUrl?.trim() || "";
  const fallback = media.imageUrl?.trim() || "";
  if (isMobile) {
    return mobile || desktop || fallback;
  }
  return desktop || mobile || fallback;
}

export function isVideoAssetUrl(url: string | undefined | null, explicitType?: string): boolean {
  if (explicitType === "video") return true;
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)(?:\?.*)?$/i.test(url.trim());
}

export function resolveSafeLinkHref(rawHref?: string | null): string | undefined {
  if (!rawHref || !rawHref.trim()) return undefined;
  return getSafeBuilderHref(rawHref.trim()) ?? undefined;
}
