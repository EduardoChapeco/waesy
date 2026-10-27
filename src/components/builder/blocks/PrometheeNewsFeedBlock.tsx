import React, { useMemo, useState } from "react";
import {
  Bookmark,
  Clock,
  Heart,
  Layers,
  MessageCircle,
  Newspaper,
  Share2,
} from "lucide-react";
import type { BaseSiteBlockProps, PrometheeNewsFeedBlockData } from "@/types/omni-builder";
import { normalizePrometheeArticle, type NormalizedPrometheeArticle } from "@/lib/news/news-studio-templates";
import { usePrometheePortalController } from "@/components/news/promethee-portal-store";
import { PrometheeNewsStudioModal } from "@/components/news/promethee-news-studio-modal";
import { PrometheeTrendingMarkerStrip } from "@/components/news/promethee-trending-marker-strip";
import { EditorialAdSlot } from "@/components/news/editorial-ad-slot";

export interface PrometheeNewsFeedBlockProps extends BaseSiteBlockProps {
  data: PrometheeNewsFeedBlockData;
  isEditing?: boolean;
  products?: any[];
  newsArticles?: any[];
  sponsors?: any[];
}

export function PrometheeNewsFeedBlock({
  id,
  className = "",
  styling,
  data,
  isEditing = false,
  products = [],
  newsArticles = [],
  sponsors = [],
}: PrometheeNewsFeedBlockProps) {
  const portal = usePrometheePortalController();
  const [shareFeedbackId, setShareFeedbackId] = useState<string | null>(null);

  const allArticles = useMemo<NormalizedPrometheeArticle[]>(() => {
    const mode = data?.dataSource || "approved_mined_AND_custom";
    const minedRaw =
      Array.isArray(newsArticles) && newsArticles.length > 0
        ? newsArticles
        : Array.isArray(products) && products.length > 0
          ? products
          : [];
    const customRaw = Array.isArray(data?.articles) ? data.articles : [];

    let combinedRaw: any[] = [];
    if (mode === "approved_mined_only") {
      combinedRaw = minedRaw.length > 0 ? minedRaw : customRaw;
    } else if (mode === "custom_editorial") {
      combinedRaw = customRaw.length > 0 ? customRaw : minedRaw;
    } else {
      combinedRaw = minedRaw.length > 0 ? [...minedRaw, ...customRaw] : customRaw;
    }

    const seenSlugs = new Set<string>();
    const normalized: NormalizedPrometheeArticle[] = [];

    for (const cit of portal.citizenArticles) {
      seenSlugs.add(cit.slug);
      normalized.push(cit);
    }

    combinedRaw.forEach((raw, idx) => {
      const art = normalizePrometheeArticle(raw, idx);
      if (!seenSlugs.has(art.slug)) {
        seenSlugs.add(art.slug);
        normalized.push(art);
      }
    });

    return normalized;
  }, [data?.articles, data?.dataSource, newsArticles, portal.citizenArticles, products]);

  const filteredArticles = useMemo<NormalizedPrometheeArticle[]>(() => {
    return allArticles
      .filter((art) => {
        if (portal.selectedTab === "Salvos" && !portal.savedIds[art.id]) return false;
        if (
          portal.selectedTab !== "Para você" &&
          portal.selectedTab !== "Salvos" &&
          art.category.toLowerCase() !== portal.selectedTab.toLowerCase()
        ) {
          if (!(portal.selectedTab === "Urgente" && art.isBreaking)) {
            return false;
          }
        }
        if (
          portal.selectedCity !== "Todas as Cidades" &&
          portal.selectedCity !== "Notícias do Vale" &&
          art.city.toLowerCase() !== portal.selectedCity.toLowerCase()
        ) {
          return false;
        }
        if (portal.searchQuery.trim().length > 0) {
          const q = portal.searchQuery.toLowerCase();
          const hit =
            art.title.toLowerCase().includes(q) ||
            art.lead.toLowerCase().includes(q) ||
            art.city.toLowerCase().includes(q) ||
            art.category.toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      })
      .slice(0, data?.maxItems || 12);
  }, [
    allArticles,
    data?.maxItems,
    portal.savedIds,
    portal.searchQuery,
    portal.selectedCity,
    portal.selectedTab,
  ]);

  if (portal.activeArticle && !isEditing) return null;

  const handleShare = async (art: NormalizedPrometheeArticle) => {
    if (typeof window === "undefined") return;
    const base = data?.articlePageHref
      ? new URL(data.articlePageHref, window.location.origin).toString()
      : window.location.origin + window.location.pathname;
    const sep = base.includes("?") ? "&" : "?";
    const shareUrl = `${base}${sep}artigo=${encodeURIComponent(art.slug || art.id)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: art.title,
          text: art.lead,
          url: shareUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedbackId(art.id);
        setTimeout(() => setShareFeedbackId(null), 2200);
      }
    } catch {
      // Cancelado pelo leitor
    }
  };

  const inlineStyle: React.CSSProperties = {};
  if (styling?.backgroundColor) inlineStyle.backgroundColor = styling.backgroundColor;
  if (styling?.textColor) inlineStyle.color = styling.textColor;

  const layoutMode = data?.layoutMode || "feed_stream";
  const gridClass =
    layoutMode === "bento_2col"
      ? "grid grid-cols-1 md:grid-cols-2 gap-4"
      : layoutMode === "vitrine_shelf"
        ? "waesy-tab-strip flex flex-nowrap items-stretch gap-4 pb-2 snap-x snap-mandatory"
        : "space-y-4 max-w-3xl mx-auto";

  const activeSponsor = Array.isArray(sponsors) && sponsors.length > 0 ? sponsors[0] : null;

  return (
    <section
      id={id}
      style={inlineStyle}
      aria-label={data?.sectionTitle || "Destaques"}
      className={`bg-background text-foreground py-6 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
            {portal.selectedTab === "Para você"
              ? data?.sectionTitle || "Destaques"
              : portal.selectedTab}
          </h2>
          {portal.selectedCity !== "Todas as Cidades" && (
            <button
              type="button"
              onClick={() => portal.setSelectedCity("Todas as Cidades")}
              className="h-11 min-h-11 px-4 rounded-full border border-border bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {portal.selectedCity} · Limpar
            </button>
          )}
        </div>

        {filteredArticles.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center space-y-3 max-w-xl mx-auto">
            <div className="size-12 rounded-2xl border border-border bg-muted/30 flex items-center justify-center mx-auto">
              <Newspaper className="size-5 text-muted-foreground" />
            </div>
            <h3 className="text-base font-bold text-foreground">Nenhuma matéria neste filtro</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Altere a cidade ou editoria para visualizar todas as publicações verificadas.
            </p>
            <button
              type="button"
              onClick={() => {
                portal.setSelectedCity("Todas as Cidades");
                portal.setSelectedTab("Para você");
                portal.setSearchQuery("");
              }}
              className="h-11 min-h-11 px-5 rounded-full bg-foreground text-background hover:bg-foreground/90 text-xs font-bold inline-flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ver todas as notícias
            </button>
          </div>
        ) : (
          <div className={gridClass}>
            {filteredArticles.map((art, index) => {
              const isLiked = Boolean(portal.likedIds[art.id]);
              const isSaved = Boolean(portal.savedIds[art.id]);
              const cardWidthClass = layoutMode === "vitrine_shelf" ? "w-80 sm:w-96 shrink-0" : "w-full";

              return (
                <React.Fragment key={art.id}>
                  {index === 1 && layoutMode === "feed_stream" && portal.selectedTab === "Para você" && !portal.searchQuery && (
                    <PrometheeTrendingMarkerStrip
                      onSelectTopic={(topic) => {
                        portal.setSelectedTab("Para você");
                        portal.setSearchQuery(topic.tag);
                      }}
                    />
                  )}
                  <article
                    className={`${cardWidthClass} rounded-3xl border border-border bg-card p-4 sm:p-5 flex flex-col justify-between gap-4`}
                  >
                    <div className="space-y-4">
                      {/* Foto Real de Capa (Omitida Honestamente quando ausente — Invariante B.8/B.33) */}
                      {art.coverImageUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            portal.openArticle(
                              art,
                              isEditing ? undefined : data?.articlePageHref || undefined,
                            )
                          }
                          className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <img
                            src={art.coverImageUrl}
                            alt={art.title}
                            loading="lazy"
                            className="size-full object-cover"
                          />
                          <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-background/90 text-foreground text-xs font-bold">
                            {art.category}
                          </span>
                          <span className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-background/90 text-foreground text-xs font-semibold inline-flex items-center gap-1">
                            <Clock className="size-3" />
                            <span>{art.publishedAgo}</span>
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-3 py-1 rounded-full border border-border bg-muted/40 text-xs font-bold text-foreground">
                            {art.category} · {art.city}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                            <Clock className="size-3" />
                            <span>{art.publishedAgo}</span>
                          </span>
                        </div>
                      )}

                      <div className="space-y-2">
                        {art.coverImageUrl && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            <span>{art.city}</span>
                            <span>·</span>
                            <span>{art.readingTime}</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            portal.openArticle(
                              art,
                              isEditing ? undefined : data?.articlePageHref || undefined,
                            )
                          }
                          className="text-left block w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <h3 className="text-lg sm:text-xl font-extrabold text-foreground leading-snug text-anti-truncate">
                            {art.title}
                          </h3>
                        </button>

                        <p className="text-sm text-muted-foreground leading-relaxed text-anti-truncate">
                          {art.lead}{" "}
                          <button
                            type="button"
                            onClick={() =>
                              portal.openArticle(
                                art,
                                isEditing ? undefined : data?.articlePageHref || undefined,
                              )
                            }
                            className="inline font-bold text-foreground underline underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                          >
                            {data?.readMoreLabel || "Ler mais"}
                          </button>
                        </p>
                      </div>
                    </div>

                    {/* Barra Minimalista estilo Threads / Prométhée */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => portal.toggleLike(art.id)}
                          className={`h-11 min-h-11 px-3 rounded-full inline-flex items-center gap-1 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            isLiked
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          }`}
                          aria-label="Curtir matéria"
                        >
                          <Heart className="size-4" />
                          <span>{art.likesCount + (isLiked ? 1 : 0)}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            portal.openArticle(
                              art,
                              isEditing ? undefined : data?.articlePageHref || undefined,
                            )
                          }
                          className="h-11 min-h-11 px-3 rounded-full inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Comentários da matéria"
                        >
                          <MessageCircle className="size-4" />
                          <span>{art.commentsCount}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare(art)}
                          className="size-11 min-h-11 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Compartilhar link"
                        >
                          <Share2 className="size-4" />
                        </button>

                        {shareFeedbackId === art.id && (
                          <span className="text-xs font-semibold text-foreground px-1">
                            Link copiado
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => portal.openStudio(art)}
                          className="size-11 min-h-11 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Criar post PNG desta notícia"
                        >
                          <Layers className="size-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => portal.toggleSave(art.id)}
                          className={`size-11 min-h-11 rounded-full inline-flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            isSaved
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          }`}
                          aria-label="Salvar matéria"
                        >
                          <Bookmark className="size-4" />
                        </button>
                      </div>
                    </div>
                  </article>

                  {/* Slot ADS In-Feed Conectado à Rede de Display Editorial */}
                  {data?.showInFeedAd !== false &&
                    layoutMode === "feed_stream" &&
                    index === 1 && (
                      <EditorialAdSlot
                        placementZone="feed_in_stream"
                        storeId={portal.storeId || ""}
                        viewerCity={portal.selectedCity}
                        category={portal.selectedTab !== "Para você" && portal.selectedTab !== "Salvos" ? portal.selectedTab : undefined}
                      />
                    )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      <PrometheeNewsStudioModal
        isOpen={portal.isStudioModalOpen}
        initialArticle={portal.studioArticle}
        availableArticles={allArticles}
        onClose={() => portal.closeStudio()}
      />
    </section>
  );
}
