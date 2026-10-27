import React, { useEffect, useRef, useState, useId } from "react";
import { ExternalLink, Megaphone, ShieldCheck } from "lucide-react";
import {
  type CanonicalEditorialPlacementZone,
  type EditorialAdSlotResolution,
  resolveEditorialAdPlacementsFn,
  recordEditorialAdEventFn,
} from "@/services/news.functions";

export interface EditorialAdSlotProps {
  placementZone: CanonicalEditorialPlacementZone;
  storeId: string;
  articleId?: string;
  pageSlug?: string;
  viewerCity?: string;
  category?: string;
  preloadedAd?: EditorialAdSlotResolution | null;
  className?: string;
  onAdResolved?: (ad: EditorialAdSlotResolution) => void;
}

const ZONE_CONTAINER_CLASSES: Record<CanonicalEditorialPlacementZone, string> = {
  portal_top_billboard: "min-h-24 sm:min-h-28 md:min-h-32",
  breaking_rail_card: "min-h-20 sm:min-h-24",
  feed_in_stream: "aspect-video sm:min-h-48",
  sidebar_sticky: "min-h-64 sm:min-h-72",
  article_hero_sponsor: "aspect-video sm:min-h-40",
  article_inline_mid: "aspect-video sm:min-h-44",
  article_footer_cta: "min-h-32 sm:min-h-36",
  builder_custom_slot: "min-h-32",
};

const ZONE_HUMAN_LABELS: Record<CanonicalEditorialPlacementZone, string> = {
  portal_top_billboard: "Superbanner Topo",
  breaking_rail_card: "Destaque Giro Rápido",
  feed_in_stream: "Patrocinado no Feed",
  sidebar_sticky: "Mídia Lateral",
  article_hero_sponsor: "Apresentador da Matéria",
  article_inline_mid: "Publicidade no Texto",
  article_footer_cta: "Rodapé Comercial",
  builder_custom_slot: "Espaço Promocional",
};

function getOrCreateSessionToken(): string {
  if (typeof window === "undefined") return "ssr_session";
  try {
    let token = window.sessionStorage.getItem("waesy_ad_session_v1");
    if (!token) {
      token = "sess_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      window.sessionStorage.setItem("waesy_ad_session_v1", token);
    }
    return token;
  } catch {
    return "session_fallback";
  }
}

function detectDeviceType(): "desktop" | "mobile" | "tablet" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function EditorialAdSlot({
  placementZone,
  storeId,
  articleId,
  pageSlug,
  viewerCity,
  category,
  preloadedAd,
  className = "",
  onAdResolved,
}: EditorialAdSlotProps) {
  const [ad, setAd] = useState<EditorialAdSlotResolution | null>(preloadedAd || null);
  const [isLoading, setIsLoading] = useState<boolean>(!preloadedAd);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasDispatchedLoadedRef = useRef(false);
  const hasDispatchedViewableRef = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dwellStartRef = useRef<number | null>(null);
  const totalDwellSecondsRef = useRef<number>(0);
  const slotUniqueId = useId();

  // 1. Resolução do anúncio caso não venha pré-carregado
  useEffect(() => {
    if (preloadedAd) {
      setAd(preloadedAd);
      setIsLoading(false);
      onAdResolved?.(preloadedAd);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    resolveEditorialAdPlacementsFn({
      data: {
        storeId,
        articleId,
        pageSlug,
        placementZones: [placementZone],
        viewerCity,
        category,
      },
    })
      .then((res) => {
        if (!isMounted) return;
        const resolved = res[placementZone];
        setAd(resolved || null);
        setIsLoading(false);
        if (resolved) {
          onAdResolved?.(resolved);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const fallback: EditorialAdSlotResolution = {
          placement_zone: placementZone,
          status: "house_ad",
          sponsor: null,
          is_exclusive: false,
          is_house_ad: true,
          rendered_creative: {
            banner_url: null,
            headline: "Espaço Publicitário Disponível",
            cta_label: "Anuncie no Portal",
            target_url: `/paginas/anuncie?portal=${storeId}&zone=${placementZone}`,
          },
        };
        setAd(fallback);
        setIsLoading(false);
        onAdResolved?.(fallback);
      });

    return () => {
      isMounted = false;
    };
  }, [storeId, articleId, pageSlug, placementZone, viewerCity, category, preloadedAd, onAdResolved]);

  // 2. Disparo de ad_loaded no DOM
  useEffect(() => {
    if (!ad || ad.status === "disabled" || hasDispatchedLoadedRef.current) return;
    hasDispatchedLoadedRef.current = true;

    const sessionToken = getOrCreateSessionToken();
    const deviceType = detectDeviceType();

    recordEditorialAdEventFn({
      data: {
        storeId,
        sponsorId: ad.sponsor?.id || null,
        placementZone,
        articleId,
        pageSlug,
        eventType: "ad_loaded",
        isExclusive: ad.is_exclusive,
        viewerCity,
        deviceType,
        sessionToken,
      },
    }).catch(() => {});
  }, [ad, storeId, placementZone, articleId, pageSlug, viewerCity]);

  // 3. Telemetria IAB Viewability (50% visível por >= 1000ms contínuos) + Dwell Time
  useEffect(() => {
    if (!ad || ad.status === "disabled" || !containerRef.current) return;

    const el = containerRef.current;
    const sessionToken = getOrCreateSessionToken();
    const deviceType = detectDeviceType();

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!dwellStartRef.current) {
            dwellStartRef.current = Date.now();
          }

          if (!hasDispatchedViewableRef.current && !viewTimerRef.current) {
            viewTimerRef.current = setTimeout(() => {
              hasDispatchedViewableRef.current = true;
              recordEditorialAdEventFn({
                data: {
                  storeId,
                  sponsorId: ad.sponsor?.id || null,
                  placementZone,
                  articleId,
                  pageSlug,
                  eventType: "viewable_impression",
                  isExclusive: ad.is_exclusive,
                  viewerCity,
                  deviceType,
                  sessionToken,
                },
              }).catch(() => {});
            }, 1000);
          }
        } else {
          if (viewTimerRef.current) {
            clearTimeout(viewTimerRef.current);
            viewTimerRef.current = null;
          }
          if (dwellStartRef.current) {
            const elapsed = Math.round((Date.now() - dwellStartRef.current) / 1000);
            totalDwellSecondsRef.current += elapsed;
            dwellStartRef.current = null;
          }
        }
      },
      { threshold: [0, 0.5, 1.0] },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
      if (dwellStartRef.current) {
        const elapsed = Math.round((Date.now() - dwellStartRef.current) / 1000);
        totalDwellSecondsRef.current += elapsed;
        dwellStartRef.current = null;
      }

      if (totalDwellSecondsRef.current >= 3) {
        recordEditorialAdEventFn({
          data: {
            storeId,
            sponsorId: ad.sponsor?.id || null,
            placementZone,
            articleId,
            pageSlug,
            eventType: "view_duration",
            isExclusive: ad.is_exclusive,
            viewerCity,
            deviceType,
            sessionToken,
            durationSeconds: totalDwellSecondsRef.current,
          },
        }).catch(() => {});
      }
    };
  }, [ad, storeId, placementZone, articleId, pageSlug, viewerCity]);

  // Se desativado para Brand Safety, omite sem gerar shift de layout
  if (ad?.status === "disabled") {
    return null;
  }

  // Tratamento de clique com injeção de UTMs auditáveis
  const handleClick = () => {
    const sessionToken = getOrCreateSessionToken();
    const deviceType = detectDeviceType();

    recordEditorialAdEventFn({
      data: {
        storeId,
        sponsorId: ad?.sponsor?.id || null,
        placementZone,
        articleId,
        pageSlug,
        eventType: "click",
        isExclusive: ad?.is_exclusive || false,
        viewerCity,
        deviceType,
        sessionToken,
      },
    }).catch(() => {});
  };

  const getTrackedUrl = (originalUrl: string): string => {
    if (!originalUrl || originalUrl === "#") return "#";
    try {
      const u = new URL(originalUrl, window.location.origin);
      u.searchParams.set("utm_source", "waesy_news");
      u.searchParams.set("utm_medium", "display_portal");
      u.searchParams.set("utm_campaign", ad?.sponsor?.tier || "editorial");
      u.searchParams.set("utm_content", placementZone);
      return u.toString();
    } catch {
      return originalUrl;
    }
  };

  const containerClass = ZONE_CONTAINER_CLASSES[placementZone] || "min-h-24";
  const zoneLabel = ZONE_HUMAN_LABELS[placementZone] || "Publicidade";

  if (isLoading) {
    return (
      <div
        className={`w-full overflow-hidden rounded-2xl border border-border/40 bg-muted/20 p-4 ${containerClass} ${className} flex items-center justify-center`}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-border bg-card px-2 py-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              ADS
            </span>
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:hidden" />
          </div>
          <span className="text-xs font-medium tracking-wider uppercase">Carregando anúncio</span>
        </div>
      </div>
    );
  }

  if (!ad) {
    return null;
  }

  const creative = ad.rendered_creative;
  const targetUrl = getTrackedUrl(creative.target_url);

  // Layout para House Ad (Espaço Disponível / Anuncie Aqui)
  if (ad.is_house_ad) {
    return (
      <div
        ref={containerRef}
        id={`slot-${slotUniqueId}`}
        className={`group relative w-full overflow-hidden rounded-2xl border border-dashed border-border/80 bg-muted/30 p-4 transition-colors hover:border-primary/50 hover:bg-muted/50 ${className}`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Megaphone className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-border bg-card px-2 py-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  ADS
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {zoneLabel}
                </span>
                <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  Disponível
                </span>
              </div>
              <h4 className="text-sm font-bold text-foreground">
                Sua marca em destaque neste espaço
              </h4>
            </div>
          </div>

          <a
            href={targetUrl}
            onClick={handleClick}
            className="flex h-11 min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {creative.cta_label}
            <ExternalLink className="size-4" />
          </a>
        </div>
      </div>
    );
  }

  // Layout para Patrocinador Real com Criativo Visual
  const hasBanner = Boolean(creative.banner_url);

  return (
    <div
      ref={containerRef}
      id={`slot-${slotUniqueId}`}
      className={`group relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors hover:border-border ${className}`}
    >
      {/* Header com selo de transparência editorial */}
      <div className="flex items-center justify-between border-b border-border/30 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-border bg-card px-2 py-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            ADS
          </span>
          <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold uppercase tracking-wider">
            {ad.is_exclusive ? "Patrocinador Exclusivo" : "Conteúdo Publicitário"}
          </span>
          <span className="text-muted-foreground/60">•</span>
          <span>{zoneLabel}</span>
        </div>
        {ad.sponsor?.tier && (
          <span className="rounded bg-primary/10 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            {ad.sponsor.tier}
          </span>
        )}
      </div>

      {/* Conteúdo do Criativo */}
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {hasBanner ? (
          <div className="relative w-full overflow-hidden bg-muted">
            <img
              src={creative.banner_url!}
              alt={creative.headline}
              loading="lazy"
              className={`w-full object-cover transition-transform duration-300 group-hover:scale-102 ${containerClass}`}
            />
            {/* Barra inferior utilitária com call to action */}
            <div className="flex items-center justify-between border-t border-border/40 bg-card/95 p-3 text-card-foreground">
              <span className="text-sm font-bold line-clamp-1">
                {creative.headline}
              </span>
              <span className="flex h-11 min-h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary/90">
                {creative.cta_label}
                <ExternalLink className="size-3" />
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              {ad.sponsor?.logo_url && (
                <img
                  src={ad.sponsor.logo_url}
                  alt={creative.headline}
                  className="size-12 rounded-xl object-contain border border-border/40 bg-muted/20 p-1"
                />
              )}
              <div>
                <h4 className="text-base font-bold text-foreground line-clamp-1">
                  {creative.headline}
                </h4>
                {ad.sponsor?.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {ad.sponsor.description}
                  </p>
                )}
              </div>
            </div>

            <span className="flex h-11 min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              {creative.cta_label}
              <ExternalLink className="size-4" />
            </span>
          </div>
        )}
      </a>
    </div>
  );
}
