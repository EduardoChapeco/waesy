import React, { useMemo } from "react";
import { ArrowUpRight, Megaphone } from "lucide-react";
import type { BaseSiteBlockProps, PrometheeNewsAdSlotBlockData } from "@/types/omni-builder";
import { usePrometheePortalController } from "@/components/news/promethee-portal-store";

export interface PrometheeNewsAdSlotBlockProps extends BaseSiteBlockProps {
  data: PrometheeNewsAdSlotBlockData;
  isEditing?: boolean;
  sponsors?: any[];
}

export function PrometheeNewsAdSlotBlock({
  id,
  className = "",
  styling,
  data,
  isEditing = false,
  sponsors = [],
}: PrometheeNewsAdSlotBlockProps) {
  const portal = usePrometheePortalController();

  const resolvedAd = useMemo(() => {
    const activeCity = data?.targetCity || portal.selectedCity;
    if (Array.isArray(sponsors) && sponsors.length > 0) {
      const cityMatched =
        activeCity && activeCity !== "Todas as Cidades" && activeCity !== "Notícias do Vale"
          ? sponsors.find(
              (s) =>
                String(s.description || "").toLowerCase().includes(activeCity.toLowerCase()) ||
                String(s.name || "").toLowerCase().includes(activeCity.toLowerCase()),
            )
          : null;
      const chosen = cityMatched || sponsors[0];
      if (chosen) {
        return {
          sponsorName: chosen.name || data?.sponsorName || "Parceiro Verificado",
          headline: chosen.description || data?.headline || "Destaque regional verificado",
          description: activeCity && activeCity !== "Todas as Cidades"
            ? `Publicidade segmentada · ${activeCity}`
            : "Publicidade regional auditada",
          ctaLabel: chosen.cta_label || data?.ctaLabel || "Conhecer",
          ctaHref: chosen.website_url || data?.ctaHref || "/paginas/anuncie",
          imageUrl: chosen.banner_url || chosen.logo_url || data?.imageUrl || "",
        };
      }
    }

    return {
      sponsorName: data?.sponsorName || "Publicidade Regional",
      headline: data?.headline || "Destaque sua marca para leitores da sua cidade",
      description:
        data?.description ||
        "Formatos nativos com filtro geográfico por município e métricas em tempo real.",
      ctaLabel: data?.ctaLabel || "Anunciar",
      ctaHref: data?.ctaHref || "/paginas/anuncie",
      imageUrl: data?.imageUrl || "",
    };
  }, [data, portal.selectedCity, sponsors]);

  const inlineStyle: React.CSSProperties = {};
  if (styling?.backgroundColor) inlineStyle.backgroundColor = styling.backgroundColor;
  if (styling?.textColor) inlineStyle.color = styling.textColor;

  return (
    <aside
      id={id}
      style={inlineStyle}
      aria-label="Espaço publicitário"
      className={`bg-background text-foreground py-3 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="rounded-3xl border border-border bg-muted/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
            {resolvedAd.imageUrl ? (
              <div className="size-16 rounded-2xl overflow-hidden border border-border bg-card shrink-0">
                <img
                  src={resolvedAd.imageUrl}
                  alt={resolvedAd.sponsorName}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </div>
            ) : (
              <div className="size-12 rounded-2xl border border-border bg-card flex items-center justify-center shrink-0">
                <Megaphone className="size-5 text-foreground" />
              </div>
            )}

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 rounded-md border border-border bg-card text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  ADS
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                  {resolvedAd.sponsorName}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug text-anti-truncate">
                {resolvedAd.headline}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed text-anti-truncate">
                {resolvedAd.description}
              </p>
            </div>
          </div>

          <a
            href={isEditing ? undefined : resolvedAd.ctaHref}
            target={resolvedAd.ctaHref.startsWith("http") ? "_blank" : undefined}
            rel={resolvedAd.ctaHref.startsWith("http") ? "noopener noreferrer" : undefined}
            onClick={(e) => {
              if (isEditing) e.preventDefault();
            }}
            className="h-11 min-h-11 w-full sm:w-auto px-5 rounded-full bg-foreground text-background hover:bg-foreground/90 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shrink-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>{resolvedAd.ctaLabel}</span>
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>
    </aside>
  );
}
