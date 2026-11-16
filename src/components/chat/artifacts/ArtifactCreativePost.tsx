import React, { useEffect, useId, useState } from "react";
import {
  Copy,
  Check,
  Download,
  FileText,
  Code2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  exportElementAsImage,
  exportElementAsPdf,
  exportMultipleElementsAsPdf,
} from "@/lib/pdf-export";
import {
  CREATIVE_THEMES,
  CreativeArtboardRenderer,
  type CreativeArchetype,
  type CreativeAspectRatio,
  type CreativeThemeId,
} from "@/components/studio/creative-artboard-renderer";

export type PostAspectRatio = "square" | "portrait" | "story" | "landscape";
export type PostThemePalette =
  | "brand"
  | "dark_minimal"
  | "warm_gold"
  | "ocean_cyan"
  | "editorial_beige"
  | CreativeThemeId;

export type PostLayoutTemplate =
  | "headline_lead"
  | "bullet_checklist"
  | "quote_testimonial"
  | "promo_offer"
  | "travel";

export interface CreativeSlideSpec {
  badge?: string;
  headline: string;
  subheadline?: string;
  bullets?: string[];
  ctaText?: string;
  imageUrl?: string;
}

export interface ArtifactCreativePostProps {
  title: string;
  format?: "story" | "portrait" | "landscape" | "feed";
  aspectRatio?: CreativeAspectRatio;
  archetype?: CreativeArchetype;
  themeId?: PostThemePalette;
  badge?: string;
  headline?: string;
  subheadline?: string;
  bullets?: string[];
  quoteAuthor?: string;
  ctaText?: string;
  storeName?: string;
  brandHandle?: string;
  logoUrl?: string;
  imageUrl?: string;
  caption?: string;
  hashtags?: string[];
  offerPrice?: string;
  offerBadge?: string;
  installments?: string;
  locationLabel?: string;
  slides?: CreativeSlideSpec[];
  compact?: boolean;
  onOpenInStudio?: (snapshot: Record<string, any>) => void;
  onPublish?: (snapshot: Record<string, any>) => void;
  className?: string;
}

const PALETTE_TO_THEME: Record<PostThemePalette, CreativeThemeId> = {
  brand: "emerald",
  dark_minimal: "obsidian",
  warm_gold: "gold",
  ocean_cyan: "cobalt",
  editorial_beige: "paper",
  obsidian: "obsidian",
  emerald: "emerald",
  gold: "gold",
  cobalt: "cobalt",
  terracotta: "terracotta",
  paper: "paper",
};

const RATIO_MAP: Record<PostAspectRatio, CreativeAspectRatio> = {
  square: "1:1",
  portrait: "4:5",
  story: "9:16",
  landscape: "16:9",
};

function resolveAspectFromProps(
  format?: string,
  aspectRatioProp?: string,
): PostAspectRatio {
  if (aspectRatioProp === "9:16" || format === "story") return "story";
  if (aspectRatioProp === "4:5" || format === "portrait") return "portrait";
  if (aspectRatioProp === "16:9" || format === "landscape") return "landscape";
  return "square";
}

function resolveTemplateFromArchetype(archetype?: string): PostLayoutTemplate {
  if (archetype === "quote") return "quote_testimonial";
  if (archetype === "bullet_checklist") return "bullet_checklist";
  if (archetype === "promo_offer") return "promo_offer";
  if (archetype === "travel") return "travel";
  return "headline_lead";
}

function resolveThemeFromPalette(palette?: string): CreativeThemeId {
  if (palette && palette in PALETTE_TO_THEME) {
    return PALETTE_TO_THEME[palette as PostThemePalette];
  }
  return "emerald";
}

export function ArtifactCreativePost({
  title,
  format,
  aspectRatio: initialAspectRatio,
  archetype: initialArchetype,
  themeId: initialThemeId,
  badge = "Dica do Especialista",
  headline = "Como Escalar Suas Vendas com Campanhas Locais de Alta Conversão",
  subheadline = "Estratégia comprovada para estabelecimentos comerciais e prestadores de serviços",
  bullets = [
    "Público hiperlocal qualificado por raio de entrega",
    "Oferta irresistível com gatilho de escassez",
    "Atendimento imediato direto no WhatsApp",
  ],
  quoteAuthor = "Assessor de Negócios Waesy",
  ctaText = "Saiba Mais no Perfil",
  storeName = "Waesy Negócios",
  brandHandle,
  logoUrl,
  imageUrl,
  caption,
  hashtags = ["#VendasLocais", "#NegociosLocais", "#Empreendedorismo", "#Marketing"],
  offerPrice,
  offerBadge = "Oferta Limitada",
  installments,
  locationLabel,
  slides,
  compact = false,
  onOpenInStudio,
  onPublish,
  className,
}: ArtifactCreativePostProps) {
  const [aspectRatio, setAspectRatio] = useState<PostAspectRatio>(() =>
    resolveAspectFromProps(format, initialAspectRatio),
  );
  const [themeId, setThemeId] = useState<CreativeThemeId>(() =>
    resolveThemeFromPalette(initialThemeId),
  );
  const [template, setTemplate] = useState<PostLayoutTemplate>(() =>
    resolveTemplateFromArchetype(initialArchetype),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  const [editHeadline, setEditHeadline] = useState(headline);
  const [editSubheadline, setEditSubheadline] = useState(subheadline);
  const [editBadge, setEditBadge] = useState(badge);
  const [editOfferPrice, setEditOfferPrice] = useState(offerPrice || "");
  const [editCtaText, setEditCtaText] = useState(ctaText);
  const [editStoreName, setEditStoreName] = useState(storeName);
  const [editImageUrl, setEditImageUrl] = useState(imageUrl || "");
  const [editLogoUrl, setEditLogoUrl] = useState(logoUrl || "");
  const [overlayPercent, setOverlayPercent] = useState(62);

  useEffect(() => {
    setAspectRatio(resolveAspectFromProps(format, initialAspectRatio));
  }, [format, initialAspectRatio]);

  useEffect(() => {
    setThemeId(resolveThemeFromPalette(initialThemeId));
  }, [initialThemeId]);

  useEffect(() => {
    setTemplate(resolveTemplateFromArchetype(initialArchetype));
  }, [initialArchetype]);

  useEffect(() => {
    setEditHeadline(headline);
    setEditSubheadline(subheadline);
    setEditBadge(badge);
    setEditOfferPrice(offerPrice || "");
    setEditCtaText(ctaText);
    setEditStoreName(storeName);
    setEditImageUrl(imageUrl || "");
    setEditLogoUrl(logoUrl || "");
  }, [headline, subheadline, badge, offerPrice, ctaText, storeName, imageUrl, logoUrl]);

  const uid = useId();
  const stageId = `copilot-post-stage-${uid.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const normalizedSlides = Array.isArray(slides) ? slides.filter((s) => Boolean(s?.headline)) : [];
  const hasCarousel = normalizedSlides.length > 1;
  const activeSlide = hasCarousel
    ? normalizedSlides[Math.min(activeSlideIdx, normalizedSlides.length - 1)]
    : undefined;

  useEffect(() => {
    setActiveSlideIdx(0);
  }, [normalizedSlides.length]);

  const effectiveBadge = activeSlide?.badge ?? editBadge;
  const effectiveHeadline = activeSlide?.headline ?? editHeadline;
  const effectiveSubheadline =
    template === "quote_testimonial"
      ? quoteAuthor
      : activeSlide?.subheadline ?? editSubheadline;
  const effectiveBullets = Array.isArray(activeSlide?.bullets)
    ? activeSlide.bullets
    : Array.isArray(bullets)
      ? bullets
      : [];
  const effectiveHashtags = Array.isArray(hashtags) ? hashtags : [];
  const effectiveCtaText = activeSlide?.ctaText ?? editCtaText;
  const effectiveImageUrl = activeSlide?.imageUrl ?? editImageUrl;

  const fullCaption =
    caption ||
    `${effectiveHeadline}\n\n${effectiveSubheadline || ""}\n\n${effectiveBullets.map((b) => `• ${b}`).join("\n")}\n\n${effectiveCtaText}: Link na bio!\n\n${effectiveHashtags.join(" ")}`;

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(fullCaption);
    setCopiedCaption(true);
    toast.success("Legenda copiada!");
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleDownloadPng = async () => {
    try {
      setIsExporting(true);
      const slug = (title || "post-waesy").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32);
      await exportElementAsImage(stageId, {
        filename: `${slug}-${RATIO_MAP[aspectRatio].replace(":", "x")}.png`,
        scale: 2,
      });
      toast.success("Post exportado em PNG de alta resolução!");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao exportar imagem PNG.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      const slug = (title || "post-waesy").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32);
      if (hasCarousel) {
        const slideElements = normalizedSlides
          .map((_, idx) => document.getElementById(`${stageId}-slide-${idx}`))
          .filter((el): el is HTMLElement => el instanceof HTMLElement);
        if (slideElements.length > 0) {
          await exportMultipleElementsAsPdf(slideElements, `${slug}-carrossel.pdf`);
          toast.success(`Carrossel (${slideElements.length} slides) exportado em PDF!`);
          return;
        }
      }
      await exportElementAsPdf(
        stageId,
        `${slug}.pdf`,
        aspectRatio === "landscape" ? "l" : "p"
      );
      toast.success("Peça exportada em PDF!");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao exportar PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadHtml = () => {
    const stageEl = document.getElementById(stageId);
    if (!stageEl) return;
    // design-lint-ignore DL-01 reason:"Standalone offline exported HTML document canvas backdrop requires self-contained neutral dark hex" expiry:"2027-12-31"
    const htmlDoc = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${editHeadline}</title></head><body style="margin:0;padding:24px;display:flex;justify-content:center;background:#09090b;font-family:system-ui,sans-serif;">${stageEl.outerHTML}</body></html>`;
    const blob = new Blob([htmlDoc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(title || "post-waesy").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("HTML autônomo exportado!");
  };

  const mappedArchetype: CreativeArchetype =
    template === "quote_testimonial"
      ? "quote"
      : template === "travel"
      ? "travel"
      : template;

  const currentSnapshot = {
    format: aspectRatio === "story" ? "story" : aspectRatio === "portrait" ? "portrait" : aspectRatio === "landscape" ? "landscape" : "feed",
    aspectRatio: RATIO_MAP[aspectRatio],
    themeId,
    archetype: mappedArchetype,
    headline: effectiveHeadline,
    subheadline: effectiveSubheadline,
    badge: effectiveBadge,
    offerBadge,
    offerPrice: editOfferPrice || undefined,
    installments,
    bullets: effectiveBullets,
    ctaText: effectiveCtaText,
    cta_label: effectiveCtaText,
    body_text: effectiveSubheadline,
    storeName: editStoreName,
    brandHandle,
    locationLabel,
    imageUrl: effectiveImageUrl || undefined,
    logoUrl: editLogoUrl || undefined,
    slides: normalizedSlides.length > 0 ? normalizedSlides : undefined,
  };

  return (
    <div
      className={cn(
        "@container space-y-4",
        compact && "rounded-2xl border border-border/80 bg-card p-3 sm:p-4 max-w-md w-full space-y-3",
        className,
      )}
    >
      {/* Cabeçalho e Botões de Exportação */}
      <div className="flex flex-col gap-3 border-b border-border/40 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="size-4 text-primary shrink-0" />
              <h2 className="text-base font-bold text-foreground">{title}</h2>
              <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-2xs font-mono font-medium text-muted-foreground shrink-0">
                {aspectRatio === "story"
                  ? "Story (9:16)"
                  : aspectRatio === "portrait"
                    ? "Retrato (4:5)"
                    : aspectRatio === "landscape"
                      ? "Slide (16:9)"
                      : "Feed (1:1)"}
              </span>
            </div>
            {!compact && (
              <p className="text-xs text-muted-foreground mt-1">
                Estúdio Criativo Multiformato com Exportação PNG, PDF e HTML
              </p>
            )}
          </div>

          <Button
            type="button"
            variant={isEditing ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsEditing((prev) => !prev)}
            className="h-11 min-h-11 px-3 text-xs gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <SlidersHorizontal className="size-3.5" />
            <span>{isEditing ? "Fechar Edição" : "Personalizar"}</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={isExporting}
            onClick={handleDownloadPng}
            className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Download className="size-3.5" />
            <span>{isExporting ? "Exportando..." : "Baixar PNG"}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExporting}
            onClick={handleDownloadPdf}
            className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <FileText className="size-3.5" />
            <span>Exportar PDF</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadHtml}
            className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Code2 className="size-3.5" />
            <span>HTML</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyCaption}
            className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {copiedCaption ? (
              <Check className="size-3.5 text-emerald-600" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span>{copiedCaption ? "Copiada!" : "Legenda"}</span>
          </Button>
        </div>
      </div>

      {/* Editor Inline Sob Demanda */}
      {isEditing && (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-2xs font-semibold">Título Principal</Label>
              <Input
                value={editHeadline}
                onChange={(e) => setEditHeadline(e.target.value)}
                className="h-11 min-h-11 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-2xs font-semibold">Selo / Badge</Label>
              <Input
                value={editBadge}
                onChange={(e) => setEditBadge(e.target.value)}
                className="h-11 min-h-11 text-xs"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-2xs font-semibold">Subtítulo / Copy</Label>
              <Input
                value={editSubheadline}
                onChange={(e) => setEditSubheadline(e.target.value)}
                className="h-11 min-h-11 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-2xs font-semibold">Preço / Destaque</Label>
              <Input
                value={editOfferPrice}
                placeholder="Ex: R$ 199,00"
                onChange={(e) => setEditOfferPrice(e.target.value)}
                className="h-11 min-h-11 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-2xs font-semibold">Chamada (CTA)</Label>
              <Input
                value={editCtaText}
                onChange={(e) => setEditCtaText(e.target.value)}
                className="h-11 min-h-11 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-2xs font-semibold">Marca / Loja</Label>
              <Input
                value={editStoreName}
                onChange={(e) => setEditStoreName(e.target.value)}
                className="h-11 min-h-11 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-2xs font-semibold">URL Logo (opcional)</Label>
              <Input
                value={editLogoUrl}
                placeholder="https://..."
                onChange={(e) => setEditLogoUrl(e.target.value)}
                className="h-11 min-h-11 text-xs"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-2xs font-semibold">URL Foto de Fundo (opcional)</Label>
              <Input
                value={editImageUrl}
                placeholder="https://..."
                onChange={(e) => setEditImageUrl(e.target.value)}
                className="h-11 min-h-11 text-xs"
              />
            </div>
          </div>
          {editImageUrl && (
            <div className="flex items-center gap-3 pt-1">
              <Label className="text-2xs font-semibold whitespace-nowrap">
                Contraste da Foto ({overlayPercent}%)
              </Label>
              <input
                type="range"
                min={20}
                max={88}
                value={overlayPercent}
                onChange={(e) => setOverlayPercent(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* Barra de Ajustes Interativos: Proporção, Tema Visual, Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-2xs font-semibold text-muted-foreground">
            Formato / Proporção
          </label>
          <div className="inline-flex w-full rounded-lg bg-muted p-1 text-xs">
            {(
              [
                ["square", "1:1"],
                ["portrait", "4:5"],
                ["story", "9:16"],
                ["landscape", "16:9"],
              ] as const
            ).map(([ratio, label]) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                className={cn(
                  "flex-1 h-11 min-h-11 sm:h-9 py-2 text-center rounded-md text-2xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  aspectRatio === ratio
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-semibold text-muted-foreground">
            Tema Visual
          </label>
          <div className="flex flex-wrap gap-1 w-full rounded-lg bg-muted p-1 text-xs">
            {(Object.keys(CREATIVE_THEMES) as CreativeThemeId[]).map((tId) => (
              <button
                key={tId}
                type="button"
                onClick={() => setThemeId(tId)}
                className={cn(
                  "flex-1 h-11 min-h-11 sm:h-9 px-2 py-2 text-center rounded-md text-2xs font-medium whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  themeId === tId
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {CREATIVE_THEMES[tId].label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-semibold text-muted-foreground">
            Arquétipo de Layout
          </label>
          <div className="flex flex-wrap gap-1 w-full rounded-lg bg-muted p-1 text-xs">
            {(
              [
                ["headline_lead", "Capa"],
                ["bullet_checklist", "Lista"],
                ["promo_offer", "Oferta"],
                ["quote_testimonial", "Frase"],
                ["travel", "Turismo"],
              ] as const
            ).map(([tmpl, label]) => (
              <button
                key={tmpl}
                type="button"
                onClick={() => setTemplate(tmpl)}
                className={cn(
                  "flex-1 h-11 min-h-11 sm:h-9 px-2 py-2 text-center rounded-md text-2xs font-medium whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  template === tmpl
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Seletor de Slides para Carrossel */}
      {hasCarousel && (
        <div className="flex items-center gap-2 scroll-area-carousel pb-1">
          {normalizedSlides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSlideIdx(idx)}
              className={cn(
                "h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeSlideIdx === idx
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              Slide {idx + 1}
            </button>
          ))}
        </div>
      )}

      {/* Canvas da Peça Visual Renderizada (Alvo PNG/PDF Seguro Tailwind v4) */}
      <div className="flex justify-center p-4 bg-muted/20 rounded-xl overflow-hidden">
        <CreativeArtboardRenderer
          id={stageId}
          archetype={mappedArchetype}
          themeId={themeId || PALETTE_TO_THEME.brand}
          aspectRatio={RATIO_MAP[aspectRatio]}
          badge={effectiveBadge}
          headline={effectiveHeadline}
          subheadline={effectiveSubheadline}
          bullets={effectiveBullets}
          offerBadge={offerBadge}
          offerPrice={editOfferPrice || undefined}
          installments={installments}
          ctaText={effectiveCtaText}
          brandName={editStoreName}
          brandHandle={brandHandle}
          locationLabel={locationLabel}
          logoUrl={editLogoUrl || undefined}
          imageUrl={effectiveImageUrl || undefined}
          imageOverlayPercent={overlayPercent}
        />
      </div>

      {/* Pilha oculta fora da viewport para exportação multi-página de carrossel */}
      {hasCarousel && (
        <div
          aria-hidden="true"
          className="fixed left-full top-0 w-96 pointer-events-none"
        >
          {normalizedSlides.map((slide, idx) => (
            <CreativeArtboardRenderer
              key={`print-slide-${idx}`}
              id={`${stageId}-slide-${idx}`}
              archetype={mappedArchetype}
              themeId={themeId || PALETTE_TO_THEME.brand}
              aspectRatio={RATIO_MAP[aspectRatio]}
              badge={slide.badge ?? editBadge}
              headline={slide.headline}
              subheadline={
                template === "quote_testimonial"
                  ? quoteAuthor
                  : slide.subheadline ?? editSubheadline
              }
              bullets={Array.isArray(slide.bullets) ? slide.bullets : effectiveBullets}
              offerBadge={offerBadge}
              offerPrice={editOfferPrice || undefined}
              installments={installments}
              ctaText={slide.ctaText ?? editCtaText}
              brandName={editStoreName}
              brandHandle={brandHandle}
              locationLabel={locationLabel}
              logoUrl={editLogoUrl || undefined}
              imageUrl={slide.imageUrl ?? editImageUrl ?? undefined}
              imageOverlayPercent={overlayPercent}
            />
          ))}
        </div>
      )}

      {/* Caixa de Texto da Legenda Completa Pronta para Publicar */}
      <div className="rounded-xl bg-muted/30 p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Legenda do Post</span>
          <button
            type="button"
            onClick={handleCopyCaption}
            className="text-2xs text-primary hover:underline cursor-pointer rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-11 min-h-11 sm:h-auto px-2"
          >
            {copiedCaption ? "Copiada!" : "Copiar Texto"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">
          {fullCaption}
        </p>
      </div>

      {(onOpenInStudio || onPublish) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {onOpenInStudio && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenInStudio(currentSnapshot)}
              className="flex-1 h-11 min-h-11 rounded-xl text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <span>Abrir no Estúdio</span>
            </Button>
          )}
          {onPublish && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPublish(currentSnapshot)}
              className="flex-1 h-11 min-h-11 rounded-xl text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <span>Publicar</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

