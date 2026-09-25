/**
 * travel-promo-flyer-modal.tsx — Estúdio Imersivo para Geração e Exportação de Imagens Promocionais
 * Arquitetura Split-Screen Fullscreen | Resolução Definitiva de CORS | Auto-Binding de Anúncio
 * Em conformidade estrita com Master Prompt V32 e AGENTS.md (Design Silencioso)
 */

import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Download,
  ImagePlus,
  Sparkles,
  Palette,
  Check,
  Loader2,
  ArrowLeft,
  Sliders,
  Type,
  ImageIcon,
  ShieldCheck,
  Maximize2,
  RefreshCw,
  Dices,
} from "lucide-react";
import { TravelPromoArtboard, type TravelPromoData, type PromoAspectRatio } from "./travel-promo-artboard";
import { uploadClassifiedMedia } from "@/lib/classifieds/upload-classified-media";
import { convertToCorsSafeDataUri, preloadImage } from "@/lib/canvas/cors-safe-image";
import { formatMoney } from "@/lib/money";
import {
  getAllSocialTemplates,
  getDefaultTemplateForNiche,
  getNextTemplateInNiche,
  getDynamicCTAsForNiche,
  getNextCTAOption,
} from "@/components/social-templates";

export interface TravelPromoFlyerModalProps {
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
    templateId?: string;
    niche?: string;
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

  // Auto-binding prioritário dos dados do anúncio aberto
  const resolvedInitialTitle = destinationTitle || initialData?.title || "Destino Especial";
  const resolvedInitialCity = destinationCity || initialData?.destination || resolvedInitialTitle;
  const resolvedInitialDates = propDatesText !== undefined ? propDatesText : (initialData?.datesText || "Temporada 2026/2027");
  const resolvedInitialInclusions = propInclusions || initialData?.inclusions || [
    "Aéreo ida e volta",
    "Hospedagem com café",
    "Traslados inclusos",
  ];
  const resolvedInitialPrice = propPriceCents !== undefined && propPriceCents !== null
    ? propPriceCents
    : (initialData?.priceCents || 249000);
  const resolvedInitialInstallments = propInstallments || initialData?.maxInstallments || 12;
  const resolvedInitialBg = propBackgroundImageUrl || initialData?.backgroundImageUrl || "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?q=80&w=1600&auto=format&fit=crop";
  const resolvedStoreName = propStoreName || initialData?.storeName || "Waesy Turismo";

  // Estados de edição do Flyer
  const [templateId, setTemplateId] = useState<string>(
    () => initialData?.templateId || getDefaultTemplateForNiche(initialData?.niche).id
  );
  const [aspectRatio, setAspectRatio] = useState<PromoAspectRatio>("9:16");

  // Motor Dinâmico de CTAs
  const availableCTAs = useMemo(() => {
    return getDynamicCTAsForNiche(initialData?.niche || (templateId.startsWith("imoveis") ? "imoveis" : "turismo"));
  }, [initialData?.niche, templateId]);

  const [ctaLabel, setCtaLabel] = useState<string>(() => availableCTAs[0] || "Agendar Visita");

  const handleShuffleLayout = () => {
    const next = getNextTemplateInNiche(templateId, initialData?.niche);
    setTemplateId(next.id);
    toast.info(`Layout alternado para: ${next.name}`);
  };

  const handleCycleCTA = () => {
    const next = getNextCTAOption(ctaLabel, initialData?.niche || (templateId.startsWith("imoveis") ? "imoveis" : "turismo"));
    setCtaLabel(next);
    toast.success(`CTA alterado para: "${next}"`);
  };
  const [themeGradient, setThemeGradient] = useState<
    "ocean_blue" | "sunset_amber" | "emerald_nature" | "midnight_luxury" | "caribbean_turquoise" | "nordic_snow"
  >("ocean_blue");
  const [promoBadge, setPromoBadge] = useState<string>(initialData?.promoBadge || "ÚLTIMAS VAGAS");
  const [title, setTitle] = useState(resolvedInitialTitle);
  const [destination, setDestination] = useState(resolvedInitialCity);
  const [datesText, setDatesText] = useState(resolvedInitialDates || "");
  const [inclusionsText, setInclusionsText] = useState(resolvedInitialInclusions.join(", "));
  const [priceCents, setPriceCents] = useState<number>(resolvedInitialPrice);
  const [maxInstallments, setMaxInstallments] = useState<number>(resolvedInitialInstallments);
  const [pricingMode, setPricingMode] = useState<"per_person" | "total_package">(initialData?.pricingMode || "per_person");
  const [storeNameValue, setStoreNameValue] = useState(resolvedStoreName);
  const [bgImageUrl, setBgImageUrl] = useState<string>(resolvedInitialBg);

  // Estados de segurança CORS e conversão para Data URI
  const [safeBgDataUri, setSafeBgDataUri] = useState<string>(resolvedInitialBg);
  const [isConvertingImage, setIsConvertingImage] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSavingToAd, setIsSavingToAd] = useState<boolean>(false);

  // Controle de layout e visualização responsiva da viewport de arte
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 600, height: 700 });
  const [activeTab, setActiveTab] = useState<string>("template");
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState<boolean>(false);

  // Sincronização e auto-binding quando propriedades externas mudam
  useEffect(() => {
    if (destinationTitle) setTitle(destinationTitle);
  }, [destinationTitle]);

  useEffect(() => {
    if (destinationCity) setDestination(destinationCity);
  }, [destinationCity]);

  useEffect(() => {
    if (propDatesText !== undefined) setDatesText(propDatesText || "");
  }, [propDatesText]);

  useEffect(() => {
    if (propInclusions) setInclusionsText(propInclusions.join(", "));
  }, [propInclusions]);

  useEffect(() => {
    if (propPriceCents !== undefined && propPriceCents !== null) setPriceCents(propPriceCents);
  }, [propPriceCents]);

  useEffect(() => {
    if (propInstallments) setMaxInstallments(propInstallments);
  }, [propInstallments]);

  useEffect(() => {
    if (propBackgroundImageUrl) setBgImageUrl(propBackgroundImageUrl);
  }, [propBackgroundImageUrl]);

  useEffect(() => {
    if (propStoreName) setStoreNameValue(propStoreName);
  }, [propStoreName]);

  // FASE 2: Conversão Proativa e Resiliente para Data URI (Blindagem contra CORS)
  useEffect(() => {
    let isMounted = true;
    async function prepareSafeImage() {
      if (!bgImageUrl) return;
      setIsConvertingImage(true);
      try {
        const safeUri = await convertToCorsSafeDataUri(bgImageUrl);
        if (isMounted) {
          setSafeBgDataUri(safeUri);
          await preloadImage(safeUri);
        }
      } catch (err) {
        console.warn("[SocialEngine] Aviso na conversão CORS da imagem:", err);
      } finally {
        if (isMounted) setIsConvertingImage(false);
      }
    }

    prepareSafeImage();
    return () => {
      isMounted = false;
    };
  }, [bgImageUrl]);

  // Medição da área de preview para cálculo do scale responsivo perfeito (Auto-Fit)
  useEffect(() => {
    if (!previewWrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });

    observer.observe(previewWrapperRef.current);
    return () => observer.disconnect();
  }, []);

  // Dimensões nativas de arte
  const artDimensions = useMemo(() => {
    switch (aspectRatio) {
      case "4:5":
        return { width: 1080, height: 1350 };
      case "1:1":
        return { width: 1080, height: 1080 };
      case "9:16":
      default:
        return { width: 1080, height: 1920 };
    }
  }, [aspectRatio]);

  // Cálculo matemático da escala responsiva para NUNCA cortar a arte e manter margens limpas
  const previewScale = useMemo(() => {
    const paddingX = 48;
    const paddingY = 48;
    const maxAvailableW = Math.max(containerSize.width - paddingX, 240);
    const maxAvailableH = Math.max(containerSize.height - paddingY, 240);

    const scaleW = maxAvailableW / artDimensions.width;
    const scaleH = maxAvailableH / artDimensions.height;

    // Escala ideal mantendo a proporção exata sem estouro
    return Math.min(scaleW, scaleH, 0.48);
  }, [containerSize, artDimensions]);

  const parsedInclusions = useMemo(() => {
    return inclusionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
  }, [inclusionsText]);

  const promoData: TravelPromoData = {
    title,
    destination,
    datesText,
    inclusions: parsedInclusions,
    priceCents,
    maxInstallments,
    installmentCents: Math.round(priceCents / (maxInstallments || 1)),
    pricingMode,
    backgroundImageUrl: safeBgDataUri || bgImageUrl,
    aspectRatio,
    themeGradient,
    promoBadge: promoBadge || undefined,
    storeName: storeNameValue,
    templateId,
    ctaLabel,
  };

  // Renderizador offscreen com html2canvas e garantia de CORS
  const generateBlobFromCanvas = useCallback(async (): Promise<Blob> => {
    // 1. Garantir que a imagem está em Base64 Data URI
    let resolvedDataUri = safeBgDataUri;
    if (!resolvedDataUri || (!resolvedDataUri.startsWith("data:") && !resolvedDataUri.startsWith("blob:"))) {
      resolvedDataUri = await convertToCorsSafeDataUri(bgImageUrl);
      setSafeBgDataUri(resolvedDataUri);
    }
    await preloadImage(resolvedDataUri);

    // Pequeno intervalo para repaint completo do layout
    await new Promise((resolve) => setTimeout(resolve, 60));

    const el = document.getElementById("travel-promo-canvas-artboard");
    if (!el) throw new Error("Elemento de arte promocional não encontrado no DOM.");

    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, {
      scale: 2, // Ultra HD export (1080x1920 nativo)
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#0a192f",
      logging: false,
      imageTimeout: 15000,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Falha ao converter canvas em arquivo PNG."));
      }, "image/png");
    });
  }, [safeBgDataUri, bgImageUrl]);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const blob = await generateBlobFromCanvas();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flyer-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${aspectRatio.replace(":", "x")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Flyer promocional exportado em Ultra HD com sucesso!");
    } catch (err: any) {
      console.error("[SocialEngine] Erro ao baixar flyer:", err);
      toast.error("Erro ao gerar imagem: " + (err?.message || "Tente novamente"));
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
      const file = new File([blob], `flyer-${Date.now()}.png`, { type: "image/png" });
      const uploadedUrl = await uploadClassifiedMedia(file, "classifieds");
      attachCallback(uploadedUrl);
      toast.success("Flyer promocional anexado à galeria do anúncio!");
      handleModalClose(false);
    } catch (err: any) {
      console.error("[SocialEngine] Erro ao salvar flyer no anúncio:", err);
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
        setSafeBgDataUri(event.target.result);
        toast.success("Imagem de fundo carregada com sucesso!");
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isModalOpen) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-none w-screen max-w-full h-[100dvh] p-0 border-0 rounded-none bg-background flex flex-col overflow-hidden outline-none [&>button]:hidden z-50">
        {/* ── 1. Top Bar Estúdio (Apple Studio / Canva Ergonomics) ── */}
        <header className="h-14 px-3 sm:px-6 border-b border-border/80 bg-card/95 backdrop-blur-md flex items-center justify-between z-20 shrink-0 select-none">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleModalClose(false)}
              className="size-9 rounded-xl hover:bg-muted shrink-0 cursor-pointer"
              title="Fechar Estúdio"
            >
              <ArrowLeft className="size-4.5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">
                  Estúdio de Flyers Promocionais
                </h2>
                <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-mono">
                  {aspectRatio === "9:16" ? "Story 9:16" : aspectRatio === "4:5" ? "Feed 4:5" : "Quadrado 1:1"}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground truncate hidden sm:block">
                Ultra HD (1080×1920) • Auto-binding do anúncio • Blindagem anti-CORS
              </p>
            </div>
          </div>

          {/* Seletor Central Rápido de Proporção (Desktop) */}
          <div className="hidden md:flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setAspectRatio("9:16")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                aspectRatio === "9:16" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Story 9:16
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio("4:5")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                aspectRatio === "4:5" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Feed 4:5
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio("1:1")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                aspectRatio === "1:1" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Quadrado 1:1
            </button>
          </div>

          {/* Ações Primárias da Top Bar */}
          <div className="flex items-center gap-2">
            {/* Status sutil da imagem */}
            {isConvertingImage && (
              <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin text-primary" />
                <span>Otimizando imagem...</span>
              </div>
            )}

            {/* The Shuffle Engine — Botão Rápido de Variação de Layout */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShuffleLayout}
              className="h-9 px-3 rounded-xl text-xs gap-1.5 font-semibold cursor-pointer border-border/80 hover:bg-primary/10 hover:text-primary transition-all"
              title="Alternar entre templates do mesmo nicho"
            >
              <Dices className="size-4 text-amber-500" />
              <span className="hidden sm:inline">Trocar Layout</span>
            </Button>

            {/* Botão Mobile para Abrir Controles */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMobileControlsOpen(!isMobileControlsOpen)}
              className="lg:hidden h-9 px-3 rounded-xl text-xs gap-1.5"
            >
              <Sliders className="size-3.5" />
              <span>Ajustes</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isExporting}
              className="h-9 px-3 sm:px-4 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              <span className="hidden sm:inline">Baixar Imagem PNG</span>
              <span className="sm:hidden">Baixar</span>
            </Button>

            {attachCallback && (
              <Button
                type="button"
                size="sm"
                onClick={handleSaveToClassified}
                disabled={isSavingToAd}
                className="h-9 px-3 sm:px-4 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground cursor-pointer shadow-xs"
              >
                {isSavingToAd ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                <span className="hidden sm:inline">Usar no Anúncio</span>
                <span className="sm:hidden">Salvar</span>
              </Button>
            )}
          </div>
        </header>

        {/* ── 2. Split-Screen Studio Body ── */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
          {/* ── Coluna Esquerda/Central: O Canvas de Arte (Preview Respirável e Responsivo) ── */}
          <div
            ref={previewWrapperRef}
            className="flex-1 min-h-0 bg-[#070b12] flex items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-hidden select-none"
          >
            {/* Padrão de estúdio neutro no fundo */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            {/* Container escalado responsivamente sem cortes */}
            <div
              className="relative shadow-2xl rounded-2xl border border-white/10 bg-[#0a192f] transition-all duration-150 overflow-hidden"
              style={{
                width: `${artDimensions.width * previewScale}px`,
                height: `${artDimensions.height * previewScale}px`,
              }}
            >
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                  width: `${artDimensions.width}px`,
                  height: `${artDimensions.height}px`,
                }}
              >
                <TravelPromoArtboard data={promoData} />
              </div>
            </div>

            {/* Rodapé informativo discreto do Canvas */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-white/50 pointer-events-none">
              <span>{artDimensions.width} × {artDimensions.height} px • Ultra HD</span>
              <span className="hidden sm:inline">Preview renderizado com fidelidade 100% à exportação</span>
            </div>
          </div>

          {/* ── Coluna Direita: Painel de Controlo Silencioso (Desktop Sidebar / Mobile Drawer) ── */}
          <aside
            className={`w-full lg:w-[380px] xl:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-border/80 bg-card flex flex-col z-10 transition-all duration-200 ${
              isMobileControlsOpen ? "h-[65dvh] max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0 shadow-2xl" : "max-lg:hidden h-full"
            }`}
          >
            <div className="p-3.5 border-b border-border/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Painel de Customização</span>
              </div>
              {isMobileControlsOpen && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileControlsOpen(false)}
                  className="lg:hidden text-xs h-7 px-2"
                >
                  Fechar Ajustes
                </Button>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <div className="px-3 pt-2 shrink-0">
                <TabsList className="grid grid-cols-3 h-9 rounded-xl bg-muted/60 p-0.5">
                  <TabsTrigger value="template" className="text-[11px] font-semibold gap-1">
                    <Maximize2 className="size-3" />
                    <span>Template</span>
                  </TabsTrigger>
                  <TabsTrigger value="textos" className="text-[11px] font-semibold gap-1">
                    <Type className="size-3" />
                    <span>Textos</span>
                  </TabsTrigger>
                  <TabsTrigger value="imagem" className="text-[11px] font-semibold gap-1">
                    <ImageIcon className="size-3" />
                    <span>Mídia</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                {/* ── TAB 1: Template & Formato ── */}
                <TabsContent value="template" className="space-y-4 m-0 focus-visible:outline-none">
                  {/* Seletor de Modelo de Template por Nicho */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-primary" />
                        <span>Modelo Visual (Template)</span>
                      </Label>
                      <button
                        type="button"
                        onClick={handleShuffleLayout}
                        className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Dices className="size-3 text-amber-500" />
                        <span>Sortear Modelo</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {getAllSocialTemplates().map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTemplateId(t.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                            templateId === t.id
                              ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 font-semibold"
                              : "border-border/70 bg-card hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <div className={`size-3 rounded-full mt-1 shrink-0 ${templateId === t.id ? "bg-primary" : "bg-muted-foreground/30"}`} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-foreground flex items-center justify-between">
                              <span className="truncate">{t.name}</span>
                              <span className="text-[10px] font-mono uppercase text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60">
                                {t.niche}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 leading-snug">
                              {t.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Motor Dinâmico de Call-to-Action (CTA) */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-amber-400" />
                        <span>Chamada para Ação (CTA Dinâmico)</span>
                      </Label>
                      <button
                        type="button"
                        onClick={handleCycleCTA}
                        className="text-[10px] text-primary hover:underline cursor-pointer font-medium"
                      >
                        Próximo CTA ↻
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableCTAs.map((cta) => (
                        <button
                          key={cta}
                          type="button"
                          onClick={() => setCtaLabel(cta)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            ctaLabel === cta
                              ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                              : "bg-muted/70 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {cta}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={ctaLabel}
                      onChange={(e) => setCtaLabel(e.target.value)}
                      placeholder="Ou digite um CTA personalizado..."
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  {/* Formato / Aspect Ratio no painel */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <Label className="text-xs font-semibold">Proporção da Arte</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "9:16", label: "Story (9:16)", desc: "1080×1920" },
                        { id: "4:5", label: "Feed (4:5)", desc: "1080×1350" },
                        { id: "1:1", label: "Quadrado (1:1)", desc: "1080×1080" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAspectRatio(item.id as PromoAspectRatio)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            aspectRatio === item.id
                              ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 font-bold"
                              : "border-border/70 bg-card hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <div className="text-xs leading-none font-bold">{item.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-1 font-mono">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gradiente Superior do Topo */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Palette className="size-3.5 text-primary" />
                      <span>Paleta do Topo</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "ocean_blue", label: "Oceano", color: "bg-blue-600" },
                        { id: "sunset_amber", label: "Pôr do Sol", color: "bg-amber-600" },
                        { id: "emerald_nature", label: "Natureza", color: "bg-emerald-600" },
                        { id: "midnight_luxury", label: "Midnight", color: "bg-slate-900" },
                        { id: "caribbean_turquoise", label: "Caribe", color: "bg-cyan-600" },
                        { id: "nordic_snow", label: "Neve & Inverno", color: "bg-slate-700" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setThemeGradient(t.id as any)}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs transition-all cursor-pointer ${
                            themeGradient === t.id
                              ? "border-primary bg-primary/10 text-foreground font-semibold"
                              : "border-border/70 bg-card hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <span className={`size-3.5 rounded-full ${t.color} shrink-0 shadow-xs`} />
                          <span className="truncate">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tag Promocional de Destaque */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-amber-500" />
                        <span>Selo de Destaque</span>
                      </Label>
                      {promoBadge && (
                        <button
                          type="button"
                          onClick={() => setPromoBadge("")}
                          className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                        >
                          Remover
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
                              ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                              : "bg-muted/70 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {badge}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={promoBadge}
                      onChange={(e) => setPromoBadge(e.target.value)}
                      placeholder="Ou digite um selo personalizado..."
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </TabsContent>

                {/* ── TAB 2: Textos & Valores ── */}
                <TabsContent value="textos" className="space-y-3.5 m-0 focus-visible:outline-none">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Título Principal do Flyer</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: João Pessoa com Praia do Amor"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Destino / Localização</Label>
                    <Input
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Ex: Paraíba, Brasil"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Data / Período</Label>
                    <Input
                      value={datesText}
                      onChange={(e) => setDatesText(e.target.value)}
                      placeholder="Ex: 23 a 27 de Outubro / 2026"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="pt-2 border-t border-border/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Preço Total à Vista</Label>
                      <span className="text-xs font-bold text-primary font-mono">
                        {formatMoney(priceCents)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Valor (em centavos)</Label>
                        <Input
                          type="number"
                          value={priceCents}
                          onChange={(e) => setPriceCents(Number(e.target.value) || 0)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Parcelas ({maxInstallments}x)</Label>
                        <select
                          value={maxInstallments}
                          onChange={(e) => setMaxInstallments(Number(e.target.value))}
                          className="w-full h-8 px-2 rounded-lg border border-input bg-background text-xs font-mono"
                        >
                          {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 24].map((num) => (
                            <option key={num} value={num}>
                              {num}x de {formatMoney(Math.round(priceCents / num))}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPricingMode("per_person")}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          pricingMode === "per_person"
                            ? "bg-primary/10 border-primary text-foreground"
                            : "border-border/70 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Por Pessoa
                      </button>
                      <button
                        type="button"
                        onClick={() => setPricingMode("total_package")}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          pricingMode === "total_package"
                            ? "bg-primary/10 border-primary text-foreground"
                            : "border-border/70 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Pacote Fechado
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Inclusões (separadas por vírgula)</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {parsedInclusions.length}/4 itens
                      </span>
                    </div>
                    <Input
                      value={inclusionsText}
                      onChange={(e) => setInclusionsText(e.target.value)}
                      placeholder="Aéreos, Hospedagem, Café da manhã, Traslados"
                      className="h-9 text-xs"
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                      {parsedInclusions.map((item, idx) => (
                        <Badge key={idx} variant="outline" className="text-[10px] font-normal">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* ── TAB 3: Mídia & Fundo (Blindado contra CORS) ── */}
                <TabsContent value="imagem" className="space-y-4 m-0 focus-visible:outline-none">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Foto de Fundo Realista</Label>
                    
                    {/* Miniatura da Imagem Atual */}
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border/80 bg-muted/40">
                      <img
                        src={safeBgDataUri || bgImageUrl}
                        alt="Preview de Fundo"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2.5">
                        <span className="text-[10px] text-white/90 font-mono truncate">
                          {bgImageUrl.startsWith("data:") ? "Imagem local carregada" : bgImageUrl}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <Label className="text-[11px] text-muted-foreground">URL da Imagem</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={bgImageUrl}
                          onChange={(e) => setBgImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="h-8 text-xs font-mono flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileUploadInputRef.current?.click()}
                          className="h-8 text-xs gap-1 rounded-xl shrink-0 cursor-pointer"
                        >
                          <ImagePlus className="size-3.5" />
                          <span>Upload</span>
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

                    {/* Certificação visual de segurança CORS */}
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-2 text-xs">
                      <ShieldCheck className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground text-[11px]">Proteção Anti-CORS Ativa</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          A imagem externa é convertida para Base64 antes da exportação, eliminando bloqueios de rede.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-border/50">
                    <Label className="text-xs font-semibold">Nome do Anunciante / Loja</Label>
                    <Input
                      value={storeNameValue}
                      onChange={(e) => setStoreNameValue(e.target.value)}
                      placeholder="Ex: Waesy Turismo"
                      className="h-8 text-xs"
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
