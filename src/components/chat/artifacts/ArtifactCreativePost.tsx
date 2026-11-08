import React, { useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Download,
  Share2,
  RefreshCw,
  Palette,
  Type,
  Layout,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PostAspectRatio = "square" | "portrait" | "story";
export type PostThemePalette =
  | "brand"
  | "dark_minimal"
  | "warm_gold"
  | "ocean_cyan"
  | "editorial_beige";

export type PostLayoutTemplate =
  | "headline_lead"
  | "bullet_checklist"
  | "quote_testimonial"
  | "promo_offer";

export interface ArtifactCreativePostProps {
  title: string;
  badge?: string;
  headline?: string;
  subheadline?: string;
  bullets?: string[];
  quoteAuthor?: string;
  ctaText?: string;
  storeName?: string;
  caption?: string;
  hashtags?: string[];
  offerPrice?: string;
  offerBadge?: string;
  className?: string;
}

export function ArtifactCreativePost({
  title,
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
  caption,
  hashtags = ["#VendasLocais", "#NegociosLocais", "#Empreendedorismo", "#Marketing"],
  offerPrice,
  offerBadge = "Oferta Limitada",
  className,
}: ArtifactCreativePostProps) {
  const [aspectRatio, setAspectRatio] = useState<PostAspectRatio>("square");
  const [palette, setPalette] = useState<PostThemePalette>("brand");
  const [template, setTemplate] = useState<PostLayoutTemplate>("headline_lead");
  const [copiedCaption, setCopiedCaption] = useState(false);

  const fullCaption =
    caption ||
    `${headline}\n\n${subheadline}\n\n${bullets.map((b) => `• ${b}`).join("\n")}\n\n${ctaText}: Link na bio!\n\n${hashtags.join(" ")}`;

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(fullCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const getPaletteStyles = () => {
    switch (palette) {
      case "dark_minimal":
        return {
          bg: "bg-card text-foreground border-border",
          accentBadge: "bg-muted text-foreground border-border",
          cta: "bg-foreground text-background font-semibold",
          sub: "text-muted-foreground",
        };
      case "warm_gold":
        return {
          bg: "bg-card text-foreground border-border",
          accentBadge: "bg-primary/10 text-primary border-primary/20",
          cta: "bg-primary text-primary-foreground font-semibold",
          sub: "text-muted-foreground",
        };
      case "ocean_cyan":
        return {
          bg: "bg-card text-foreground border-border",
          accentBadge: "bg-secondary text-secondary-foreground border-border",
          cta: "bg-secondary text-secondary-foreground font-semibold",
          sub: "text-muted-foreground",
        };
      case "editorial_beige":
        return {
          bg: "bg-muted text-foreground border-border",
          accentBadge: "bg-background text-foreground border-border",
          cta: "bg-foreground text-background font-semibold",
          sub: "text-muted-foreground",
        };
      case "brand":
      default:
        return {
          bg: "bg-card text-foreground border-border",
          accentBadge: "bg-primary/10 text-primary border-primary/20",
          cta: "bg-primary text-primary-foreground font-semibold",
          sub: "text-muted-foreground",
        };
    }
  };

  const pStyles = getPaletteStyles();

  const getAspectRatioStyle = (): React.CSSProperties => {
    switch (aspectRatio) {
      case "portrait":
        return { aspectRatio: "4/5", maxWidth: "24rem" };
      case "story":
        return { aspectRatio: "9/16", maxWidth: "20rem" };
      case "square":
      default:
        return { aspectRatio: "1/1", maxWidth: "24rem" };
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Cabeçalho de Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary shrink-0" />
            <h2 className="text-base font-bold text-foreground">{title}</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gerador de Peças Visuais & Anúncios Multiformato
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyCaption}
            className="h-11 min-h-11 px-3 text-xs gap-2 focus-visible:ring-2 focus-visible:ring-primary"
          >
            {copiedCaption ? (
              <Check className="size-4 text-emerald-600" />
            ) : (
              <Copy className="size-4" />
            )}
            <span>{copiedCaption ? "Copiada!" : "Copiar Legenda"}</span>
          </Button>
        </div>
      </div>

      {/* Barra de Ajustes Interativos: Proporção, Paleta, Template */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Proporção */}
        <div className="space-y-1">
          <label className="text-2xs font-semibold text-muted-foreground">
            Formato / Proporção
          </label>
          <div className="inline-flex w-full rounded-lg bg-muted p-1 text-xs">
            {(
              [
                ["square", "1:1 Feed"],
                ["portrait", "4:5 Retrato"],
                ["story", "9:16 Story"],
              ] as const
            ).map(([ratio, label]) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                className={cn(
                  "flex-1 py-2 text-center rounded-md text-2xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  aspectRatio === ratio
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Paleta Tonal */}
        <div className="space-y-1">
          <label className="text-2xs font-semibold text-muted-foreground">
            Paleta de Estilo
          </label>
          <div className="inline-flex w-full rounded-lg bg-muted p-1 text-xs">
            {(
              [
                ["brand", "Tema"],
                ["dark_minimal", "Escuro"],
                ["warm_gold", "Âmbar"],
                ["editorial_beige", "Editorial"],
              ] as const
            ).map(([pal, label]) => (
              <button
                key={pal}
                type="button"
                onClick={() => setPalette(pal)}
                className={cn(
                  "flex-1 py-2 text-center rounded-md text-2xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  palette === pal
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Layout do Conteúdo */}
        <div className="space-y-1">
          <label className="text-2xs font-semibold text-muted-foreground">
            Tipo de Peça
          </label>
          <div className="inline-flex w-full rounded-lg bg-muted p-1 text-xs">
            {(
              [
                ["headline_lead", "Destaque"],
                ["bullet_checklist", "Lista"],
                ["promo_offer", "Oferta"],
              ] as const
            ).map(([tmpl, label]) => (
              <button
                key={tmpl}
                type="button"
                onClick={() => setTemplate(tmpl)}
                className={cn(
                  "flex-1 py-2 text-center rounded-md text-2xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  template === tmpl
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas da Peça Visual Renderizada */}
      <div className="flex justify-center p-4 bg-muted/20 rounded-xl border border-border/40 overflow-hidden">
        <div
          style={getAspectRatioStyle()}
          className={cn(
            "w-full rounded-2xl border p-6 flex flex-col justify-between shadow-xs transition-colors",
            pStyles.bg
          )}
        >
          {/* Topo do Card */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "px-3 py-1 rounded-full text-2xs font-semibold border",
                pStyles.accentBadge
              )}
            >
              {badge}
            </span>
            <span className={cn("text-2xs font-mono font-medium", pStyles.sub)}>
              {storeName}
            </span>
          </div>

          {/* Miolo do Card Conforme o Template Selecionado */}
          <div className="my-auto space-y-3 py-4">
            {template === "headline_lead" && (
              <>
                <h3 className="text-lg sm:text-xl font-bold leading-tight">
                  {headline}
                </h3>
                {subheadline && (
                  <p className={cn("text-xs leading-relaxed", pStyles.sub)}>
                    {subheadline}
                  </p>
                )}
              </>
            )}

            {template === "bullet_checklist" && (
              <>
                <h3 className="text-base font-bold leading-tight">{headline}</h3>
                <ul className="space-y-2 text-xs">
                  {bullets.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="size-3 text-primary shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {template === "promo_offer" && (
              <>
                <span className="inline-block px-2 py-1 rounded text-2xs font-bold uppercase tracking-wider bg-destructive text-destructive-foreground">
                  {offerBadge}
                </span>
                <h3 className="text-lg font-bold leading-tight">{headline}</h3>
                {offerPrice && (
                  <div className="text-2xl font-extrabold font-mono text-emerald-500">
                    {offerPrice}
                  </div>
                )}
                {subheadline && (
                  <p className={cn("text-xs", pStyles.sub)}>{subheadline}</p>
                )}
              </>
            )}
          </div>

          {/* Rodapé do Card */}
          <div className="pt-2 border-t border-current/10 flex items-center justify-between gap-3">
            <div className={cn("text-2xs", pStyles.sub)}>
              Toque duas vezes para salvar
            </div>
            <div
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-semibold shadow-xs",
                pStyles.cta
              )}
            >
              {ctaText}
            </div>
          </div>
        </div>
      </div>

      {/* Caixa de Texto da Legenda Completa Pronta para Publicar */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Legenda do Post</span>
          <button
            type="button"
            onClick={handleCopyCaption}
            className="text-2xs text-primary hover:underline cursor-pointer rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {copiedCaption ? "Copiada!" : "Copiar Texto"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">
          {fullCaption}
        </p>
      </div>
    </div>
  );
}
