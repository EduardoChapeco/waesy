import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MediaUploader } from "@/components/ui/media-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, Sparkles, Copy, Check, Info } from "lucide-react";
import { getCanonicalDimensions } from "@/lib/crop-image";
import { toast } from "sonner";

export interface BidirectionalMediaUploaderProps {
  mobileUrl?: string | null;
  desktopUrl?: string | null;
  onMobileChange: (url: string) => void;
  onDesktopChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  mobileAspect?: number;
  desktopAspect?: number;
  label?: string;
  description?: string;
  className?: string;
}

export function BidirectionalMediaUploader({
  mobileUrl,
  desktopUrl,
  onMobileChange,
  onDesktopChange,
  bucket = "banners",
  folder = "destaques",
  mobileAspect = 16 / 9,
  desktopAspect = 28 / 9,
  label = "Mídia do Banner / Capa Bidirecional",
  description = "Upload calibrado com corte físico no Canvas para evitar layout drift no mobile e desktop.",
  className = "",
}: BidirectionalMediaUploaderProps) {
  const [activeTab, setActiveTab] = useState<"mobile" | "desktop">("mobile");

  const mobileDims = getCanonicalDimensions(mobileAspect, "mobile");
  const desktopDims = getCanonicalDimensions(desktopAspect, "desktop");

  const handleCopyMobileToDesktop = () => {
    if (!mobileUrl) {
      toast.error("Nenhuma imagem mobile carregada para replicar.");
      return;
    }
    onDesktopChange(mobileUrl);
    toast.success("Imagem mobile copiada para Desktop. Você pode re-enquadrar no botão de recorte.");
  };

  const handleCopyDesktopToMobile = () => {
    if (!desktopUrl) {
      toast.error("Nenhuma imagem desktop carregada para replicar.");
      return;
    }
    onMobileChange(desktopUrl);
    toast.success("Imagem desktop copiada para Mobile. Você pode re-enquadrar no botão de recorte.");
  };

  return (
    <div className={`space-y-3 p-4 rounded-2xl bg-card border border-border/60 ${className}`}>
      {/* ─── Cabeçalho do Bloco Bidirecional ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            {label}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        {/* Status de preenchimento */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={mobileUrl ? "default" : "outline"}
            className="text-2xs px-2 py-1 gap-1 font-semibold"
          >
            <Smartphone className="size-3" />
            Mobile {mobileUrl ? "✓" : "Pendente"}
          </Badge>
          <Badge
            variant={desktopUrl ? "default" : "outline"}
            className="text-2xs px-2 py-1 gap-1 font-semibold"
          >
            <Monitor className="size-3" />
            Desktop {desktopUrl ? "✓" : "Pendente"}
          </Badge>
        </div>
      </div>

      {/* ─── Abas Explícitas de Calibração (Mobile vs Desktop) ─────────── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-3">
        <TabsList className="grid grid-cols-2 w-full min-h-11 h-11 p-1 bg-muted/60 rounded-xl">
          <TabsTrigger
            value="mobile"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg text-xs font-bold gap-2 min-h-9 transition-colors duration-200 cursor-pointer select-none"
          >
            <Smartphone className="size-4" />
            <span>Mobile (&lt; 600px)</span>
          </TabsTrigger>
          <TabsTrigger
            value="desktop"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg text-xs font-bold gap-2 min-h-9 transition-colors duration-200 cursor-pointer select-none"
          >
            <Monitor className="size-4" />
            <span>Desktop (≥ 840px)</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Painel Aba Mobile ───────────────────────────────────────── */}
        <TabsContent value="mobile" className="focus:outline-none space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/40">
            <span className="flex items-center gap-2 font-medium">
              <Info className="size-3.5 text-primary" />
              Saída Física Renderizada:
              <strong className="text-foreground font-mono">
                {mobileDims.width}×{mobileDims.height}px
              </strong>
            </span>
            {desktopUrl && !mobileUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-8 px-3 text-2xs gap-1 font-semibold"
                onClick={handleCopyDesktopToMobile}
              >
                <Copy className="size-3" />
                Copiar do Desktop
              </Button>
            )}
          </div>

          <MediaUploader
            value={mobileUrl ? [mobileUrl] : []}
            onChange={(urls) => onMobileChange(urls[0] || "")}
            bucket={bucket}
            folder={`${folder}/mobile`}
            aspect={mobileAspect}
            targetPlatform="mobile"
            lockAspect={true}
            enableCrop={true}
            maxFiles={1}
            label="Selecione ou Cole a Imagem Mobile (Corte Físico 1080px)"
          />
        </TabsContent>

        {/* ─── Painel Aba Desktop ──────────────────────────────────────── */}
        <TabsContent value="desktop" className="focus:outline-none space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/40">
            <span className="flex items-center gap-2 font-medium">
              <Info className="size-3.5 text-primary" />
              Saída Física Renderizada:
              <strong className="text-foreground font-mono">
                {desktopDims.width}×{desktopDims.height}px
              </strong>
            </span>
            {mobileUrl && !desktopUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-8 px-3 text-2xs gap-1 font-semibold"
                onClick={handleCopyMobileToDesktop}
              >
                <Copy className="size-3" />
                Copiar do Mobile
              </Button>
            )}
          </div>

          <MediaUploader
            value={desktopUrl ? [desktopUrl] : []}
            onChange={(urls) => onDesktopChange(urls[0] || "")}
            bucket={bucket}
            folder={`${folder}/desktop`}
            aspect={desktopAspect}
            targetPlatform="desktop"
            lockAspect={true}
            enableCrop={true}
            maxFiles={1}
            label="Selecione ou Cole a Imagem Desktop (Corte Físico 1920px Widescreen)"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
