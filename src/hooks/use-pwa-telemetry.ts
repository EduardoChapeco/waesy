import { useState, useEffect, useCallback } from "react";
import { recordPwaInstallation } from "@/services/pwa.functions";

export type PwaPlatform = "ios" | "android" | "desktop" | "unknown";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePwaTelemetry(storeId?: string | null) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<PwaPlatform>("unknown");

  // Detecção de plataforma
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent.toLowerCase();
    let detectedPlatform: PwaPlatform = "unknown";

    if (/iphone|ipad|ipod/.test(ua)) {
      detectedPlatform = "ios";
    } else if (/android/.test(ua)) {
      detectedPlatform = "android";
    } else if (/macintosh|windows|linux/.test(ua)) {
      detectedPlatform = "desktop";
    }
    setPlatform(detectedPlatform);

    // Verificar se já está rodando como standalone (PWA instalado)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    setIsInstalled(isStandalone);

    // Se estiver em standalone e for a abertura inicial
    if (isStandalone && storeId) {
      const sessionKey = `waesy_pwa_opened_${storeId}_${new Date().toDateString()}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "1");
        recordPwaInstallation({
          data: {
            storeId,
            eventType: "app_opened",
            platform: detectedPlatform,
            userAgent: navigator.userAgent,
          },
        }).catch(() => {});
      }
    }
  }, [storeId]);

  // Listener nativo do evento beforeinstallprompt
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);

      if (storeId) {
        recordPwaInstallation({
          data: {
            storeId,
            eventType: "prompt_shown",
            platform,
            userAgent: navigator.userAgent,
          },
        }).catch(() => {});
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);

      if (storeId) {
        recordPwaInstallation({
          data: {
            storeId,
            eventType: "installed",
            platform,
            userAgent: navigator.userAgent,
          },
        }).catch(() => {});
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [storeId, platform]);

  // Ação imperativa para abrir o modal nativo de instalação
  const triggerInstallPrompt = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (storeId) {
        recordPwaInstallation({
          data: {
            storeId,
            eventType: choiceResult.outcome === "accepted" ? "prompt_accepted" : "prompt_dismissed",
            platform,
            userAgent: navigator.userAgent,
          },
        }).catch(() => {});
      }

      setDeferredPrompt(null);
      setIsInstallable(false);
      return choiceResult.outcome === "accepted";
    } catch {
      return false;
    }
  }, [deferredPrompt, storeId, platform]);

  return {
    isInstallable,
    isInstalled,
    platform,
    triggerInstallPrompt,
  };
}
