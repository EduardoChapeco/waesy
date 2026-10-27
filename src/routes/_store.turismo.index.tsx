import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { resolveActiveCity } from "@/lib/city-helper";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Compass,
  MapPin,
  AirplaneTilt,
  ArrowRight,
  Bed,
  SuitcaseRolling,
  Bus,
  Sparkle,
  Briefcase,
  Star,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { DiscoveryControlBar, type FilterChipOption } from "@/components/commerce/discovery-control-bar";
import { BusTicketResultsRail } from "@/components/tourism/BusTicketResultsRail";
import { listActiveBanners, type BannerDTO } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { listPublicTourism, type TourismItemDTO } from "@/services/tourism.functions";
import { getModularSurfaceFeed } from "@/services/surface-cms.functions";
import { ModularSurfaceFeed } from "@/components/commerce/modular-surface-feed";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { ContextualStoriesRail } from "@/components/stories/contextual-stories-rail";
import { TravelQuoteModal } from "@/components/tourism/travel-quote-modal";
import { UniversalNicheCard } from "@/components/commerce/universal-niche-card";
import { TourismHeroBanner } from "@/components/tourism/tourism-hero-banner";
import { CvcNavigationDock, type CvcMenuItem } from "@/components/tourism/cvc-navigation-dock";
import { TourismDynamicSearchPanel } from "@/components/tourism/tourism-dynamic-search-panel";
import { CorporateVollConciergeView } from "@/components/tourism/corporate-voll-concierge-view";
import { WeekendIdeasRail } from "@/components/tourism/weekend-ideas-rail";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/turismo/")({
  head: () => ({
    meta: [
      { title: "Turismo & Viagens | Waesy & Excelência Tour" },
      {
        name: "description",
        content: "Pacotes de viagens, passagens aéreas, hotéis, ônibus e hub corporativo integrado ao GDS InfoTravel e Wooba.",
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
      return { banners: [], hotpages: [], tourismItems: [], surfaceFeed: null };
    }
  },
  errorComponent: TourismErrorComponent,
  component: TourismMasterPage,
});

function TourismErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
      <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-2">
        <AirplaneTilt size={32} />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Instabilidade ao carregar viagens e turismo</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {error?.message || "Não foi possível carregar os pacotes e destinos no momento."}
      </p>
      <Button onClick={reset} className="rounded-lg font-bold min-h-11 h-11 px-6">
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
  { id: "aluguel", label: "Aluguel" },
  { id: "seguros", label: "Seguros" },
  { id: "corporativo", label: "Corporativo (VOLL)" },
];

const REGIONAL_AIRPORTS = [
  { id: "todos", label: "Todas as Saídas" },
  { id: "XAP", label: "Chapecó (XAP)" },
  { id: "FLN", label: "Florianópolis (FLN)" },
  { id: "CWB", label: "Curitiba (CWB)" },
  { id: "POA", label: "Porto Alegre (POA)" },
  { id: "NVT", label: "Navegantes (NVT)" },
  { id: "GRU", label: "São Paulo (GRU)" },
];

function TourismMasterPage() {
  const { banners = [], hotpages = [], tourismItems: initialItems = [], surfaceFeed = null } =
    ((Route.useLoaderData() as any) || {});

  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [layoutMode, setLayoutMode] = useState<TourismLayoutMode>("cards");
  const [search, setSearch] = useState("");
  const [selectedAirport, setSelectedAirport] = useState<string>("todos");
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteDestination, setQuoteDestination] = useState("");

  // Banners ativos (capa de topo do hero do iFood/Decolar)
  const primaryBanner = Array.isArray(banners) && banners.length > 0 ? (banners[0] as BannerDTO) : null;

  // Customização do Menu CVC a partir das seções CMS do Admin Master
  const customButtonsSection = surfaceFeed?.sections?.find(
    (s: any) => s.type === "custom_buttons_rail" || s.data_source === "custom_buttons"
  );

  const cvcMenuItems: CvcMenuItem[] | undefined = useMemo(() => {
    if (customButtonsSection?.config?.buttons && Array.isArray(customButtonsSection.config.buttons)) {
      return customButtonsSection.config.buttons.map((b: any) => ({
        id: b.id || b.route || "pacotes",
        label: b.label || "Canal",
        subtitle: b.subtitle || undefined,
        iconName: b.iconName || b.icon || "SuitcaseRolling",
        badge: b.badge || undefined,
      }));
    }
    return undefined; // Usa os canônicos do componente
  }, [customButtonsSection]);

  const { data: items } = useQuery({
    queryKey: ["tourism-list", selectedCategory, search],
    queryFn: () =>
      listPublicTourism({
        data: {
          category: selectedCategory !== "todos" && selectedCategory !== "corporativo" ? selectedCategory : undefined,
          search: search || undefined,
        },
      }),
    initialData: initialItems,
  });

  const rawList: TourismItemDTO[] = (items as any[]) || [];
  const isLoading = !items && initialItems.length === 0;

  const tourismList = useMemo(() => {
    return rawList.filter((item) => {
      if (selectedAirport !== "todos") {
        const itemDep = (item.departure_city || (item as any).departure_airport || "").toUpperCase();
        if (!itemDep.includes(selectedAirport.toUpperCase())) {
          return false;
        }
      }
      return true;
    });
  }, [rawList, selectedAirport]);

  // Itens para "Ideias para o fim de semana" (Hotéis & Resorts de destaque)
  const weekendItems = useMemo(() => {
    const hotels = rawList.filter(
      (i) => i.category === "hospedagens" || i.category === "resort" || (i.price_cents && i.price_cents > 0)
    );
    return hotels.length > 0 ? hotels.slice(0, 6) : rawList.slice(0, 6);
  }, [rawList]);

  // Agrupamento por Categoria para exibição em Trilhos
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
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-24 px-3 sm:px-4">
      {/* ── Cabeçalho Nativo Mobile com Busca Integrada ── */}
      <NativeMobileHeader
        title="Turismo & Viagens"
        centerTitle
        backTo="/"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar pacotes, hotéis, destinos..."
      />

      {/* ── Cabeçalho Inpage Desktop (Apple HIG) ── */}
      <div className="hidden md:flex items-center justify-between pt-2 pb-3 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Turismo & Viagens</span>
            <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
              Excelência Tour
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pacotes completos, passagens aéreas, hotéis e gestão corporativa B2B
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenQuote()}
            className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            Atendimento WhatsApp
          </Button>
          <Button
            type="button"
            onClick={() => setSelectedCategory("corporativo")}
            className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            Área Corporativa
          </Button>
        </div>
      </div>

      {/* ── 1. Capa de Topo / Hero Estilo iFood & Decolar (Uploadable via Admin Master) ── */}
      <TourismHeroBanner
        banner={primaryBanner}
        onOpenQuote={handleOpenQuote}
      />

      {/* ── Stories Contextuais do Nicho de Turismo ── */}
      <ContextualStoriesRail niche="turismo" className="py-0.5" />

      {/* ── 2. Menu Canônico CVC / Decolar (Squircles com Ícones em Duas Cores) ── */}
      <section aria-label="Menu de Navegação CVC" className="w-full">
        <CvcNavigationDock
          items={cvcMenuItems}
          activeId={selectedCategory}
          onSelect={(id) => setSelectedCategory(id)}
        />
      </section>

      {/* ── 3. Opções de Busca Dinâmicas (InfoTravel GDS / Wooba / Banco) ── */}
      <section aria-label="Motor de Busca Dinâmico de Viagens" className="w-full">
        <TourismDynamicSearchPanel
          activeChannel={selectedCategory === "todos" ? "pacotes" : selectedCategory}
          onChannelChange={(ch) => setSelectedCategory(ch)}
          onOpenQuote={handleOpenQuote}
        />
      </section>

      {/* ── 4. Visão Corporativa VOLL (se a aba 'corporativo' estiver selecionada) ── */}
      {selectedCategory === "corporativo" && (
        <section aria-label="Painel Corporativo VOLL" className="w-full">
          <CorporateVollConciergeView />
        </section>
      )}

      {/* ── 5. Ideias para o Fim de Semana (Estilo iFood / Decolar Image 2) ── */}
      {selectedCategory !== "corporativo" && (
        <WeekendIdeasRail
          items={weekendItems}
          onOpenQuote={handleOpenQuote}
        />
      )}

      {/* ── Coleções e Hotpages de Viagem ── */}
      {hotpages && hotpages.length > 0 && selectedCategory !== "corporativo" && (
        <section aria-label="Coleções de Viagens">
          <HotpagesRail
            hotpages={hotpages}
            activeSlug={selectedCategory}
            onSelect={(slug) => setSelectedCategory(slug)}
          />
        </section>
      )}

      {/* ── 6. Barra de Controle de Descoberta & Filtros Rápidos ── */}
      {selectedCategory !== "corporativo" && (
        <DiscoveryControlBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar destinos ou roteiros..."
          categories={CATEGORY_CHIPS}
          activeCategory={selectedCategory}
          onSelectCategory={(id) => setSelectedCategory(id)}
          viewMode={layoutMode === "rails" ? "feed" : layoutMode === "compact" ? "list" : "grid"}
          onViewModeChange={(m) => setLayoutMode(m === "feed" ? "rails" : m === "list" ? "compact" : "cards")}
          hideMobileSearch={true}
          allowedViewModes={["feed", "grid", "list"]}
        />
      )}

      {/* ── Filtro de Saída por Aeroporto Regional (Snap Scroll Canônico) ── */}
      {selectedCategory !== "corporativo" && (
        <div className="tab-list flex items-center gap-2 overflow-x-auto no-scrollbar py-1 pr-6 border-b border-border/40 snap-x snap-mandatory [mask-image:linear-gradient(to_right,black_90%,transparent_100%)]">
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
                  "h-11 min-h-11 px-4 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-2xs transition-colors select-none active:scale-98 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
      )}

      {/* ── Seções Modulares do Admin Master (B.20 Invariante de Bilateralidade) ── */}
      {surfaceFeed?.sections && surfaceFeed.sections.length > 0 && selectedCategory !== "corporativo" && (
        <section aria-label="Destaques Personalizados de Turismo" className="w-full">
          <ModularSurfaceFeed sections={surfaceFeed.sections} />
        </section>
      )}

      {/* ── Passagens de Ônibus Intermunicipais ── */}
      {(selectedCategory === "onibus" || selectedCategory === "todos") && (
        <section aria-label="Passagens de Ônibus Intermunicipais" className="w-full pt-1">
          <BusTicketResultsRail
            originCity={selectedAirport !== "todos" ? selectedAirport : undefined}
          />
        </section>
      )}

      {/* ── 7. Grade de Destinos / Catálogo Principal ── */}
      {selectedCategory !== "corporativo" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
              {selectedCategory === "todos"
                ? "Seu próximo destino te espera"
                : `Opções em ${CATEGORY_CHIPS.find((c) => c.id === selectedCategory)?.label || selectedCategory}`}
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              {tourismList.length} {tourismList.length === 1 ? "opção disponível" : "opções disponíveis"}
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border/60 bg-card overflow-hidden animate-pulse motion-reduce:animate-none"
                >
                  <div className="aspect-video w-full bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 w-24 bg-muted rounded-full" />
                    <div className="h-4 w-4/5 bg-muted rounded-full" />
                    <div className="h-4 w-1/2 bg-muted rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : tourismList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center bg-card space-y-3">
              <Compass size={40} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">Nenhum pacote encontrado para estes filtros</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Tente ajustar a cidade de saída ou buscar por outro termo.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedAirport("todos");
                  setSelectedCategory("todos");
                  setSearch("");
                }}
                className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold"
              >
                Limpar Filtros
              </Button>
            </div>
          ) : layoutMode === "cards" ? (
            /* MODO 1: Cartões Modernos de Turismo */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tourismList.map((item) => (
                <UniversalNicheCard
                  key={item.id}
                  item={item}
                  forcedNiche="travel"
                  actionLabel="Ver Oferta"
                />
              ))}
            </div>
          ) : layoutMode === "compact" ? (
            /* MODO 2: Compacto List Card */
            <div className="w-full space-y-3">
              {tourismList.map((item) => {
                const priceCents = item.price_cents || 0;
                return (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card min-h-36 pl-32 sm:pl-44 p-4 hover:border-foreground/30 transition-colors flex items-center justify-between gap-4 w-full"
                  >
                    <Link
                      to="/turismo/$id"
                      params={{ id: item.id }}
                      className="absolute inset-y-0 left-0 w-32 sm:w-44 overflow-hidden rounded-l-2xl bg-muted border-r border-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.cover_image || item.image_url ? (
                        <img
                          src={item.cover_image || item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <AirplaneTilt size={24} className="opacity-40" />
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0 pl-1 space-y-2 flex flex-col justify-between">
                      <div>
                        <span className="text-3xs font-bold uppercase tracking-wider text-muted-foreground block truncate">
                          {item.location_name || item.destination || "Regional"}
                        </span>
                        <Link
                          to="/turismo/$id"
                          params={{ id: item.id }}
                          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                        >
                          <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                        </Link>
                      </div>

                      <div className="pt-1 flex items-center justify-between gap-2">
                        <span className="font-mono text-sm sm:text-base font-black text-foreground truncate">
                          {item.price_display || (priceCents > 0 ? formatMoney(priceCents) : "Consulte")}
                        </span>
                        <Button
                          asChild
                          size="sm"
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
            /* MODO 3: Trilhos Horizontais */
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
                          actionLabel="Ver Oferta"
                        />
                      </div>
                    ))}
                  </HorizontalRail>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal de Cotação Rápida ── */}
      <TravelQuoteModal
        open={isQuoteModalOpen}
        onOpenChange={setIsQuoteModalOpen}
        defaultDestination={quoteDestination}
      />
    </div>
  );
}
