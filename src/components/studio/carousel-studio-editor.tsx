import React, { useState, useRef, useCallback } from "react";
import type { EscamasCarouselProject, EscamasSlide, StudioBrandProfile, EscamasAspectRatio } from "@/types/studio-machine";
import { SlideRendererEscamas, getSlideDimensions } from "./slide-renderer-escamas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { 
  Download, 
  Copy, 
  Check, 
  Share2, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Layers, 
  Palette, 
  Type, 
  Maximize2,
  Save,
  RefreshCw,
  X
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { saveStudioProject, publishStudioCarouselToSocial, refineSlideTextWithAI, type RefinedSlideOption } from "@/services/studio.functions";

interface CarouselStudioEditorProps {
  project: EscamasCarouselProject;
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdated?: (updated: EscamasCarouselProject) => void;
}

export function CarouselStudioEditor({
  project: initialProject,
  isOpen,
  onClose,
  onProjectUpdated,
}: CarouselStudioEditorProps) {
  const [project, setProject] = useState<EscamasCarouselProject>(initialProject);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<EscamasAspectRatio>(initialProject.aspectRatio || "portrait_4_5");

  // Canvas zoom/scale factor para exibição ergonômica
  const [canvasScale, setCanvasScale] = useState(0.42);

  // Estados de Refinamento de Texto com IA Universal
  const [showAiModal, setShowAiModal] = useState(false);
  const [isRefiningAI, setIsRefiningAI] = useState(false);
  const [aiTone, setAiTone] = useState<"direct_punchy" | "journalistic_editorial" | "persuasive_cta" | "educational_authority">("journalistic_editorial");
  const [aiVariants, setAiVariants] = useState<RefinedSlideOption[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeDimensions = getSlideDimensions(aspectRatio);

  const slides = project.slides || [];
  const currentSlide = slides[currentSlideIndex] || slides[0];

  const updateCurrentSlide = useCallback(
    (updates: Partial<EscamasSlide>) => {
      if (!currentSlide) return;
      const newSlides = [...slides];
      newSlides[currentSlideIndex] = {
        ...newSlides[currentSlideIndex],
        ...updates,
      };
      const updatedProject = { ...project, slides: newSlides };
      setProject(updatedProject);
      onProjectUpdated?.(updatedProject);
    },
    [currentSlide, slides, currentSlideIndex, project, onProjectUpdated]
  );

  const updateTextContent = (field: string, val: string) => {
    if (!currentSlide) return;
    updateCurrentSlide({
      text_content: {
        ...currentSlide.text_content,
        [field]: val,
      },
    });
  };

  // Refinamento com IA Orquestrada
  const handleTriggerAiRefinement = async (toneOverride?: typeof aiTone) => {
    const headline = currentSlide?.text_content?.headline;
    if (!headline || !headline.trim()) {
      toast.error("Preencha pelo menos a Manchete para a IA poder refinar o slide.");
      return;
    }
    const toneToUse = toneOverride || aiTone;
    setIsRefiningAI(true);
    try {
      const res = await refineSlideTextWithAI({
        data: {
          headline,
          body: currentSlide.text_content.body || "",
          badge: currentSlide.text_content.badge || "",
          kicker: currentSlide.text_content.kicker || "",
          niche: project.title,
          brandName: project.brand.name,
          targetTone: toneToUse,
        },
      });
      if (res.variants && res.variants.length > 0) {
        setAiVariants(res.variants);
      } else {
        toast.error("Nenhuma variação gerada pela IA.");
      }
    } catch (err: any) {
      toast.error("Erro ao refinar com IA: " + (err?.message || "Tente novamente."));
    } finally {
      setIsRefiningAI(false);
    }
  };

  const handleApplyVariant = (variant: RefinedSlideOption) => {
    updateCurrentSlide({
      text_content: {
        ...currentSlide.text_content,
        badge: variant.badge,
        kicker: variant.kicker,
        headline: variant.headline,
        body: variant.body,
        ...(variant.cta_text ? { cta_text: variant.cta_text } : {}),
      },
    });
    setShowAiModal(false);
    toast.success("Texto refinado pela IA aplicado com sucesso no slide!");
  };

  // Salvar no Banco
  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    try {
      await saveStudioProject({
        data: {
          id: project.id,
          title: project.title,
          project_type: "graphic",
          aspect_ratio: "4:5",
          canvas_data: project as any,
          thumbnail_url: currentSlide.background_url || null,
        },
      });
      toast.success("Projeto salvo no Studio com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar projeto: " + (err.message || "Tente novamente."));
    } finally {
      setIsSaving(false);
    }
  };

  // Exportar Slide Atual como PNG de alta resolução (1080x1350)
  const handleExportPNG = async () => {
    if (!containerRef.current) return;
    setIsExporting(true);

    try {
      // Localiza o elemento do artboard original
      const artboardEl = containerRef.current.querySelector<HTMLElement>("[data-slide-id]");
      if (!artboardEl) throw new Error("Elemento do slide não encontrado");

      // Clona temporariamente em escala 1:1 sem zoom
      const originalTransform = artboardEl.style.transform;
      artboardEl.style.transform = "scale(1)";

      const canvas = await html2canvas(artboardEl, {
        width: 1080,
        height: 1350,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: project.brand.primaryColor || "#090d16",
        logging: false,
      });

      // Restaura a escala de visualização
      artboardEl.style.transform = originalTransform;

      // Dispara download
      const link = document.createElement("a");
      link.download = `${project.title.replace(/\s+/g, "_")}_slide_${currentSlideIndex + 1}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success(`Slide ${currentSlideIndex + 1} exportado em 1080x1350 HD!`);
    } catch (err: any) {
      console.error("Erro na exportação:", err);
      toast.error("Falha ao exportar imagem: " + (err.message || "Verifique imagens externas."));
    } finally {
      setIsExporting(false);
    }
  };

  // Copiar Imagem para o Clipboard
  const handleCopyToClipboard = async () => {
    if (!containerRef.current) return;
    setIsExporting(true);

    try {
      const artboardEl = containerRef.current.querySelector<HTMLElement>("[data-slide-id]");
      if (!artboardEl) throw new Error("Elemento do slide não encontrado");

      const originalTransform = artboardEl.style.transform;
      artboardEl.style.transform = "scale(1)";

      const canvas = await html2canvas(artboardEl, {
        width: 1080,
        height: 1350,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: project.brand.primaryColor || "#090d16",
        logging: false,
      });

      artboardEl.style.transform = originalTransform;

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Falha ao gerar blob de imagem.");
          setIsExporting(false);
          return;
        }

        try {
          if (navigator.clipboard && (window as any).ClipboardItem) {
            await navigator.clipboard.write([
              new (window as any).ClipboardItem({ "image/png": blob }),
            ]);
            setCopied(true);
            toast.success("Imagem copiada para a área de transferência! Cole no Instagram ou WhatsApp.");
            setTimeout(() => setCopied(false), 2500);
          } else {
            toast.error("Seu navegador não suporta cópia direta de imagem. Use o botão Baixar.");
          }
        } catch (clipErr) {
          toast.error("Erro de permissão ao copiar. Use o botão Baixar.");
        } finally {
          setIsExporting(false);
        }
      }, "image/png");
    } catch (err: any) {
      toast.error("Falha ao processar imagem para o clipboard.");
      setIsExporting(false);
    }
  };

  // Compartilhar WhatsApp com texto
  const handleShareWhatsApp = () => {
    const text = `Confira esta matéria no Waesy: ${project.title}\n\n${currentSlide.text_content.headline}\n${currentSlide.text_content.body || ""}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Publicar diretamente no Feed ou Stories da Loja
  const handlePublish = async (dest: "feed" | "story" | "both") => {
    setIsPublishing(true);
    try {
      const coverImg = project.slides[0]?.media?.url || null;
      const allMedia = project.slides
        .map((s) => s.media?.url)
        .filter((u): u is string => Boolean(u));

      const res = await publishStudioCarouselToSocial({
        data: {
          projectId: project.id,
          title: project.title,
          destination: dest,
          aspectRatio,
          coverImageUrl: coverImg,
          slideImages: allMedia,
          caption: `${project.title}\n\n${currentSlide?.text_content?.headline || ""}\n${currentSlide?.text_content?.body || ""}`,
          hashtags: ["Waesy", "StudioEscamas", project.brand.name.replace(/\s+/g, "")],
        },
      });

      toast.success(res.message);
    } catch (err: any) {
      toast.error("Erro ao publicar: " + (err.message || "Tente novamente."));
    } finally {
      setIsPublishing(false);
    }
  };

  if (!currentSlide) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl! w-[96vw] h-[92vh] max-h-[92vh] p-0 flex flex-col bg-background border-border overflow-hidden rounded-2xl shadow-2xl">
        {/* TOPBAR DO STUDIO */}
        <div className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black text-sm">
              W
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate text-foreground leading-tight">
                {project.title}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">
                {project.brand.name} • Sistema ESCAMAS (1080x1350 4:5)
              </p>
            </div>
          </div>

          {/* SLIDE STEPPER CHIPS */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/70">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  currentSlideIndex === idx
                    ? "bg-background text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Slide {idx + 1}
              </button>
            ))}
          </div>
          {/* SELETOR DE PROPORÇÃO DE TELA (MULTI-ASPECT RATIO) */}
          <div className="hidden sm:flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 text-xs">
            {[
              { id: "portrait_4_5" as const, label: "4:5 Post" },
              { id: "story_9_16" as const, label: "9:16 Story" },
              { id: "square_1_1" as const, label: "1:1 Feed" },
              { id: "landscape_16_9" as const, label: "16:9 Deck" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setAspectRatio(opt.id);
                  const updated = { ...project, aspectRatio: opt.id };
                  setProject(updated);
                  onProjectUpdated?.(updated);
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  aspectRatio === opt.id
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePublish("feed")}
              disabled={isPublishing}
              className="gap-1.5 h-9 rounded-xl text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
            >
              <Sparkles className="size-3.5" />
              {isPublishing ? "Publicando..." : "Publicar Feed"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveToDatabase}
              disabled={isSaving}
              className="gap-1.5 h-9 rounded-xl text-xs font-semibold"
            >
              <Save className="size-3.5" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyToClipboard}
              disabled={isExporting}
              className="gap-1.5 h-9 rounded-xl text-xs font-semibold"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleExportPNG}
              disabled={isExporting}
              className="gap-1.5 h-9 rounded-xl text-xs font-semibold"
            >
              <Download className="size-3.5" />
              {isExporting ? "Gerando HD..." : "Baixar PNG"}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-9 rounded-xl"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* WORKSPACE CORPO: CANVAS CENTRAL + PAINEL DE CONTROLE LATERAL */}
        <div className="flex-1 flex overflow-hidden">
          {/* ÁREA CENTRAL DO CANVAS (COM ZOOM & CONTROLES DE NAVEGAÇÃO) */}
          <div className="flex-1 bg-muted/30 relative flex flex-col items-center justify-center overflow-auto p-4 select-none">
            {/* CANVAS RENDERER CONTAINER */}
            <div
              ref={containerRef}
              className="relative shadow-2xl rounded-xl overflow-hidden border border-border/60 transition-transform duration-200"
              style={{
                width: activeDimensions.width * canvasScale,
                height: activeDimensions.height * canvasScale,
              }}
            >
              <SlideRendererEscamas
                slide={currentSlide}
                brand={project.brand}
                aspectRatio={aspectRatio}
                scale={canvasScale}
                onLayerSelect={setSelectedLayerId}
                selectedLayerId={selectedLayerId}
              />
            </div>

            {/* CONTROLE DE ZOOM & SLIDE ANTERIOR/PRÓXIMO */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-card/90 backdrop-blur-md border border-border px-3 py-1.5 rounded-full shadow-lg">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full"
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>

              <span className="text-xs font-mono font-bold text-foreground">
                {currentSlideIndex + 1} / {slides.length}
              </span>

              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full"
                disabled={currentSlideIndex === slides.length - 1}
                onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>

              <div className="w-px h-4 bg-border" />

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-mono">Zoom</span>
                <Slider
                  min={0.25}
                  max={0.75}
                  step={0.02}
                  value={[canvasScale]}
                  onValueChange={([val]) => setCanvasScale(val)}
                  className="w-20"
                />
              </div>

              <div className="w-px h-4 bg-border" />

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShareWhatsApp}
                className="size-7 p-0 text-emerald-500 hover:text-emerald-400"
                title="Compartilhar no WhatsApp"
              >
                <WhatsappLogo size={18} weight="fill" />
              </Button>
            </div>
          </div>

          {/* PAINEL LATERAL DE EDIÇÃO DO SLIDE */}
          <aside className="w-84 border-l border-border bg-card p-5 overflow-y-auto space-y-6 shrink-0">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Type className="size-3.5" />
                  Textos do Slide {currentSlideIndex + 1}
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAiModal(true);
                    if (aiVariants.length === 0) {
                      handleTriggerAiRefinement();
                    }
                  }}
                  className="h-7 px-2.5 gap-1 rounded-lg text-[11px] font-semibold border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
                >
                  <Sparkles className="size-3 text-primary" />
                  Refinar com IA
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-foreground">Badge / Selo</Label>
                  <Input
                    value={currentSlide.text_content.badge || ""}
                    onChange={(e) => updateTextContent("badge", e.target.value)}
                    placeholder="Ex: Oficial • Giro de Notícias"
                    className="h-9 mt-1 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-foreground">Kicker / Chapéu</Label>
                  <Input
                    value={currentSlide.text_content.kicker || ""}
                    onChange={(e) => updateTextContent("kicker", e.target.value)}
                    placeholder="Ex: POLÍTICA • TRANSPARÊNCIA"
                    className="h-9 mt-1 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-foreground">Manchete / Título</Label>
                  <Textarea
                    value={currentSlide.text_content.headline || ""}
                    onChange={(e) => updateTextContent("headline", e.target.value)}
                    placeholder="Manchete principal..."
                    rows={3}
                    className="mt-1 text-xs rounded-xl font-bold uppercase"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-foreground">Texto de Apoio</Label>
                  <Textarea
                    value={currentSlide.text_content.body || ""}
                    onChange={(e) => updateTextContent("body", e.target.value)}
                    placeholder="Descrição detalhada..."
                    rows={4}
                    className="mt-1 text-xs rounded-xl leading-relaxed"
                  />
                </div>

                {currentSlideIndex === slides.length - 1 && (
                  <div>
                    <Label className="text-xs font-medium text-foreground">Texto do Botão CTA</Label>
                    <Input
                      value={currentSlide.text_content.cta_text || ""}
                      onChange={(e) => updateTextContent("cta_text", e.target.value)}
                      placeholder="Ex: Ver no Waesy"
                      className="h-9 mt-1 text-xs rounded-xl font-bold"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* CONTROLE DE FUNDO */}
            <div className="border-t border-border pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Palette className="size-3.5" />
                Imagem de Fundo
              </h4>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-foreground">URL da Imagem</Label>
                  <Input
                    value={currentSlide.background_url || ""}
                    onChange={(e) => updateCurrentSlide({ background_url: e.target.value })}
                    placeholder="https://..."
                    className="h-9 mt-1 text-xs rounded-xl font-mono text-[11px]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground font-medium">Opacidade do Fundo</span>
                    <span className="font-mono text-foreground">
                      {Math.round(currentSlide.background_opacity * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={[currentSlide.background_opacity]}
                    onValueChange={([val]) => updateCurrentSlide({ background_opacity: val })}
                  />
                </div>
              </div>
            </div>

            {/* BRAND KIT APLICADO */}
            <div className="border-t border-border pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                Identidade da Loja
              </h4>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Nome:</span>
                  <span className="font-bold text-foreground">{project.brand.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Arroba:</span>
                  <span className="font-semibold text-primary">{project.brand.handle}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Cores:</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="size-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: project.brand.primaryColor }}
                    />
                    <div
                      className="size-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: project.brand.secondaryColor }}
                    />
                    <div
                      className="size-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: project.brand.accentColor }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* MODAL DE REFINAMENTO DE TEXTO COM IA UNIVERSAL (ORQUESTRADOR) */}
        <Dialog open={showAiModal} onOpenChange={setShowAiModal}>
          <DialogContent className="max-w-3xl w-[92vw] max-h-[85vh] p-6 flex flex-col bg-background border-border rounded-2xl shadow-2xl overflow-hidden">
            <DialogHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground">
                      Refinar Textos do Slide com IA
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                      Modelos generativos do pool orquestrado (BYOK / Gemini / OpenAI / Groq)
                    </p>
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* BARRA DE TONS & RE-GERAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border/60">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "journalistic_editorial" as const, label: "Jornalístico" },
                  { id: "direct_punchy" as const, label: "Impacto & Curto" },
                  { id: "persuasive_cta" as const, label: "Persuasivo & CTA" },
                  { id: "educational_authority" as const, label: "Educativo" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setAiTone(t.id);
                      handleTriggerAiRefinement(t.id);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      aiTone === t.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTriggerAiRefinement()}
                disabled={isRefiningAI}
                className="h-8 gap-1.5 text-xs font-medium rounded-xl"
              >
                <RefreshCw className={`size-3.5 ${isRefiningAI ? "animate-spin" : ""}`} />
                {isRefiningAI ? "Refinando..." : "Gerar Novas Variações"}
              </Button>
            </div>

            {/* LISTAGEM DE VARIAÇÕES REFINADAS */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {isRefiningAI ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-xs text-muted-foreground">
                    Orquestrando modelos de IA para criar variações de alto impacto...
                  </p>
                </div>
              ) : aiVariants.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs space-y-3">
                  <p>Nenhuma variação gerada ainda.</p>
                  <Button
                    size="sm"
                    onClick={() => handleTriggerAiRefinement()}
                    className="h-8 rounded-xl text-xs font-semibold"
                  >
                    Gerar Variações Agora
                  </Button>
                </div>
              ) : (
                aiVariants.map((variant, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-border/80 bg-card hover:border-primary/50 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
                          {variant.tone}
                        </Badge>
                        {variant.badge && (
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            • {variant.badge}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleApplyVariant(variant)}
                        className="h-7 px-3 text-xs font-bold rounded-lg cursor-pointer"
                      >
                        <Check className="size-3 mr-1" />
                        Aplicar no Slide
                      </Button>
                    </div>

                    <div>
                      {variant.kicker && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                          {variant.kicker}
                        </p>
                      )}
                      <h4 className="text-sm font-extrabold text-foreground uppercase leading-snug">
                        {variant.headline}
                      </h4>
                      {variant.body && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {variant.body}
                        </p>
                      )}
                    </div>

                    {variant.rationale && (
                      <p className="text-[11px] text-primary/80 italic bg-primary/5 p-2 rounded-lg border border-primary/10">
                        💡 {variant.rationale}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
