import React, { useState, useRef, useCallback } from "react";
import type { EscamasCarouselProject, EscamasSlide, StudioBrandProfile } from "@/types/studio-machine";
import { SlideRendererEscamas } from "./slide-renderer-escamas";
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
import { saveStudioProject } from "@/services/studio.functions";

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

  // Canvas zoom/scale factor para exibição ergonômica
  const [canvasScale, setCanvasScale] = useState(0.42);

  const containerRef = useRef<HTMLDivElement>(null);

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

          {/* ACTIONS */}
          <div className="flex items-center gap-2">
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
                width: 1080 * canvasScale,
                height: 1350 * canvasScale,
              }}
            >
              <SlideRendererEscamas
                slide={currentSlide}
                brand={project.brand}
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Type className="size-3.5" />
                Textos do Slide {currentSlideIndex + 1}
              </h4>

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
      </DialogContent>
    </Dialog>
  );
}
