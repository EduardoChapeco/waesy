import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { z } from "zod";
import { ShoppingBag, Calendar, Tag, Store, ChevronRight, Layers, Clock, Sparkles, TrendingUp, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

import {
  federatedSearch,
  getSearchDiscoveryData,
  type FederatedSearchResponse,
  type SearchResultProduct,
  type SearchResultEvent,
  type SearchResultClassified,
  type SearchResultStore,
} from "@/services/search.functions";
import { getUserTopAffinities } from "@/services/telemetry-affinity.functions";
import { ProductGrid } from "@/components/commerce/product-grid";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { PageSkeleton } from "@/components/state/loading";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import {
  DiscoveryControlBar,
  type ViewModeType,
  type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
import { MapLibreCanvas, type MapMarkerItem } from "@/components/mobility/maplibre-canvas";

const SearchSchema = z.object({
  q: z.string().optional(),
  tipo: z.enum(["product", "event", "classified", "store"]).optional(),
});

export const Route = createFileRoute("/_store/buscar")({
  head: () => ({ meta: [{ title: "Buscar na Plataforma" }] }),
  validateSearch: SearchSchema,
  loader: async ({ location }) => {
    try {
      const q = (location.search as { q?: string }).q;
      const [discoveryData, userAffinities] = await Promise.all([
        getSearchDiscoveryData().catch(() => null),
        getUserTopAffinities({ data: { limit: 5 } }).catch(() => []),
      ]);

      if (!q || q.trim().length < 2) {
        return { result: null, query: q ?? "", discoveryData, userAffinities };
      }
      try {
        const result = await federatedSearch({ data: { query: q.trim() } });
        return { result, query: q, discoveryData, userAffinities };
      } catch {
        return { result: null, query: q, discoveryData, userAffinities };
      }
    } catch (err) {
      console.error("[loader:_store.buscar] Unhandled loader error:", err);
      return { result: null, query: "", discoveryData: null, userAffinities: [] };
    }
  },
  pendingComponent: PageSkeleton,
  component: SearchPage,
});

const TYPE_FILTERS: FilterChipOption[] = [
 { id: "todos", label: "Tudo", icon: Layers as any },
 { id: "product", label: "Produtos", icon: ShoppingBag as any },
 { id: "classified", label: "Classificados", icon: Tag as any },
 { id: "store", label: "Lojas & Negócios", icon: Store as any },
 { id: "event", label: "Eventos", icon: Calendar as any },
];

function getTotalCount(result: FederatedSearchResponse | null): number {
 if (!result) return 0;
 return result.total;
}

// ── Cards de resultado ─────────────────────────────────────────────────────

function EventCard({ event, isMobileList = false }: { event: SearchResultEvent; isMobileList?: boolean }) {
  const date = new Date(event.event_date);
  const formatted = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (isMobileList) {
    return (
      <Link
        to="/evento/$id"
        params={{ id: event.id }}
        className="p-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors group cursor-pointer"
      >
        <div className="size-12 rounded-xl bg-muted/20 border border-border/40 shrink-0 overflow-hidden flex items-center justify-center">
          {event.cover_image ? (
            <img src={event.cover_image} alt={event.title} className="size-full object-cover" />
          ) : (
            <Calendar className="size-5 text-muted-foreground/40" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
            {event.title}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            <span>{formatted}</span>
            {event.location && (
              <>
                <span>•</span>
                <span className="truncate">{event.location}</span>
              </>
            )}
          </div>
          <span className="text-[10px] font-mono font-semibold text-muted-foreground">
            {event.is_free ? "Gratuito" : "Ingresso"}
          </span>
        </div>
        <ChevronRight className="size-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    );
  }

  return (
    <Link
      to="/evento/$id"
      params={{ id: event.id }}
      className="flex items-stretch rounded-2xl bg-card hover:bg-muted/50 transition-colors overflow-hidden p-0 group border border-border/60 shadow-2xs"
    >
      <div className="relative w-20 sm:w-24 bg-muted shrink-0 overflow-hidden">
        {event.cover_image ? (
          <img
            src={event.cover_image}
            alt={event.title}
            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="size-full bg-muted flex items-center justify-center">
            <Calendar className="size-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 p-3 space-y-1">
        <p className="font-semibold text-xs sm:text-sm text-foreground truncate group-hover:text-primary">
          {event.title}
        </p>
        <p className="text-xs text-muted-foreground">{formatted}</p>
        {event.location && (
          <p className="text-xs text-muted-foreground truncate">{event.location}</p>
        )}
        <Badge variant="outline" className="mt-1 text-[10px] font-mono border-border/70 py-0 px-1.5">
          {event.is_free ? "Gratuito" : "Pago"}
        </Badge>
      </div>
      <ChevronRight className="size-4 text-muted-foreground self-center mr-3 shrink-0" />
    </Link>
  );
}

function ClassifiedCard({ classified, isMobileList = false }: { classified: SearchResultClassified; isMobileList?: boolean }) {
  if (isMobileList) {
    return (
      <Link
        to="/classificados/$id"
        params={{ id: classified.id }}
        className="p-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors group cursor-pointer"
      >
        <div className="size-12 rounded-xl bg-muted/20 border border-border/40 shrink-0 overflow-hidden flex items-center justify-center">
          {classified.images && classified.images[0] ? (
            <img
              src={classified.images[0]}
              alt={classified.title}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <Tag size={20} className="text-muted-foreground/40" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
              {classified.title}
            </h4>
            {classified.category && (
              <span className="text-[9px] font-mono uppercase px-1 py-0 rounded border border-border/60 text-muted-foreground">
                {classified.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-black text-foreground text-xs">
              {classified.price_cents ? formatMoney(classified.price_cents) : "A combinar"}
            </span>
            {classified.location_text && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground text-[11px] truncate">{classified.location_text}</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    );
  }

  return (
    <Link
      to="/classificados/$id"
      params={{ id: classified.id }}
      className="flex items-stretch justify-between rounded-2xl bg-card hover:border-foreground/30 transition-all overflow-hidden p-0 group border border-border/60 shadow-2xs"
    >
      <div className="relative w-24 sm:w-28 bg-muted shrink-0 overflow-hidden">
        {classified.images && classified.images[0] ? (
          <img
            src={classified.images[0]}
            alt={classified.title}
            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="size-full flex items-center justify-center text-muted-foreground/30">
            <Tag size={24} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 p-3 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {classified.category && (
            <Badge variant="outline" className="text-[9px] uppercase font-mono px-1.5 py-0 border-border/70">
              {classified.category}
            </Badge>
          )}
          {(classified as any).deal_type && (
            <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold">
              • {(classified as any).deal_type}
            </span>
          )}
        </div>

        <h3 className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
          {classified.title}
        </h3>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono font-black text-foreground text-sm">
            {classified.price_cents ? formatMoney(classified.price_cents) : "A combinar"}
          </span>
          {classified.location_text && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground truncate">{classified.location_text}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function StoreCard({ store, isMobileList = false }: { store: SearchResultStore; isMobileList?: boolean }) {
  if (isMobileList) {
    return (
      <Link
        to="/vendedora/$slug"
        params={{ slug: store.slug }}
        className="p-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors group cursor-pointer"
      >
        <div className="size-11 rounded-xl bg-muted/20 border border-border/40 shrink-0 overflow-hidden flex items-center justify-center">
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.name} className="size-full object-cover" />
          ) : (
            <Store className="size-5 text-muted-foreground/50" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
            {store.name}
          </p>
          {store.description && (
            <p className="text-[11px] text-muted-foreground truncate">{store.description}</p>
          )}
        </div>
        <ChevronRight className="size-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    );
  }

  return (
    <Link
      to="/vendedora/$slug"
      params={{ slug: store.slug }}
      className="flex gap-3 p-3 rounded-2xl bg-card hover:bg-muted transition-colors group border border-border/60 shadow-2xs"
    >
      {store.logo_url ? (
        <img
          src={store.logo_url}
          alt={store.name}
          className="size-12 object-cover rounded-xl shrink-0"
        />
      ) : (
        <div className="size-12 bg-muted rounded-xl shrink-0 flex items-center justify-center">
          <Store className="size-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0 self-center">
        <p className="font-semibold text-sm text-foreground group-hover:text-primary">
          {store.name}
        </p>
        {store.description && (
          <p className="text-xs text-muted-foreground truncate">{store.description}</p>
        )}
      </div>
      <ChevronRight className="size-4 text-muted-foreground self-center shrink-0" />
    </Link>
  );
}

function ResultSection({
 title,
 count,
 icon: Icon,
 children,
}: {
 title: string;
 count: number;
 icon: React.ElementType;
 children: React.ReactNode;
}) {
 if (count === 0) return null;
 return (
 <section className="mb-8 space-y-3">
 <div className="flex items-center gap-2">
 <Icon className="size-4 text-primary" />
 <h2 className="text-sm font-bold text-foreground">{title}</h2>
 </div>
 <div className="space-y-2">{children}</div>
 </section>
 );
}

// ── Componente Principal ───────────────────────────────────────────────────

function SearchPage() {
  const {
    result: initialResult = null,
    query: initialQuery = "",
    discoveryData = null,
    userAffinities = [],
  } = ((Route.useLoaderData() as any) || {});
  const navigate = useNavigate();
  const [input, setInput] = useState(initialQuery ?? "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("waesy_recent_searches");
        return stored ? JSON.parse(stored) : [];
      }
    } catch {}
    return [];
  });

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem("waesy_recent_searches", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const removeRecentSearch = (term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((t) => t !== term);
      try {
        localStorage.setItem("waesy_recent_searches", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem("waesy_recent_searches");
    } catch {}
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const [result, setResult] = useState<FederatedSearchResponse | null>(initialResult);
  const [activeType, setActiveType] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<ViewModeType>("grid");

  const handleSearch = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;

    saveRecentSearch(trimmed);
    navigate({ to: Route.fullPath, search: { q: trimmed } });

    try {
      const res = await federatedSearch({ data: { query: trimmed } });
      setResult(res);
    } catch (e: unknown) {
      toast.error(
        (e instanceof Error ? e.message : String(e)) || "Erro ao buscar. Tente novamente.",
      );
      setResult(null);
    }
  };

  const onSearchInputChange = (val: string) => {
    setInput(val);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!val || val.trim().length < 2) {
      setResult(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      handleSearch(val);
    }, 300);
  };

  const total = getTotalCount(result);
  const hasResults = result !== null && total > 0;

  // Filtrar por tipo ativo
  const filteredProducts = activeType === "todos" || activeType === "product" ? (result?.products ?? []) : [];
  const filteredEvents = activeType === "todos" || activeType === "event" ? (result?.events ?? []) : [];
  const filteredClassifieds =
    activeType === "todos" || activeType === "classified" ? (result?.classifieds ?? []) : [];
  const filteredStores = activeType === "todos" || activeType === "store" ? (result?.stores ?? []) : [];

  const [selectedStoreMarker, setSelectedStoreMarker] = useState<any | null>(null);

  // Marcadores do Mapa — apenas lojas com coordenadas reais
  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    return filteredStores
      .filter((s) => s.latitude && s.longitude)
      .map((s) => ({
        id: s.id,
        title: s.name,
        lat: s.latitude!,
        lng: s.longitude!,
        category: "store",
        image_url: s.logo_url,
      }));
  }, [filteredStores]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-6">
      {/* ── 1. Barra de Busca Canônica Padronizada ── */}
      <DiscoveryControlBar
        search={input}
        onSearchChange={onSearchInputChange}
        searchPlaceholder="Busque por produtos, lojas, serviços, eventos..."
        categories={TYPE_FILTERS}
        activeCategory={activeType}
        onSelectCategory={setActiveType}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        allowedViewModes={["grid", "list", "feed"]}
        resultsCount={total}
      />

      {/* ── 2. Estado Inicial de Descoberta Visual (Instagram / Mercado Livre Style) ── */}
      {!input && !hasResults && (
        <div className="space-y-6 pt-1">
          {/* Histórico de Buscas Recentes */}
          {recentSearches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span>Buscas recentes</span>
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  Limpar tudo
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-xl text-xs font-semibold bg-muted/60 hover:bg-muted text-foreground transition-all group"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setInput(term);
                        handleSearch(term);
                      }}
                      className="cursor-pointer"
                    >
                      {term}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(term);
                      }}
                      className="size-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Remover termo"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recomendado para Você (Afinidade Real do Usuário) */}
          {userAffinities && userAffinities.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                <span>Recomendado para você</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {userAffinities.map((item: any) => {
                  const tagLabel = item.tag || item.category || String(item);
                  return (
                    <button
                      key={tagLabel}
                      type="button"
                      onClick={() => {
                        setInput(tagLabel);
                        handleSearch(tagLabel);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted/40 text-foreground border border-border/40 hover:bg-muted transition-all cursor-pointer select-none active:scale-95"
                    >
                      #{tagLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Em Alta na Cidade (Trending dinâmico do banco) */}
          {discoveryData?.trendingTerms && discoveryData.trendingTerms.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-primary" />
                <span>Em alta na região</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {discoveryData.trendingTerms.map((term: string) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setInput(term);
                      handleSearch(term);
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-card border border-border/60 hover:border-primary/40 hover:text-primary text-foreground transition-all cursor-pointer select-none active:scale-95"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Atalhos Rápidos para Verticais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {[
              { to: "/mercado", label: "Mercado & Feira", icon: ShoppingBag, color: "text-foreground bg-muted/30 border border-border/40" },
              { to: "/gastronomia", label: "Gastronomia", icon: Store, color: "text-foreground bg-muted/30 border border-border/40" },
              { to: "/classificados", label: "Classificados", icon: Tag, color: "text-foreground bg-muted/30 border border-border/40" },
              { to: "/agenda", label: "Eventos & Festas", icon: Calendar, color: "text-foreground bg-muted/30 border border-border/40" },
            ].map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.to}
                  to={cat.to as any}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-card border border-border/60 hover:bg-muted/40 transition-all group"
                >
                  <div className={`flex size-9 items-center justify-center rounded-xl ${cat.color} shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="size-4.5" />
                  </div>
                  <span className="text-xs font-bold text-foreground truncate">
                    {cat.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Mural de Descoberta Visual (Estilo Instagram / Mercado Livre) */}
          {discoveryData?.products && discoveryData.products.length > 0 && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black tracking-tight text-foreground">
                  Destaques da Comunidade
                </h3>
                <Link to="/mercado" className="text-xs font-semibold text-primary hover:underline">
                  Ver catálogo
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {discoveryData.products.slice(0, 8).map((p: any) => (
                  <Link
                    key={p.id}
                    to="/produto/$slug"
                    params={{ slug: p.slug || p.id }}
                    className="flex flex-col rounded-2xl overflow-hidden bg-card border border-border/60 hover:border-border transition-all group"
                  >
                    <div className="aspect-square bg-muted overflow-hidden relative">
                      {p.cover_url ? (
                        <img
                          src={p.cover_url}
                          alt={p.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-muted-foreground/30">
                          <ShoppingBag className="size-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 space-y-1">
                      <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {p.title}
                      </p>
                      <p className="text-xs font-black font-mono text-foreground">
                        {formatMoney(p.price_cents)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Lojas em Destaque no Mural */}
          {discoveryData?.stores && discoveryData.stores.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black tracking-tight text-foreground">
                  Lojas & Negócios Locais
                </h3>
                <Link to="/diretorio" className="text-xs font-semibold text-primary hover:underline">
                  Guia completo
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {discoveryData.stores.slice(0, 4).map((s: any) => (
                  <Link
                    key={s.id}
                    to="/bio/$slug"
                    params={{ slug: s.slug }}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-card border border-border/60 hover:bg-muted/50 transition-all group"
                  >
                    <div className="size-10 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center border border-border/40">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={s.name} className="size-full object-cover" />
                      ) : (
                        <Store className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate group-hover:text-primary">
                        {s.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.category}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

 {input.length >= 2 && result !== null && total === 0 && (
 <div className="py-12 text-center space-y-4 bg-card rounded-2xl p-6 ">
 <EmptyState
 title={`Nenhum resultado encontrado para "${input}"`}
 description="Tente buscar por termos mais genéricos ou explore as categorias abaixo."
 />
 <div className="flex flex-wrap justify-center gap-2 pt-2">
 <Link
 to="/mercado"
 className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
 >
 Ir para o Mercado
 </Link>
 <Link
 to="/gastronomia"
 className="px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-all"
 >
 Ver Restaurantes
 </Link>
 <Link
 to="/classificados"
 className="px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-all"
 >
 Explorar Desapegos
 </Link>
 </div>
 </div>
 )}

 {/* Visualização de Radar no Mapa quando viewMode === "feed" */}
 {hasResults && viewMode === "feed" && (
 <div className="space-y-4">
 <div className="h-[460px] w-full rounded-2xl overflow-hidden border border-border/60 relative">
 <MapLibreCanvas
 markers={mapMarkers}
 selectedMarkerId={selectedStoreMarker?.id}
 onMarkerClick={(m) => {
 const found = filteredStores.find((s) => s.id === m.id);
 setSelectedStoreMarker(found || null);
 }}
 className="size-full"
 />

 {/* Bottom Card Flutuante de Estabelecimento Selecionado */}
 {selectedStoreMarker && (
 <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 p-3.5 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
 <div className="flex items-center gap-3 min-w-0">
 <div className="size-10 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center">
 {selectedStoreMarker.logo_url ? (
 <img src={selectedStoreMarker.logo_url} alt={selectedStoreMarker.name} className="size-full object-cover" />
 ) : (
 <Store className="size-5 text-muted-foreground" />
 )}
 </div>
 <div className="min-w-0">
 <span className="text-xs font-bold text-foreground truncate block">{selectedStoreMarker.name}</span>
 <span className="text-[10px] text-success font-semibold">• Aberto agora</span>
 </div>
 </div>

 <Button size="sm" asChild className="text-xs h-8 font-semibold shrink-0">
 <Link to="/bio/$slug" params={{ slug: selectedStoreMarker.slug }}>
 Ver Loja
 </Link>
 </Button>
 </div>
 )}
 </div>
 </div>
 )}

  {/* Visualização Padrão em Grade/Lista quando viewMode !== "feed" */}
  {hasResults && viewMode !== "feed" && (
    <div className="space-y-6 pt-2">
      {/* Seção de Lojas */}
      <ResultSection
        title="Lojas & Comércios"
        count={filteredStores.length}
        icon={Store}
      >
        {/* Mobile: WhatsApp Minimalist List */}
        <div className="block sm:hidden divide-y divide-border/30 rounded-xl border border-border/40 bg-card overflow-hidden">
          {filteredStores.map((store) => (
            <StoreCard key={store.id} store={store} isMobileList />
          ))}
        </div>
        {/* Desktop: Grid */}
        <div className="hidden sm:grid sm:grid-cols-2 gap-2">
          {filteredStores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      </ResultSection>

      {/* Seção de Produtos */}
      {filteredProducts.length > 0 && (
        <section className="mb-8 space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Produtos & Cardápio</h2>
            <Badge variant="outline" className="text-[10px] font-mono border-border/70">
              {filteredProducts.length}
            </Badge>
          </div>
          <ProductGrid
            result={{
              status: "ok",
              data: filteredProducts as any,
              total: filteredProducts.length,
            } as any}
            viewMode={viewMode === "list" ? "list" : "grid"}
          />
        </section>
      )}

      {/* Seção de Classificados */}
      <ResultSection
        title="Classificados & Anúncios"
        count={filteredClassifieds.length}
        icon={Tag}
      >
        {/* Mobile: WhatsApp Minimalist List */}
        <div className="block sm:hidden divide-y divide-border/30 rounded-xl border border-border/40 bg-card overflow-hidden">
          {filteredClassifieds.map((classified) => (
            <ClassifiedCard key={classified.id} classified={classified} isMobileList />
          ))}
        </div>
        {/* Desktop: Grid */}
        <div className="hidden sm:grid sm:grid-cols-2 gap-3">
          {filteredClassifieds.map((classified) => (
            <ClassifiedCard key={classified.id} classified={classified} />
          ))}
        </div>
      </ResultSection>

      {/* Seção de Eventos */}
      <ResultSection
        title="Eventos & Agenda Cultural"
        count={filteredEvents.length}
        icon={Calendar}
      >
        {/* Mobile: WhatsApp Minimalist List */}
        <div className="block sm:hidden divide-y divide-border/30 rounded-xl border border-border/40 bg-card overflow-hidden">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} isMobileList />
          ))}
        </div>
        {/* Desktop: Grid */}
        <div className="hidden sm:grid sm:grid-cols-2 gap-2">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </ResultSection>
    </div>
  )}
 </div>
 );
}
