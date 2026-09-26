import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Compass,
  MapPin,
  AirplaneTilt,
  ArrowRight,
  GridFour,
  Rows,
  SquaresFour,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { SlimActionBanner } from "@/components/commerce/slim-action-banner";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import {
  DiscoveryControlBar,
  type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { listPublicTourism } from "@/services/tourism.functions";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { ContextualStoriesRail } from "@/components/stories/contextual-stories-rail";
import { TravelQuoteModal } from "@/components/tourism/travel-quote-modal";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/turismo/")({
  head: () => ({
    meta: [
      { title: "Turismo & Viagens | Waesy" },
      {
        name: "description",
        content: "Pacotes de viagens, hospedagens e experiências regionais.",
      },
    ],
  }),
  loader: async () => {
    try {
      const [banners, hotpages, tourismItems] = await Promise.all([
        listActiveBanners({ data: { placement: "turismo" } }).catch(() => []),
        listHotpages({ data: { module: "turismo" } }).catch(() => []),
        listPublicTourism().catch(() => []),
      ]);

      return { banners, hotpages, tourismItems };
    } catch (err) {
      console.error("[loader:_store.turismo.index] Unhandled error:", err);
      return { banners: [], hotpages: [], tourismItems: [] };
    }
  },
  component: TourismMasterPage,
});

export type TourismLayoutMode = "cards" | "compact" | "rails";

const CATEGORY_CHIPS: FilterChipOption[] = [
  { id: "todos", label: "Tudo" },
  { id: "pacotes", label: "Pacotes" },
  { id: "hospedagens", label: "Hospedagens" },
  { id: "passeios", label: "Passeios" },
  { id: "cruzeiros", label: "Cruzeiros" },
  { id: "vistos", label: "Vistos" },
  { id: "agencias", label: "Agências" },
];

const REGIONAL_AIRPORTS = [
  { id: "todos", label: "Todas as Saídas" },
  { id: "XAP", label: "Chapecó" },
  { id: "FLN", label: "Florianópolis" },
  { id: "CWB", label: "Curitiba" },
  { id: "POA", label: "Porto Alegre" },
  { id: "NVT", label: "Navegantes" },
  { id: "GRU", label: "São Paulo" },
];

function TourismMasterPage() {
  const { banners = [], hotpages = [], tourismItems: initialItems = [] } = ((Route.useLoaderData() as any) || {});
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [layoutMode, setLayoutMode] = useState<TourismLayoutMode>("cards");
  const [search, setSearch] = useState("");
  const [selectedAirport, setSelectedAirport] = useState<string>("todos");
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteDestination, setQuoteDestination] = useState("");

  const { data: items } = useQuery({
    queryKey: ["tourism-list", selectedCategory, search],
    queryFn: () =>
      listPublicTourism({
        data: {
          category: selectedCategory !== "todos" ? selectedCategory : undefined,
          search: search || undefined,
        },
      }),
    initialData: initialItems,
  });

  const rawList: any[] = items || [];
  const isLoading = !items && initialItems.length === 0;

  const tourismList = useMemo(() => {
    return rawList.filter((item) => {
      if (selectedAirport !== "todos") {
        const itemDep = (item.departure_airport || item.departure_city || "").toUpperCase();
        if (!itemDep.includes(selectedAirport.toUpperCase())) {
          return false;
        }
      }
      return true;
    });
  }, [rawList, selectedAirport]);

  const tourismByCategory = useMemo(() => {
    const map = new Map<string, typeof tourismList>();
    tourismList.forEach((item) => {
      const cat = item.category || "pacotes";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    return Array.from(map.entries()).map(([catKey, catItems]) => {
      const chip = CATEGORY_CHIPS.find((c) => c.id === catKey);
      return {
        categoryKey: catKey,
        categoryName: chip?.label || "Destaques",
        items: catItems,
      };
    });
  }, [tourismList]);

  const handleOpenQuote = (destination = "") => {
    setQuoteDestination(destination);
    setIsQuoteModalOpen(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 space-y-6 pb-24">
      {/* Banners */}
      {banners && banners.length > 0 && (
        <BannerHeroCarousel banners={banners} className="w-full" />
      )}

      {/* Stories */}
      <ContextualStoriesRail niche="turismo" className="py-1" />

      {/* Banner Fino */}
      {banners?.some((b: any) => (b as any).format === "slim") && (
        <SlimActionBanner
          banner={banners?.find((b: any) => (b as any).format === "slim")}
          onCtaClick={() => handleOpenQuote()}
        />
      )}

      {/* Coleções */}
      {hotpages && hotpages.length > 0 && (
        <section aria-label="Coleções">
          <HotpagesRail
            hotpages={hotpages}
            activeSlug={selectedCategory}
            onSelect={(slug) => setSelectedCategory(slug)}
          />
        </section>
      )}

      {/* Barra de Busca e Categorias */}
      <DiscoveryControlBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar destinos ou roteiros..."
        categories={CATEGORY_CHIPS}
        activeCategory={selectedCategory}
        onSelectCategory={(id) => setSelectedCategory(id)}
        viewMode={layoutMode === "rails" ? "feed" : layoutMode === "compact" ? "list" : "grid"}
        onViewModeChange={(m) => setLayoutMode(m === "feed" ? "rails" : m === "list" ? "compact" : "cards")}
        allowedViewModes={["feed", "grid", "list"]}
      />

      {/* Filtro de Saída por Aeroporto Regional (Padrão Botão Grande com Snap Scroll) */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 border-b border-border/40 snap-x snap-mandatory">
        <span className="text-xs font-semibold text-muted-foreground shrink-0 mr-1 snap-start">
          Saída:
        </span>
        {REGIONAL_AIRPORTS.map((air) => {
          const isActive = selectedAirport === air.id;
          return (
            <button
              key={air.id}
              type="button"
              onClick={() => setSelectedAirport(air.id)}
              className={cn(
                "h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-2xs transition-all select-none active:scale-98 snap-start",
                isActive
                  ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                  : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:bg-muted/50"
              )}
            >
              {air.label}
            </button>
          );
        })}
      </div>

      {/* Grid de Destinos */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card overflow-hidden animate-pulse">
              <div className="aspect-[16/10] w-full bg-muted" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-24 bg-muted rounded-full" />
                <div className="h-4 w-4/5 bg-muted rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : tourismList.length === 0 ? (
        <div className="rounded-2xl border border-border/60 p-12 text-center bg-card space-y-2">
          <p className="text-sm font-semibold text-foreground">Nenhum resultado encontrado</p>
          <p className="text-xs text-muted-foreground">
            Ajuste os filtros de saída ou busque por outro termo.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedAirport("todos");
              setSelectedCategory("todos");
              setSearch("");
            }}
            className="mt-3 rounded-lg text-xs"
          >
            Limpar filtros
          </Button>
        </div>
      ) : layoutMode === "cards" ? (
        /* MODO 1: CARTÕES LIMPOS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tourismList.map((item) => {
            const configuredInstallments = Number(item.attributes?.max_installments || item.max_installments);
            const maxInstallments = configuredInstallments > 1 ? Math.min(24, configuredInstallments) : 1;
            const priceCents = item.price_cents || 0;
            const installmentCents = (priceCents > 0 && maxInstallments > 1) ? Math.round(priceCents / maxInstallments) : 0;
            const mealPlan = item.attributes?.meal_plan || item.meal_plan || null;
            const durationDays = item.duration_days || item.attributes?.duration_days || null;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-border transition-all flex flex-col justify-between group"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                  {item.cover_image ? (
                    <img
                      src={item.cover_image}
                      alt={item.title}
                      className="size-full object-cover group-hover:scale-102 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center bg-muted text-muted-foreground">
                      <AirplaneTilt size={32} className="opacity-40" />
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {mealPlan && (
                      <span className="bg-background/90 text-foreground text-[10px] font-medium px-2 py-0.5 rounded-md border border-border/40">
                        {mealPlan}
                      </span>
                    )}
                    {durationDays && (
                      <span className="bg-background/90 text-foreground text-[10px] font-medium px-2 py-0.5 rounded-md border border-border/40">
                        {durationDays} dias
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
                      <span>{item.location_name || item.destination_city || "Regional"}</span>
                      {item.departure_city && (
                        <span className="text-[10px] text-muted-foreground">
                          Saída: {item.departure_city}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-foreground line-clamp-1">
                      {item.title}
                    </h3>

                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border/40 flex items-end justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-mono">
                        A partir de
                      </span>
                      <span className="text-base font-bold font-mono text-foreground block">
                        {item.price_display || (priceCents > 0 ? formatMoney(priceCents) : "Consulte")}
                      </span>
                      {installmentCents > 0 && maxInstallments > 1 && (
                        <span className="text-[11px] text-muted-foreground block">
                          em até {maxInstallments}x de {formatMoney(installmentCents)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenQuote(item.title)}
                        className="rounded-xl text-xs h-9 px-3 font-medium cursor-pointer"
                      >
                        Cotar
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        className="rounded-xl text-xs h-9 px-3.5 font-medium cursor-pointer"
                      >
                        <Link to="/turismo/$id" params={{ id: item.id }}>
                          <span>Ver</span>
                          <ArrowRight size={12} className="ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : layoutMode === "compact" ? (
        /* MODO 2: COMPACTO */
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tourismList.map((item) => {
            const priceCents = item.price_cents || 0;
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-border transition-all flex flex-col justify-between group"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  {item.cover_image ? (
                    <img
                      src={item.cover_image}
                      alt={item.title}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center bg-muted">
                      <AirplaneTilt size={20} className="opacity-40" />
                    </div>
                  )}
                  {item.departure_city && (
                    <span className="absolute bottom-2 left-2 text-[9px] bg-background/90 px-1.5 py-0.5 rounded text-foreground font-medium">
                      {item.departure_city}
                    </span>
                  )}
                </div>

                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {item.location_name || "Regional"}
                    </span>
                    <h4 className="font-semibold text-xs text-foreground line-clamp-1">
                      {item.title}
                    </h4>
                  </div>

                  <div className="pt-1 flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-bold text-foreground truncate">
                      {item.price_display || (priceCents > 0 ? formatMoney(priceCents) : "Consulte")}
                    </span>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px] rounded-lg font-medium"
                    >
                      <Link to="/turismo/$id" params={{ id: item.id }}>
                        Ver
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MODO 3: TRILHOS */
        <div className="space-y-8">
          {tourismByCategory.map(({ categoryKey, categoryName, items: catItems }) => (
            <section key={categoryKey} aria-label={categoryName}>
              <HorizontalRail
                title={categoryName}
                hideHeader={true}
                badge={`${catItems.length} opções`}
                actionLabel="Ver todos"
                onAction={() => {
                  setSelectedCategory(categoryKey);
                  setLayoutMode("cards");
                }}
              >
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className="min-w-[280px] sm:min-w-[320px] max-w-[340px] rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-border transition-all flex flex-col justify-between shrink-0"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                      {item.cover_image ? (
                        <img
                          src={item.cover_image}
                          alt={item.title}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center bg-muted">
                          <AirplaneTilt size={24} className="opacity-40" />
                        </div>
                      )}
                      {item.departure_city && (
                        <span className="absolute bottom-2 left-2 text-[9px] bg-background/90 px-2 py-0.5 rounded text-foreground font-medium">
                          {item.departure_city}
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {item.location_name || "Regional"}
                        </span>
                        <h4 className="font-semibold text-sm text-foreground line-clamp-1">
                          {item.title}
                        </h4>
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {item.price_display || (item.price_cents ? formatMoney(item.price_cents) : "Consulte")}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenQuote(item.title)}
                            className="h-8 px-3 rounded-lg text-xs font-medium"
                          >
                            Cotar
                          </Button>
                          <Button
                            asChild
                            size="sm"
                            className="h-8 px-3 rounded-lg text-xs font-medium"
                          >
                            <Link to="/turismo/$id" params={{ id: item.id }}>
                              Ver
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </HorizontalRail>
            </section>
          ))}
        </div>
      )}

      {/* Modal de Cotação */}
      <TravelQuoteModal
        open={isQuoteModalOpen}
        onOpenChange={setIsQuoteModalOpen}
        defaultDestination={quoteDestination}
      />
    </div>
  );
}
