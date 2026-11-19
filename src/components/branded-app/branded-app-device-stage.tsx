import { useEffect, useMemo, useRef, useState } from "react";
import {
  DeviceMobile as Smartphone,
  Monitor,
  QrCode,
  Copy,
  Check,
  ArrowSquareOut,
  MapPin,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PwaSplashPreview } from "@/components/pwa/PwaSplashPreview";
import { generateQrCodeDataUri } from "@/lib/qr-code";
import { TOKEN_HEX } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { BrandedAppRuntimeBundleDTO } from "@/types/branded-app";

const PREVIEW_READY = "WAESY_APP_PREVIEW_READY";
const PREVIEW_STATE = "WAESY_APP_PREVIEW_STATE";

export interface BrandedAppDeviceStageProps {
  slug: string;
  cacheVersion?: number;
  liveBundle: BrandedAppRuntimeBundleDTO | null;
  previewMode: "app" | "splash";
  onPreviewModeChange: (mode: "app" | "splash") => void;
  previewDevice: "mobile" | "desktop";
  onPreviewDeviceChange: (device: "mobile" | "desktop") => void;
  activeTabId?: string;
  appUrl: string;
  customDomainStatus?: string | null;
  cityTargetingEnabled?: boolean;
}

export function BrandedAppDeviceStage({
  slug,
  cacheVersion = 1,
  liveBundle,
  previewMode,
  onPreviewModeChange,
  previewDevice,
  onPreviewDeviceChange,
  activeTabId,
  appUrl,
  customDomainStatus,
  cityTargetingEnabled,
}: BrandedAppDeviceStageProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [previewCity, setPreviewCity] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const previewUrl = useMemo(() => {
    const clean = encodeURIComponent(String(slug || "app").trim() || "app");
    return `/app/preview/${clean}`;
  }, [slug]);

  const sendStateToIframe = () => {
    if (typeof window === "undefined") return;
    const targetWindow = iframeRef.current?.contentWindow;
    if (!targetWindow || !liveBundle) return;
    try {
      targetWindow.postMessage(
        {
          type: PREVIEW_STATE,
          payload: {
            bundle: liveBundle,
            activeTabId: activeTabId || undefined,
            activeCity: previewCity.trim() || null,
          },
        },
        window.location.origin,
      );
    } catch {
      // Ignora erro antes da hidratação do iframe
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === PREVIEW_READY) {
        setIframeReady(true);
        sendStateToIframe();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [liveBundle, activeTabId, previewCity]);

  useEffect(() => {
    if (!iframeReady) return;
    sendStateToIframe();
  }, [iframeReady, liveBundle, activeTabId, previewCity]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      toast.success("Link oficial do app copiado!");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Smartphone className="size-4 text-primary" weight="bold" />
          <h3 className="text-xs font-extrabold text-foreground">
            Palco Isolado ao Vivo
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {customDomainStatus === "active" && (
            <Badge variant="secondary" className="text-xs">
              Domínio Próprio
            </Badge>
          )}
          <Badge variant="outline">v{cacheVersion}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => onPreviewModeChange("app")}
            className={cn(
              "h-11 min-h-11 px-3 rounded-lg text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              previewMode === "app"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            App Ao Vivo
          </button>
          <button
            type="button"
            onClick={() => onPreviewModeChange("splash")}
            className={cn(
              "h-11 min-h-11 px-3 rounded-lg text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              previewMode === "splash"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Abertura
          </button>
        </div>

        {previewMode === "app" && (
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => onPreviewDeviceChange("mobile")}
              aria-label="Visualizar como celular"
              className={cn(
                "size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                previewDevice === "mobile"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Smartphone className="size-4" weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => onPreviewDeviceChange("desktop")}
              aria-label="Visualizar em tela larga"
              className={cn(
                "size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                previewDevice === "desktop"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Monitor className="size-4" weight="bold" />
            </button>
          </div>
        )}
      </div>

      {cityTargetingEnabled && previewMode === "app" && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2">
          <MapPin className="size-4 text-primary shrink-0" weight="bold" />
          <Input
            value={previewCity}
            onChange={(e) => setPreviewCity(e.target.value)}
            placeholder="Simular cidade do visitante (ex: Chapecó)"
            className="h-9 border-0 bg-transparent px-0 text-xs focus-visible:ring-0"
          />
        </div>
      )}

      {previewMode === "splash" ? (
        <div className="aspect-9/16 max-w-64 mx-auto rounded-2xl border-4 border-foreground/80 overflow-hidden bg-background">
          <PwaSplashPreview
            appName={liveBundle?.appConfig?.app_name || "Meu App"}
            shortName={liveBundle?.appConfig?.short_name || "App"}
            themeColor={liveBundle?.appConfig?.theme_color || TOKEN_HEX.neutral900}
            backgroundColor={liveBundle?.appConfig?.background_color || TOKEN_HEX.white}
            iconUrl={liveBundle?.appConfig?.logo_square_url || liveBundle?.store?.logo_url || null}
            splashImageUrl={liveBundle?.appConfig?.splash_image_url || liveBundle?.appConfig?.logo_square_url || null}
            animationType={
              liveBundle?.appConfig?.entry_animation === "slide_up" ||
              liveBundle?.appConfig?.entry_animation === "none"
                ? "fade"
                : liveBundle?.appConfig?.entry_animation || "pulse"
            }
          />
        </div>
      ) : (
        <div
          className={cn(
            "mx-auto rounded-3xl border-4 border-foreground/20 overflow-hidden bg-background transition-colors",
            previewDevice === "mobile" ? "w-full max-w-96" : "w-full",
          )}
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            title={`Prévia isolada do app ${liveBundle?.appConfig?.app_name || slug}`}
            onLoad={() => sendStateToIframe()}
            className="w-full h-144 border-0 bg-background block"
          />
        </div>
      )}

      {/* Kit Rápido de Compartilhamento & QR Code */}
      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-foreground truncate">{appUrl}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyUrl}
            className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
          >
            {copied ? <Check className="size-4" weight="bold" /> : <Copy className="size-4" weight="bold" />}
            <span>{copied ? "Copiado" : "Copiar"}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setQrOpen(true)}
            className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
          >
            <QrCode className="size-4" weight="bold" />
            <span>QR Code</span>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2"
          >
            <a href={appUrl} target="_blank" rel="noopener noreferrer">
              <ArrowSquareOut className="size-4" weight="bold" />
              <span>Abrir</span>
            </a>
          </Button>
        </div>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">
              QR Code do Aplicativo Oficial
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Aponte a câmera ou imprima para instalação direta no balcão, vitrine ou cartões.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="p-3 rounded-2xl border border-border bg-background">
              <img
                src={generateQrCodeDataUri(appUrl)}
                alt={`QR Code para instalar ${appUrl}`}
                className="size-48"
              />
            </div>
            <p className="text-xs font-mono text-muted-foreground text-center break-all">
              {appUrl}
            </p>
            <Button
              type="button"
              variant="default"
              onClick={handleCopyUrl}
              className="w-full h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
            >
              <Copy className="size-4" weight="bold" />
              <span>Copiar Link Oficial</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
