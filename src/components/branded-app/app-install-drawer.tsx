import React, { useEffect, useState } from "react";
import { Download, Smartphone, Share, PlusSquare, CheckCircle2, RefreshCw, QrCode, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { recordPwaInstallation } from "@/services/pwa.functions";
import { generateQrCodeDataUri } from "@/lib/qr-code";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface AppInstallDrawerProps {
  storeId: string;
  appName: string;
  shortName: string;
  logoUrl?: string | null;
  themeColor: string;
  enablePrompt?: boolean;
  className?: string;
}

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

export function AppInstallDrawer({
  storeId,
  appName,
  shortName,
  logoUrl,
  themeColor,
  enablePrompt = true,
  className,
}: AppInstallDrawerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isInstalledFeedback, setIsInstalledFeedback] = useState(false);
  const [isAutoShown, setIsAutoShown] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  const installShareUrl =
    typeof window !== "undefined" ? window.location.href.split("#")[0] : "";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    setIsStandalone(standalone);
    const platform = detectPlatform();
    setIsIOS(platform === "ios");

    if (standalone) {
      recordPwaInstallation({
        data: {
          storeId,
          eventType: "app_opened",
          platform,
          userAgent: navigator.userAgent,
        },
      }).catch(() => {});
      return;
    }

    const dismissKey = `waesy_app_install_dismiss_${storeId}`;
    const lastDismiss = localStorage.getItem(dismissKey);
    const recentlyDismissed =
      Boolean(lastDismiss) && (Date.now() - Number(lastDismiss)) / (1000 * 60 * 60) < 24;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (enablePrompt && !recentlyDismissed && !isAutoShown) {
        setIsAutoShown(true);
        setDrawerOpen(true);
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
      setIsStandalone(true);
      setIsInstalledFeedback(true);
      setDrawerOpen(false);
      recordPwaInstallation({
        data: {
          storeId,
          eventType: "installed",
          platform,
          userAgent: navigator.userAgent,
        },
      }).catch(() => {});
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    let iosTimer: ReturnType<typeof setTimeout> | null = null;
    if (enablePrompt && !recentlyDismissed && platform === "ios" && !isAutoShown) {
      iosTimer = setTimeout(() => {
        setIsAutoShown(true);
        setDrawerOpen(true);
        recordPwaInstallation({
          data: {
            storeId,
            eventType: "prompt_shown",
            platform: "ios",
            userAgent: navigator.userAgent,
          },
        }).catch(() => {});
      }, 1800);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, [storeId, enablePrompt, isAutoShown]);

  const handleDismiss = () => {
    setDrawerOpen(false);
    const dismissKey = `waesy_app_install_dismiss_${storeId}`;
    localStorage.setItem(dismissKey, String(Date.now()));
    recordPwaInstallation({
      data: {
        storeId,
        eventType: "prompt_dismissed",
        platform: detectPlatform(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      },
    }).catch(() => {});
  };

  const handleInstallAction = async () => {
    const platform = detectPlatform();
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalledFeedback(true);
          setDrawerOpen(false);
          recordPwaInstallation({
            data: {
              storeId,
              eventType: "prompt_accepted",
              platform,
              userAgent: navigator.userAgent,
            },
          }).catch(() => {});
        } else {
          handleDismiss();
        }
      } catch {
        setDrawerOpen(true);
      }
      setDeferredPrompt(null);
      return;
    }

    setDrawerOpen(true);
  };

  if (isStandalone || !enablePrompt) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setDrawerOpen(true)}
        className={cn(
          "h-11 min-h-11 px-3 rounded-full text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0",
          className,
        )}
      >
        <Download className="size-4 shrink-0" />
        <span className="hidden sm:inline">Baixar App</span>
        <span className="sm:hidden">App</span>
      </Button>

      <Sheet
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) handleDismiss();
          else setDrawerOpen(true);
        }}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-t border-border bg-card max-w-lg mx-auto safe-area-bottom pb-8 z-50"
        >
          <SheetHeader className="text-left space-y-2">
            <div className="flex items-center gap-3 pt-2">
              {logoUrl ? (
                <div className="size-14 rounded-2xl border border-border bg-card overflow-hidden shrink-0 flex items-center justify-center">
                  <img src={logoUrl} alt={appName} className="size-full object-contain" />
                </div>
              ) : (
                <div
                  style={{ "--dyn-bg": themeColor } as React.CSSProperties}
                  className="size-14 rounded-2xl waesy-dyn-bg text-neutral-50 flex items-center justify-center font-black text-lg shrink-0"
                >
                  {shortName.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <SheetTitle className="text-base font-extrabold text-foreground truncate">
                  Instalar App {shortName}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {appName} direto na tela inicial do seu aparelho
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-xl bg-muted/40 border border-border/60 p-3 flex items-center gap-2">
                <Smartphone className="size-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground">
                  Acesso em tela cheia com um toque
                </span>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border/60 p-3 flex items-center gap-2">
                <RefreshCw className="size-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground">
                  Catálogo e pedidos atualizados ao vivo
                </span>
              </div>
            </div>

            {isIOS ? (
              <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-3">
                <p className="text-xs font-bold text-foreground">
                  Como instalar no iPhone ou iPad:
                </p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Share className="size-4 text-primary shrink-0" />
                    <span>1. Toque no ícone Compartilhar na barra do navegador Safari.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <PlusSquare className="size-4 text-primary shrink-0" />
                    <span>2. Escolha &quot;Adicionar à Tela de Início&quot; e confirme em Adicionar.</span>
                  </p>
                </div>
              </div>
            ) : !deferredPrompt && !isInstalledFeedback ? (
              <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-2">
                <p className="text-xs font-bold text-foreground">
                  Instalação rápida pelo navegador
                </p>
                <p className="text-xs text-muted-foreground">
                  Abra o menu do seu navegador (três pontos ou ícone da barra de endereços) e toque em
                  &quot;Instalar aplicativo&quot; ou &quot;Adicionar à tela inicial&quot;.
                </p>
              </div>
            ) : null}

            {isInstalledFeedback ? (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-center gap-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Aplicativo instalado com sucesso!</span>
              </div>
            ) : null}

            {/* Kit QR Code & Link Copiável no Drawer de Instalação */}
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <QrCode className="size-4 text-primary" />
                  <span>Abrir em outro celular ou compartilhar</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowQrCode((v) => !v)}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2"
                >
                  {showQrCode ? "Ocultar QR" : "Exibir QR Code"}
                </button>
              </div>
              {showQrCode && installShareUrl && (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="p-3 rounded-xl border border-border bg-background">
                    <img
                      src={generateQrCodeDataUri(installShareUrl)}
                      alt={`QR Code para instalar ${appName}`}
                      className="size-36"
                    />
                  </div>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(installShareUrl);
                    toast.success("Link de instalação copiado!");
                  } catch {
                    toast.error("Não foi possível copiar o link.");
                  }
                }}
                className="w-full h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
              >
                <Copy className="size-4" />
                <span>Copiar Link do Aplicativo</span>
              </Button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleDismiss}
                className="flex-1 h-11 min-h-11 text-xs font-semibold rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Agora não
              </Button>
              {deferredPrompt ? (
                <Button
                  type="button"
                  onClick={handleInstallAction}
                  style={{ "--dyn-bg": themeColor } as React.CSSProperties}
                  className="flex-1 h-11 min-h-11 text-xs font-bold rounded-xl waesy-dyn-bg text-neutral-50 gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Download className="size-4" />
                  <span>Instalar Agora</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleDismiss}
                  className="flex-1 h-11 min-h-11 text-xs font-bold rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Entendi
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
