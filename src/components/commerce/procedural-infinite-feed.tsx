import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { OfferCard } from "@/components/commerce/offer-card";
import { StoreCard } from "@/components/commerce/store-card";
import { AdTelemetryBeacon } from "@/components/commerce/ad-telemetry-beacon";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import {
  getProceduralInfiniteFeedPage,
  type ProceduralFeedSectionDTO,
} from "@/services/surface-cms.functions";
import { Tag, Storefront, MapPin, CircleNotch, Sparkle } from "@phosphor-icons/react";

export interface ProceduralInfiniteFeedProps {
  initialExcludedStoreIds?: string[];
  initialExcludedProductIds?: string[];
  city?: string;
  pageSize?: number;
  className?: string;
}

export function ProceduralInfiniteFeed({
  initialExcludedStoreIds = [],
  initialExcludedProductIds = [],
  city,
  className = "",
}: ProceduralInfiniteFeedProps) {
  const [sections, setSections] = useState<ProceduralFeedSectionDTO[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const excludedStoreIdsRef = useRef<Set<string>>(new Set(initialExcludedStoreIds));
  const excludedProductIdsRef = useRef<Set<string>>(new Set(initialExcludedProductIds));
  const excludedClassifiedIdsRef = useRef<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadNextPage = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    try {
      const res = await getProceduralInfiniteFeedPage({
        data: {
          pageIndex,
          city,
          excludedStoreIds: Array.from(excludedStoreIdsRef.current),
          excludedProductIds: Array.from(excludedProductIdsRef.current),
          excludedClassifiedIds: Array.from(excludedClassifiedIdsRef.current),
        },
      });

      if (res.section) {
        setSections((prev) => [...prev, res.section!]);

        // Atualiza rastreadores de diversidade para não repetir
        if (res.section.store_id) {
          excludedStoreIdsRef.current.add(res.section.store_id);
        }
        res.section.items?.forEach((item: any) => {
          if (res.section!.type === "classifieds_spotlight") {
            excludedClassifiedIdsRef.current.add(item.id);
          } else {
            excludedProductIdsRef.current.add(item.id);
          }
        });
      }

      setHasMore(res.hasMore);
      setPageIndex(res.nextPageIndex);
    } catch (err) {
      console.warn("[ProceduralInfiniteFeed] Erro ao carregar próxima seção:", err);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, hasMore, isLoading, city]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadNextPage();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadNextPage, hasMore, isLoading]);

  return (
    <div className={`space-y-10 ${className}`}>
      {sections.map((section) => {
        if (!section.items || section.items.length === 0) return null;

        // ── 1. Spotlight de Loja Única (Com Telemetria Bilateral de Loja) ──
        if (section.type === "single_store_spotlight") {
          return (
            <AdTelemetryBeacon key={section.id} storeId={section.store_id}>
              <section aria-label={section.title} className="space-y-3">
                <HorizontalRail
                  title={section.title}
                  badge={section.badge_tag || "Parceiro Oficial"}
                  actionLabel={section.action_label || "Ver Loja"}
                  actionTo={section.action_to}
                >
                  {section.items.map((prod: any) => (
                    <div key={prod.id} className="w-[280px] sm:w-[320px] shrink-0 snap-start">
                      <OfferCard {...prod} />
                    </div>
                  ))}
                </HorizontalRail>
              </section>
            </AdTelemetryBeacon>
          );
        }

        // ── 2. Achados com Maior Desconto ──
        if (section.type === "flash_deal_rail") {
          return (
            <section key={section.id} aria-label={section.title} className="space-y-3">
              <HorizontalRail
                title={section.title}
                badge={section.badge_tag || "Ofertas"}
                actionLabel={section.action_label || "Ver todas"}
                actionTo={section.action_to}
              >
                {section.items.map((prod: any) => (
                  <div key={prod.id} className="w-[280px] sm:w-[320px] shrink-0 snap-start">
                    <OfferCard {...prod} />
                  </div>
                ))}
              </HorizontalRail>
            </section>
          );
        }

        // ── 3. Novos Estabelecimentos ──
        if (section.type === "store_rail") {
          return (
            <section key={section.id} aria-label={section.title} className="space-y-3">
              <HorizontalRail
                title={section.title}
                badge={section.badge_tag || "Novidade"}
                actionLabel={section.action_label || "Explorar"}
                actionTo={section.action_to}
              >
                {section.items.map((store: any) => (
                  <div key={store.id} className="w-[280px] sm:w-[310px] shrink-0 snap-start">
                    <StoreCard {...store} />
                  </div>
                ))}
              </HorizontalRail>
            </section>
          );
        }

        // ── 4. Oportunidades em Classificados ──
        if (section.type === "classifieds_spotlight") {
          return (
            <section key={section.id} aria-label={section.title} className="space-y-3">
              <HorizontalRail
                title={section.title}
                badge={section.badge_tag || "Classificados"}
                actionLabel={section.action_label || "Ver mais"}
                actionTo={section.action_to}
              >
                {section.items.map((item: any) => (
                  <Link
                    key={item.id}
                    to="/classificados/$id"
                    params={{ id: item.id }}
                    className="min-w-[250px] sm:min-w-[280px] max-w-[290px] shrink-0 group flex flex-col justify-between rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all shadow-2xs select-none"
                  >
                    <div className="relative aspect-16/10 w-full overflow-hidden bg-muted/30">
                      {item.cover_image ? (
                        <img
                          src={item.cover_image}
                          alt={item.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-full bg-muted/50 flex items-center justify-center">
                          <Tag size={28} className="text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5">
                        <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-[9px] font-bold uppercase">
                          {item.deal_type || "Anúncio"}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-1">
                      <p className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs font-black text-foreground font-mono">
                        {item.price_cents ? formatMoney(item.price_cents) : "Sob Consulta"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                        <MapPin size={11} className="shrink-0 text-primary" />
                        <span>{item.location_name || "Na sua região"}</span>
                      </p>
                    </div>
                  </Link>
                ))}
              </HorizontalRail>
            </section>
          );
        }

        return null;
      })}

      {/* ── Sentinela de Scroll Infinito ── */}
      <div ref={sentinelRef} className="py-4 flex items-center justify-center min-h-[40px]">
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <CircleNotch size={18} className="animate-spin text-primary" />
            <span>Descobrindo mais recomendações...</span>
          </div>
        )}
      </div>
    </div>
  );
}
