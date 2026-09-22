/**
 * travel-promo-flyer-modal.tsx — Modal Interativo para Geração e Exportação de Imagens Promocionais
 * Padrão Story 9:16 / Feed 4:5 | Exportação html2canvas em Alta Resolução | Upload Direto
 */

import React, { useState, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Download,
  ImagePlus,
  RefreshCw,
  Sparkles,
  Layers,
  Palette,
  Check,
  Loader2,
  Share2,
} from "lucide-react";
import { TravelPromoArtboard, type TravelPromoData, type PromoAspectRatio } from "./travel-promo-artboard";
import { uploadClassifiedMedia } from "@/lib/classifieds/upload-classified-media";

interface TravelPromoFlyerModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
  initialData?: {
    title?: string;
    destination?: string;
    datesText?: string | null;
    inclusions?: string[];
    priceCents?: number | null;
    maxInstallments?: number;
    installmentCents?: number | null;
    pricingMode?: "per_person" | "total_package";
    backgroundImageUrl?: string | null;
    promoBadge?: string;
    storeName?: string;
  };
  destinationTitle?: string;
  destinationCity?: string;
  datesText?: string | null;
  inclusions?: string[];
  priceCents?: number | null;
  installments?: number;
  backgroundImageUrl?: string | null;
  storeName?: string;
  onAttachToClassified?: (imageUrl: string) => void;
  onApplyImageToClassified?: (imageUrl: string) => void;
}

export function TravelPromoFlyerModal({
  open,
  onOpenChange,
  isOpen,
  onClose,
  initialData,
  destinationTitle,
  destinationCity,
  datesText: propDatesText,
  inclusions: propInclusions,
  priceCents: propPriceCents,
  installments: propInstallments,
  backgroundImageUrl: propBackgroundImageUrl,
  storeName: propStoreName,
  onAttachToClassified,
  onApplyImageToClassified,
}: TravelPromoFlyerModalProps) {
  const isModalOpen = open !== undefined ? open : (isOpen ?? false);
  const handleModalClose = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    if (!val && onClose) onClose();
  };
  const attachCallback = onAttachToClassified || onApplyImageToClassified;

  const resolvedInitialTitle = destinationTitle || initialData?.title || "João Pessoa";
  const resolvedInitialCity = destinationCity || initialData?.destination || resolvedInitialTitle;
  const resolvedInitialDates = propDatesText !== undefined ? propDatesText : (initialData?.datesText || "Outubro / 2026");
  const resolvedInitialInclusions = propInclusions || initialData?.inclusions || ["Aéreos desde Chapecó", "Hospedagem com café", "Traslados ao aeroporto"];
  const resolvedInitialPrice = propPriceCents !== undefined ? (propPriceCents ?? 278760) : (initialData?.priceCents || 278760);
  const resolvedInitialInstallments = propInstallments || initialData?.maxInstallments || 12;
  const resolvedInitialBg = propBackgroundImageUrl || initialData?.backgroundImageUrl || "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?q=80&w=1600&auto=format&fit=crop";
  const resolvedStoreName = propStoreName || initialData?.storeName || "Waesy Turismo";

  const [aspectRatio, setAspectRatio] = useState<PromoAspectRatio>("9:16");
  const [themeGradient, setThemeGradient] = useState<
    "ocean_blue" | "sunset_amber" | "emerald_nature" | "midnight_luxury" | "caribbean_turquoise" | "nordic_snow"
  >("ocean_blue");
  const [promoBadge, setPromoBadge] = useState<string>(initialData?.promoBadge || "ÚLTIMAS VAGAS");
  const [title, setTitle] = useState(resolvedInitialTitle);
  const [datesText, setDatesText] = useState(resolvedInitialDates || "");
  const [inclusionsText, setInclusionsText] = useState(resolvedInitialInclusions.join(", "));
  const [priceCents, setPriceCents] = useState<number>(resolvedInitialPrice);
  const [maxInstallments, setMaxInstallments] = useState<number>(resolvedInitialInstallments);
  const [bgImageUrl, setBgImageUrl] = useState<string>(resolvedInitialBg);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingToAd, setIsSavingToAd] = useState(false);

  // Sync state when props change
  React.useEffect(() => {
    if (destinationTitle) setTitle(destinationTitle);
  }, [destinationTitle]);

  React.useEffect(() => {
    if (propDatesText !== undefined) setDatesText(propDatesText || "");
  }, [propDatesText]);

  React.useEffect(() => {
    if (propInclusions) setInclusionsText(propInclusions.join(", "));
  }, [propInclusions]);

  React.useEffect(() => {
    if (propPriceCents !== undefined && propPriceCents !== null) setPriceCents(propPriceCents);
  }, [propPriceCents]);

  React.useEffect(() => {
    if (propInstallments) setMaxInstallments(propInstallments);
  }, [propInstallments]);

  React.useEffect(() => {
    if (propBackgroundImageUrl) setBgImageUrl(propBackgroundImageUrl);
  }, [propBackgroundImageUrl]);

  const artboardContainerRef = useRef<HTMLDivElement>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);

  const parsedInclusions = useMemo(() => {
    return inclusionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
  }, [inclusionsText]);

  const promoData: TravelPromoData = {
    title,
    destination: resolvedInitialCity,
    datesText,
    inclusions: parsedInclusions,
    priceCents,
    maxInstallments,
    installmentCents: Math.round(priceCents / (maxInstallments || 1)),
    pricingMode: initialData?.pricingMode || "per_person",
    backgroundImageUrl: bgImageUrl,
    aspectRatio,
    themeGradient,
    promoBadge: promoBadge || undefined,
    storeName: resolvedStoreName,
  };

  // Renderizador offscreen com html2canvas
  const generateBlobFromCanvas = async (): Promise<Blob> => {
    const el = document.getElementById("travel-promo-canvas-artboard");
    if (!el) throw new Error("Elemento de arte não encontrado.");

    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, {
      scale: 2, // Ultra HD export
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#0a192f",
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Falha ao gerar imagem canvas."));
      }, "image/png");
    });
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const blob = await generateBlobFromCanvas();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `story-promo-${title.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Imagem promocional baixada em alta resolução!");
    } catch (err: any) {
      console.error("[TravelPromoFlyerModal] Erro ao baixar:", err);
      toast.error("Erro ao gerar imagem. Verifique conexões com imagens externas.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToClassified = async () => {
    if (!attachCallback) {
      handleDownload();
      return;
    }

    setIsSavingToAd(true);
    try {
      const blob = await generateBlobFromCanvas();
      const file = new File([blob], `promo-${Date.now()}.png`, { type: "image/png" });
      const uploadedUrl = await uploadClassifiedMedia(file, "classifieds");
      attachCallback(uploadedUrl);
      toast.success("Imagem adicionada à galeria do anúncio!");
      handleModalClose(false);
    } catch (err: any) {
      console.error("[TravelPromoFlyerModal] Erro ao salvar no anúncio:", err);
      toast.error("Erro ao anexar imagem ao anúncio.");
    } finally {
      setIsSavingToAd(false);
    }
  };

  const handleCustomImageUploaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setBgImageUrl(event.target.result);
        toast.success("Imagem de fundo atualizada!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Preview responsivo dimensionado proporcionalmente na viewport do modal
  const previewScale = aspectRatio === "9:16" ? 0.32 : aspectRatio === "4:5" ? 0.38 : 0.42;

  return (
    <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl bg-card border border-border/70">
        <DialogHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Sparkles className="size-4.5 text-primary" />
                <span>Gerador de Imagens Promocionais (Story & Feed)</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Artes limpas, minimalistas e com preço por pessoa prontas para Instagram e WhatsApp.
              </DialogDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono font-semibold">
              Ultra Clean 9:16
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 items-start">
          {/* ── Coluna Esquerda: Preview da Arte (Escalado com fidelidade 100%) ── */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center p-4 bg-muted/30 rounded-2xl border border-border/60 overflow-hidden">
            <div
              className="relative overflow-hidden rounded-2xl shadow-xl border border-border/40 bg-[#0a192f]"
              style={{
                width: aspectRatio === "9:16" ? "345px" : aspectRatio === "4:5" ? "410px" : "450px",
                height: aspectRatio === "9:16" ? "614px" : aspectRatio === "4:5" ? "513px" : "450px",
              }}
            >
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                }}
              >
                <TravelPromoArtboard data={promoData} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 font-mono">
              Preview em escala reduzida. Exportação final gerada em Ultra HD (1080x1920px).
            </p>
          </div>

          {/* ── Coluna Direita: Controles e Customizações Rápidas ── */}
          <div className="lg:col-span-6 space-y-4">
            {/* Formato / Proporção */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Formato da Peça</Label>
              <Tabs value={aspectRatio} onValueChange={(v: any) => setAspectRatio(v)} className="w-full">
                <TabsList className="grid grid-cols-3 h-9 rounded-xl bg-muted/60">
                  <TabsTrigger value="9:16" className="text-xs font-semibold">
                    Story (9:16)
                  </TabsTrigger>
                  <TabsTrigger value="4:5" className="text-xs font-semibold">
                    Feed (4:5)
                  </TabsTrigger>
                  <TabsTrigger value="1:1" className="text-xs font-semibold">
                    Quadrado (1:1)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Tema de Cor do Topo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Palette className="size-3.5 text-primary" />
                <span>Gradiente do Topo</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "ocean_blue", label: "Oceano", bg: "bg-blue-900" },
                  { id: "sunset_amber", label: "Pôr do Sol", bg: "bg-amber-900" },
                  { id: "emerald_nature", label: "Natureza", bg: "bg-emerald-900" },
                  { id: "midnight_luxury", label: "Midnight", bg: "bg-slate-950" },
                  { id: "caribbean_turquoise", label: "Caribe", bg: "bg-cyan-900" },
                  { id: "nordic_snow", label: "Neve", bg: "bg-slate-800" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeGradient(t.id as any)}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      themeGradient === t.id
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className={`size-3 rounded-full ${t.bg} shrink-0`} />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tag Promocional de Destaque */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Tag Promocional</span>
                </Label>
                {promoBadge && (
                  <button
                    type="button"
                    onClick={() => setPromoBadge("")}
                    className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    Remover tag
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "ÚLTIMAS VAGAS",
                  "FERIADO CONFIRMADO",
                  "ALL INCLUSIVE",
                  "TARIFA DE GRUPO",
                  "ALTA TEMPORADA",
                  "SUPER PROMO",
                ].map((badge) => (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => setPromoBadge(promoBadge === badge ? "" : badge)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                      promoBadge === badge
                        ? "bg-amber-500 text-black shadow-xs font-black"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {badge}
                  </button>
                ))}
              </div>
            </div>

            {/* Título & Datas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Título Principal</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: João Pessoa"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Linha de Data</Label>
                <Input
                  value={datesText || ""}
                  onChange={(e) => setDatesText(e.target.value)}
                  placeholder="Ex: 23 a 27 de Outubro"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Inclusões (máx 4) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Inclusões (separadas por vírgula)</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {parsedInclusions.length}/4 itens
                </span>
              </div>
              <Input
                value={inclusionsText}
                onChange={(e) => setInclusionsText(e.target.value)}
                placeholder="Aéreos desde Chapecó, Hospedagem com café, Traslados"
                className="h-9 text-xs"
              />
            </div>

            {/* Imagem de Fundo (Troca Manual / Upload) */}
            <div className="space-y-1.5 pt-1 border-t border-border/40">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Imagem de Fundo Realista</span>
                <span className="text-[10px] text-muted-foreground">Destino coerente</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={bgImageUrl}
                  onChange={(e) => setBgImageUrl(e.target.value)}
                  placeholder="URL da imagem..."
                  className="h-9 text-xs font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileUploadInputRef.current?.click()}
                  className="h-9 text-xs gap-1.5 rounded-xl shrink-0 cursor-pointer"
                >
                  <ImagePlus className="size-3.5" />
                  <span>Enviar Foto</span>
                </Button>
                <input
                  ref={fileUploadInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomImageUploaded}
                  className="hidden"
                />
              </div>
            </div>

            {/* Ações de Exportação e Salvar no Anúncio */}
            <div className="pt-4 border-t border-border/50 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                disabled={isExporting}
                className="h-10 text-xs font-semibold gap-1.5 rounded-xl cursor-pointer"
              >
                {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                <span>Baixar Imagem PNG</span>
              </Button>

              {attachCallback && (
                <Button
                  type="button"
                  onClick={handleSaveToClassified}
                  disabled={isSavingToAd}
                  className="h-10 text-xs font-bold gap-1.5 rounded-xl bg-primary text-primary-foreground cursor-pointer shadow-sm"
                >
                  {isSavingToAd ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  <span>Usar no Anúncio</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
