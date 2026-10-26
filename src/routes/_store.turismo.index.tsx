import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { resolveActiveCity } from "@/lib/city-helper";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Compass, MapPin, AirplaneTilt, ArrowRight, GridFour, Rows, SquaresFour, Bus, Bed, SuitcaseRolling, Ticket } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { SlimActionBanner } from "@/components/commerce/slim-action-banner";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { DiscoveryControlBar, type FilterChipOption } from "@/components/commerce/discovery-control-bar";
import { BusTicketResultsRail } from "@/components/tourism/BusTicketResultsRail";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { listPublicTourism } from "@/services/tourism.functions";
import { getModularSurfaceFeed } from "@/services/surface-cms.functions";
import { ModularSurfaceFeed } from "@/components/commerce/modular-surface-feed";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { ContextualStoriesRail } from "@/components/stories/contextual-stories-rail";
import { TravelQuoteModal } from "@/components/tourism/travel-quote-modal";
import { UniversalNicheCard } from "@/components/commerce/universal-niche-card";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/turismo/")({
  head: () => ({
    meta: [
      { title: "Turismo e Viagens | Waesy" },
      {
        name: "description",
        content: "Pacotes de viagens, hospedagens e experiências regionais.",
      },
    ],
  }),
  loader: async ({ location }) => {
    const activeCity = resolveActiveCity(location?.search);
    try {
      const [banners, hotpages, tourismItems, surfaceFeed] = await Promise.all([
        listActiveBanners({ data: { placement: "turismo", city: activeCity } }).catch(() => []),
        listHotpages({ data: { module: "turismo" } }).catch(() => []),
        listPublicTourism().catch(() => []),
        getModularSurfaceFeed({ data: { surfaceSlug: "turismo", city: activeCity } }).catch(() => ({ sections: [], allProducts: [] })),
      ]);

      return { banners, hotpages, tourismItems, surfaceFeed };
    } catch (err) {
      console.error("[loader:_store.turismo.index] Unhandled error:", err);
      return { banners: [], hotpages: [], tourismItems: [] };
    }
  },
  errorComponent: TourismErrorComponent,
  component: TourismMasterPage,
});

function TourismErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
      <div className="inline-flex size-16 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-2">
        <AirplaneTilt size={32} />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Instabilidade ao carregar viagens e turismo</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {error?.message || "Não foi possível carregar os pacotes e destinos no momento."}
      </p>
      <Button onClick={reset} className="rounded-lg font-bold">
        Tentar Novamente
      </Button>
    </div>
  );
}

export type TourismLayoutMode = "cards" | "compact" | "rails";

const CATEGORY_CHIPS: FilterChipOption[] = [
  { id: "todos", label: "Tudo" },
  { id: "pacotes", label: "Pacotes" },
  { id: "aereos", label: "Passagens Aéreas" },
  { id: "hospedagens", label: "Hotéis" },
  { id: "onibus", label: "Ônibus" },
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
  const { banners = [], hotpages = [], tourismItems: initialItems = [], surfaceFeed = null } = ((Route.useLoaderData() as any) || {});
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
    <div className="w-full max-w-5xl mx-auto space-y-4 pb-24">
      <NativeMobileHeader
        title="Turismo"
        centerTitle
        backTo="/"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar destinos ou roteiros..."
      />
      {/* ── Cabeçalho Inpage Desktop (Apple HIG) ── */}
      <div className="hidden md:flex items-center justify-between pt-2 pb-4 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Turismo & Viagens</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Pacotes de viagens, hospedagens, passeios e experiências na sua região
          </p>
        </div>
      </div>
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

      {/* ── CVC & Decolar Navigation Hub (Apple HIG Large Squircles) ── */}
      <section aria-label="Canais de Viagem" className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setSelectedCategory("pacotes")}
            className={cn(
              "h-14 min-h-11 px-3 py-2 rounded-lg border flex items-center gap-3 transition-colors text-left cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedCategory === "pacotes"
                ? "bg-foreground text-background border-foreground shadow-xs"
                : "bg-card text-foreground border-border/70 hover:bg-muted/50"
            )}
          >
            <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", selectedCategory === "pacotes" ? "bg-background/20 text-background" : "bg-primary/10 text-primary")}>
              <SuitcaseRolling size={20} weight="bold" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Pacotes</span>
              <span className="text-3xs opacity-70 block truncate">Roteiros completos</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleOpenQuote("Passagens Aéreas")}
            className={cn(
              "h-14 min-h-11 px-3 py-2 rounded-lg border flex items-center gap-3 transition-colors text-left cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedCategory === "aereos"
                ? "bg-foreground text-background border-foreground shadow-xs"
                : "bg-card text-foreground border-border/70 hover:bg-muted/50"
            )}
          >
            <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", selectedCategory === "aereos" ? "bg-background/20 text-background" : "bg-sky-500/10 text-sky-600")}>
              <AirplaneTilt size={20} weight="bold" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Passagens</span>
              <span className="text-3xs opacity-70 block truncate">Voos e cotações</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("hospedagens")}
            className={cn(
              "h-14 min-h-11 px-3 py-2 rounded-lg border flex items-center gap-3 transition-colors text-left cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedCategory === "hospedagens"
                ? "bg-foreground text-background border-foreground shadow-xs"
                : "bg-card text-foreground border-border/70 hover:bg-muted/50"
            )}
          >
            <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", selectedCategory === "hospedagens" ? "bg-background/20 text-background" : "bg-amber-500/10 text-amber-600")}>
              <Bed size={20} weight="bold" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Hotéis</span>
              <span className="text-3xs opacity-70 block truncate">Resorts e pousadas</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("onibus")}
            className={cn(
              "h-14 min-h-11 px-3 py-2 rounded-lg border flex items-center gap-3 transition-colors text-left cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedCategory === "onibus"
                ? "bg-foreground text-background border-foreground shadow-xs"
                : "bg-card text-foreground border-border/70 hover:bg-muted/50"
            )}
          >
            <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", selectedCategory === "onibus" ? "bg-background/20 text-background" : "bg-emerald-500/10 text-emerald-600")}>
              <Bus size={20} weight="bold" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Ônibus</span>
              <span className="text-3xs opacity-70 block truncate">Linhas e horários</span>
            </div>
          </button>
        </div>
      </section>

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
      <div className="tab-list flex items-center gap-2 sm:gap-2 overflow-x-auto no-scrollbar py-1 pr-8 border-b border-border/40 snap-x snap-mandatory [mask-image:linear-gradient(to_right,black_88%,transparent_100%)]">
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
                "h-11 min-h-11 px-4 rounded-lg border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-2xs transition-colors select-none active:scale-98 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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

      {/* Seções Dinâmicas do CMS Master (B.20 Bilateralidade) */}
      {surfaceFeed?.sections && surfaceFeed.sections.length > 0 && (
        <section aria-label="Destaques de Turismo CMS" className="w-full">
          <ModularSurfaceFeed sections={surfaceFeed.sections} />
        </section>
      )}

      
      {/* ── Linhas de Ônibus Intermunicipais (CVC / Decolar / Waesy Mobility) ── */}
      {(selectedCategory === "onibus" || selectedCategory === "todos") && (
        <section aria-label="Passagens de Ônibus Intermunicipais" className="w-full pt-2">
          <BusTicketResultsRail
            originCity={selectedAirport !== "todos" ? selectedAirport : undefined}
          />
        </section>
      )}

      {/* Grid de Destinos */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border/60 bg-card overflow-hidden animate-pulse motion-reduce:animate-none">
              <div className="aspect-video w-full bg-muted" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-24 bg-muted rounded-full" />
                <div className="h-4 w-4/5 bg-muted rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : tourismList.length === 0 ? (
        <div className="rounded-lg border border-border/60 p-12 text-center bg-card space-y-2">
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
        /* MODO 1: CARTÕES MODERNOS CANÔNICOS DE TURISMO (ESTILO SQUIRCLE 2 COLUNAS) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tourismList.map((item) => (
            <UniversalNicheCard
              key={item.id}
              item={item}
              forcedNiche="travel"
              actionLabel="Reserve agora"
            />
          ))}
        </div>
      ) : layoutMode === "compact" ? (
        /* MODO 2: COMPACTO (Full-Height Left Edge-to-Edge List Card) */
        <div className="w-full space-y-3">
          {tourismList.map((item) => {
            const priceCents = item.price_cents || 0;
            return (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-lg border border-border/60 bg-card min-h-36 pl-32 sm:pl-44 p-4 hover:border-foreground/30 transition-colors flex items-center justify-between gap-4 w-full"
              >
                <Link
                  to="/turismo/$id"
                  params={{ id: item.id }}
                  className="absolute inset-y-0 left-0 w-32 sm:w-44 overflow-hidden rounded-l-lg bg-muted border-r border-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.cover_image ? (
                    <img
                      src={item.cover_image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <AirplaneTilt size={24} className="opacity-40" />
                    </div>
                  )}
                  {item.departure_city && (
                    <span className="absolute bottom-2 left-2 text-xs bg-background/90 px-2 py-1 rounded text-foreground font-medium font-mono">
                      {item.departure_city}
                    </span>
                  )}
                </Link>

                <div className="flex-1 min-w-0 pl-1 space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block truncate">
                      {item.location_name || item.destination || "Regional"}
                    </span>
                    <Link to="/turismo/$id" params={{ id: item.id }} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                      <h4 className="font-bold text-sm sm:text-base text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                    </Link>
                  </div>

                  <div className="pt-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-sm sm:text-base font-black text-foreground truncate">
                      {item.price_display || (priceCents > 0 ? formatMoney(priceCents) : "Consulte")}
                    </span>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-11 min-h-11 px-4 text-xs rounded-lg font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Link to="/turismo/$id" params={{ id: item.id }}>
                        Ver Roteiro
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
                  <div key={item.id} className="w-80 shrink-0">
                    <UniversalNicheCard
                      item={item}
                      forcedNiche="travel"
                      actionLabel="Reserve agora"
                    />
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
