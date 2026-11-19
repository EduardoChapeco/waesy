import React, { useEffect, useState } from "react";
import type { AppEntryAnimation } from "@/types/branded-app";
import { cn } from "@/lib/utils";

export interface AppSplashScreenProps {
  storeId: string;
  appName: string;
  shortName: string;
  logoUrl?: string | null;
  themeColor: string;
  backgroundColor: string;
  entryAnimation: AppEntryAnimation;
}

export function AppSplashScreen({
  storeId,
  appName,
  shortName,
  logoUrl,
  themeColor,
  backgroundColor,
  entryAnimation,
}: AppSplashScreenProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (entryAnimation === "none") return;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReducedMotion) return;

    const sessionKey = `waesy_app_splash_${storeId}`;
    if (sessionStorage.getItem(sessionKey)) return;

    sessionStorage.setItem(sessionKey, "1");
    setVisible(true);

    const exitTimer = setTimeout(() => setExiting(true), 780);
    const hideTimer = setTimeout(() => setVisible(false), 1080);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, [storeId, entryAnimation]);

  if (!visible) return null;

  const iconMotionClass =
    entryAnimation === "bounce"
      ? "animate-bounce motion-reduce:animate-none"
      : entryAnimation === "pulse"
        ? "animate-pulse motion-reduce:animate-none"
        : entryAnimation === "slide_up"
          ? "translate-y-0 transition-transform duration-300"
          : "transition-opacity duration-300";

  return (
    <div
      role="status"
      aria-label={`Abrindo aplicativo ${appName}`}
      style={{ "--dyn-bg": backgroundColor } as React.CSSProperties}
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center px-6 waesy-dyn-bg transition-opacity duration-300 motion-reduce:hidden",
        exiting ? "opacity-0 pointer-events-none" : "opacity-100",
      )}
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        {logoUrl ? (
          <div
            className={cn(
              "size-24 rounded-2xl overflow-hidden border border-border bg-card flex items-center justify-center",
              iconMotionClass,
            )}
          >
            <img src={logoUrl} alt={appName} className="size-full object-contain" />
          </div>
        ) : (
          <div
            style={{ "--dyn-bg": themeColor } as React.CSSProperties}
            className={cn(
              "size-24 rounded-2xl waesy-dyn-bg text-neutral-50 flex items-center justify-center font-black text-3xl border border-border",
              iconMotionClass,
            )}
          >
            {shortName.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="space-y-1">
          <p className="text-lg font-extrabold tracking-tight text-foreground">{appName}</p>
          <p className="text-xs text-muted-foreground">Sincronizando catálogo oficial...</p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <span
            style={{ "--dyn-bg": themeColor } as React.CSSProperties}
            className="size-2 rounded-full waesy-dyn-bg animate-pulse motion-reduce:animate-none"
          />
          <span
            style={{ "--dyn-bg": themeColor } as React.CSSProperties}
            className="size-2 rounded-full waesy-dyn-bg animate-pulse motion-reduce:animate-none opacity-75"
          />
          <span
            style={{ "--dyn-bg": themeColor } as React.CSSProperties}
            className="size-2 rounded-full waesy-dyn-bg animate-pulse motion-reduce:animate-none opacity-50"
          />
        </div>
      </div>
    </div>
  );
}
