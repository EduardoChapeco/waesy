import React, { useMemo } from "react";
import { Clock, Flame } from "lucide-react";
import type { BaseSiteBlockProps, PrometheeNewsBreakingBlockData } from "@/types/omni-builder";
import { normalizePrometheeArticle, type NormalizedPrometheeArticle } from "@/lib/news/news-studio-templates";
import { usePrometheePortalController } from "@/components/news/promethee-portal-store";

export interface PrometheeNewsBreakingBlockProps extends BaseSiteBlockProps {
  data: PrometheeNewsBreakingBlockData;
  isEditing?: boolean;
  products?: any[];
  newsArticles?: any[];
}

export function PrometheeNewsBreakingBlock({
  id,
  className = "",
  styling,
  data,
  isEditing = false,
  products = [],
  newsArticles = [],
}: PrometheeNewsBreakingBlockProps) {
  const portal = usePrometheePortalController();

  const breakingItems = useMemo<NormalizedPrometheeArticle[]>(() => {
    const rawPool =
      Array.isArray(newsArticles) && newsArticles.length > 0
        ? newsArticles
        : Array.isArray(products) && products.length > 0
          ? products
          : Array.isArray(data?.articles)
            ? data.articles
            : [];

    const normalized = rawPool.map((item, idx) => normalizePrometheeArticle(item, idx));
    const filteredCity =
      portal.selectedCity === "Todas as Cidades" || portal.selectedCity === "Notícias do Vale"
        ? normalized
        : normalized.filter((a) => a.city.toLowerCase() === portal.selectedCity.toLowerCase());

    const pool = filteredCity.length > 0 ? filteredCity : normalized;
    const prioritized = pool.filter((a) => a.isBreaking);
    const list = prioritized.length >= 2 ? prioritized : pool;
    return list.slice(0, data?.maxItems || 6);
  }, [data?.articles, data?.maxItems, newsArticles, portal.selectedCity, products]);

  if (portal.activeArticle && !isEditing) return null;
  if (breakingItems.length === 0) return null;

  const inlineStyle: React.CSSProperties = {};
  if (styling?.backgroundColor) inlineStyle.backgroundColor = styling.backgroundColor;
  if (styling?.textColor) inlineStyle.color = styling.textColor;

  return (
    <section
      id={id}
      style={inlineStyle}
      aria-label={data?.sectionTitle || "Plantão Regional"}
      className={`bg-background text-foreground py-4 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-foreground text-background text-xs font-extrabold uppercase tracking-wider">
              <Flame className="size-3" />
              <span>{data?.badgeLabel || "Plantão"}</span>
            </span>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              {data?.sectionTitle || "Plantão Regional"}
            </h2>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Deslize para ver mais →
          </span>
        </div>

        <div className="waesy-tab-strip flex flex-nowrap items-stretch gap-3 pb-2 pt-1 scroll-smooth snap-x snap-mandatory">
          {breakingItems.map((art) => (
            <button
              key={art.id}
              type="button"
              onClick={() =>
                portal.openArticle(art, isEditing ? undefined : data?.articlePageHref || undefined)
              }
              className="w-72 sm:w-80 shrink-0 snap-start rounded-3xl border border-border bg-card hover:bg-muted/30 p-3 text-left flex flex-col justify-between gap-3 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {art.coverImageUrl && (
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted">
                  <img
                    src={art.coverImageUrl}
                    alt={art.title}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                  <span className="absolute bottom-2 left-2 px-3 py-1 rounded-full bg-background/90 text-foreground text-xs font-bold">
                    {art.category}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {!art.coverImageUrl && (
                  <span className="inline-block px-3 py-1 rounded-full border border-border bg-muted/40 text-xs font-bold text-foreground">
                    {art.category} · {art.city}
                  </span>
                )}
                <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                  {art.title}
                </h3>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                <span>{art.city}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  <span>{art.publishedAgo}</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
