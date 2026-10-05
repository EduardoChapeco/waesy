import { resolveActiveCity } from "@/lib/city-helper";
import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import { House, Key, Buildings, Tree, MapPin, FileText, PhoneCall, MagnifyingGlass, ArrowRight, ShieldCheck } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { PageSkeleton } from "@/components/state/loading";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { StoreCard } from "@/components/commerce/store-card";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { DiscoveryControlBar, type ViewModeType, type FilterChipOption } from "@/components/commerce/discovery-control-bar";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { getModularSurfaceFeed } from "@/services/surface-cms.functions";
import { ModularSurfaceFeed } from "@/components/commerce/modular-surface-feed";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { formatMoney } from "@/lib/money";
import { resolveNicheDepartments } from "@/lib/niche-helpers";
import { getPublicClassifieds } from "@/services/classifieds.functions";

const SearchSchema = z.object({
  q: z.string().optional(),
  tipo: z.enum(["todos", "aluguel", "venda", "comercial", "terreno", "rural"]).default("todos").optional(),
  bairro: z.string().optional(),
  view: z.enum(["feed", "grid", "list"]).default("grid").optional(),
});

type ImoveisSearch = z.infer<typeof SearchSchema>;

const IMOVEIS_CATEGORIES: FilterChipOption[] = [
  { id: "todos", label: "Todos", icon: Tag },
  { id: "aluguel", label: "Aluguel", icon: Key },
  { id: "venda", label: "Venda", icon: House },
  { id: "comercial", label: "Comercial", icon: Buildings },
  { id: "terreno", label: "Terrenos", icon: MapPin },
  { id: "rural", label: "Rural", icon: Tree },
];

export const Route = createFileRoute("/_store/imoveis")({
  head: () => ({
    meta: [
      { title: "Imóveis, Casas, Apartamentos e Aluguel | Waesy" },
      {
        name: "description",
        content:
          "Encontre casas para comprar, apartamentos para alugar, salas comerciais e terrenos diretamente com imobiliárias e corretores credenciados.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): ImoveisSearch => SearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ location }) => {
    const activeCity = resolveActiveCity(location?.search);
    try {
      const [banners, hotpages, marketplaceFeed, classifieds] = await Promise.all([
        listActiveBanners({ data: { placement: "imoveis", city: activeCity } }).catch(() => []),
        listHotpages({ data: { module: "imoveis" } }).catch(() => []),
        getModularSurfaceFeed({ data: { surfaceSlug: "imoveis", city: activeCity } }).catch(() => ({ sections: [], allProducts: [] })),
        getPublicClassifieds({ data: { category: "real_estate" } }).catch(() => []),
      ]);

      return {
        banners,
        hotpages,
        marketplaceFeed,
        classifieds: classifieds || [],
      };
    } catch (err) {
      console.error("[loader:_store.imoveis] Unhandled error:", err);
      return { banners: null, hotpages: null, marketplaceFeed: null, classifieds: [] };
    }
  },
  errorComponent: ImoveisErrorComponent,
  component: ImoveisVerticalPage,
  pendingComponent: PageSkeleton,
});

function ImoveisErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
      <div className="inline-flex size-16 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-2">
        <House size={32} />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Instabilidade ao carregar imóveis</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {error?.message || "Não foi possível carregar os imóveis e oportunidades no momento."}
      </p>
      <Button onClick={reset} className="rounded-lg font-bold">
        Tentar Novamente
      </Button>
    </div>
  );
}

function ImoveisVerticalPage() {
  const { banners, hotpages, marketplaceFeed, classifieds = [] } = ((Route.useLoaderData?.() as any) || {});
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [activeCategory, setActiveCategory] = useState(search.tipo || "todos");
  const [viewMode, setViewMode] = useState<ViewModeType>(search.view || "grid");

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId as any);
    navigate({
      search: (prev) => ({
        ...prev,
        tipo: catId === "todos" ? undefined : (catId as any),
      }),
    });
  };

  const handleSearchChange = (q: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        q: q || undefined,
      }),
    });
  };

  const relevantStores = useMemo(() => {
    if (!marketplaceFeed?.sections) return [];
    const storeSection = marketplaceFeed.sections.find((s: any) => s.type === "store_rail");
    return storeSection?.items || [];
  }, [marketplaceFeed]);

  const filteredClassifieds = useMemo(() => {
    let list = classifieds || [];
    if (activeCategory !== "todos") {
      list = list.filter((c: any) => {
        if (activeCategory === "aluguel") return c.deal_type === "aluguel" || c.deal_type === "temporada";
        if (activeCategory === "venda") return c.deal_type === "venda";
        const text = `${c.title || ""} ${c.content || ""}`.toLowerCase();
        return text.includes(activeCategory);
      });
    }
    if (search.q) {
      const q = search.q.toLowerCase();
      list = list.filter((c: any) =>
        (c.title || "").toLowerCase().includes(q) ||
        (c.content || "").toLowerCase().includes(q) ||
        (c.location_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [classifieds, activeCategory, search.q]);

  return (
    <div className="w-full max-w-5xl mx-auto pb-24">
      <NativeMobileHeader
        title="Imóveis"
        centerTitle
        backTo="/"
        searchValue={search.q || ""}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar casas, apartamentos, terrenos..."
      />
      {/* ── Cabeçalho Inpage Desktop (Apple HIG) ── */}
      <div className="hidden md:flex items-center justify-between px-4 sm:px-5 pt-6 pb-4 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Imóveis</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Encontre casas, apartamentos, terrenos e salas comerciais na sua região
          </p>
        </div>
      </div>
      <div className="px-4 sm:px-5 space-y-6 pt-2 sm:pt-4">
      {/* ── 1. Banners de Imóveis ── */}
      {banners && banners.length > 0 && (
        <section aria-label="Destaques Imobiliários">
          <BannerHeroCarousel banners={banners} />
        </section>
      )}

      {/* ── 2. Links Rápidos de Ecossistema ── */}
      <div className="flex items-center justify-end gap-2 text-xs">
        <Link
          to="/turismo"
          className="px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          Hospedagem & Temporada ↗
        </Link>
        <Link
          to="/classificados"
          search={{ category: "real_estate" }}
          className="px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          Direto com Proprietário ↗
        </Link>
      </div>

      {/* ── 2.5 Seções Modulares do CMS ── */}
      {marketplaceFeed?.sections && marketplaceFeed.sections.length > 0 && (
        <ModularSurfaceFeed sections={marketplaceFeed.sections} />
      )}

      {/* ── 3. Barra Canônica de Filtros ── */}
      <DiscoveryControlBar
        search={search.q || ""}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar por bairro, condomínio, número de quartos..."
        categories={IMOVEIS_CATEGORIES}
        activeCategory={activeCategory}
        onSelectCategory={handleCategoryChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        allowedViewModes={["feed", "grid", "list"]}
      />

      {/* ── 4. Imobiliárias & Correspondentes da Cidade ── */}
      {relevantStores.length > 0 && (
        <section aria-label="Imobiliárias Credenciadas">
          <HorizontalRail
            title="Imobiliárias Credenciadas"
            hideHeader={true}
            actionTo="/buscar"
          >
            {relevantStores.map((store: any) => (
              <StoreCard key={store.id} {...store} />
            ))}
          </HorizontalRail>
        </section>
      )}

      {/* ── 5. Renderização dos Imóveis nos 3 Modos Canônicos ── */}
      {viewMode === "feed" ? (
        <div className="space-y-8">
          {filteredClassifieds.length > 0 ? (
            <div className="space-y-8">
              {(() => {
                const grouped = filteredClassifieds.reduce((acc: Record<string, typeof filteredClassifieds>, item: any) => {
                  const key = item.deal_type === "aluguel"
                    ? "Imóveis para Locação"
                    : item.deal_type === "temporada"
                    ? "Imóveis de Temporada"
                    : "Imóveis à Venda";
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(item);
                  return acc;
                }, {});

                return Object.entries(grouped).map(([groupName, items]: [string, any]) => (
                  <HorizontalRail
                    key={groupName}
                    title={groupName}
                    hideHeader={false}
                    actionLabel="Ver grade"
                    onAction={() => setViewMode("grid")}
                  >
                    {items.map((item: any) => (
                      <div key={item.id} className="w-72 sm:w-80 shrink-0">
                        <PropertyCard item={item} />
                      </div>
                    ))}
                  </HorizontalRail>
                ));
              })()}
            </div>
          ) : (
            <div className="py-12 text-center bg-card rounded-lg p-6">
              <EmptyState
                title="Nenhum imóvel encontrado"
                description="Tente ajustar os filtros ou buscar em outras localidades."
              />
            </div>
          )}
        </div>
      ) : viewMode === "list" ? (
        <section aria-label="Lista de Imóveis">
          {filteredClassifieds.length === 0 ? (
            <div className="py-12 text-center bg-card rounded-lg p-6 border border-border/40">
              <EmptyState
                title="Nenhum imóvel encontrado"
                description="Tente ajustar os filtros ou buscar em outras localidades."
              />
            </div>
          ) : (
            <div className="w-full space-y-3">
              {filteredClassifieds.map((item: any) => (
                <PropertyListItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section aria-label="Grade de Imóveis">
          {filteredClassifieds.length === 0 ? (
            <div className="py-12 text-center bg-card rounded-lg p-6">
              <EmptyState
                title="Nenhum imóvel encontrado"
                description="Tente ajustar os filtros ou buscar em outras localidades."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredClassifieds.map((item: any) => (
                <PropertyCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      )}
      </div>
    </div>
  );
}

function PropertyCard({ item }: { item: any }) {
  const img = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : item.cover_image;
  const isAluguel = item.deal_type === "aluguel";
  const isTemporada = item.deal_type === "temporada";

  return (
    <div className="group rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 hover: transition-all flex flex-col justify-between h-full">
      <Link to="/classificados/$id" params={{ id: item.id }} className="block flex-1 flex flex-col">
        <div className="relative aspect-16/10 w-full overflow-hidden bg-muted/40 flex items-center justify-center">
          {img ? (
            <img src={img} alt={item.title} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          ) : (
            <div className="size-full bg-muted/30 flex items-center justify-center">
              <House size={32} className="text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
            <Badge variant="secondary" className="bg-background/90 text-[10px] font-bold">
              {isTemporada ? "Temporada" : isAluguel ? "Aluguel" : "Venda"}
            </Badge>
          </div>
        </div>

        <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
          <div>
            <span className="text-lg font-black text-foreground font-mono block">
              {formatMoney(item.price_cents || 0)}
              <span className="text-[11px] font-normal text-muted-foreground ml-1">
                {isAluguel ? "/mês" : isTemporada ? "/diária" : ""}
              </span>
            </span>
            <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors mt-1">
              {item.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {item.content}
            </p>
          </div>

          <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 truncate">
              <MapPin size={12} className="text-primary shrink-0" />
              <span className="truncate">{item.location_name || "Região"}</span>
            </span>
            <span className="font-bold text-foreground text-[11px] flex items-center gap-1 hover:underline">
              Detalhes <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

function PropertyListItem({ item }: { item: any }) {
  const img = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : item.cover_image;
  const isAluguel = item.deal_type === "aluguel";
  const isTemporada = item.deal_type === "temporada";

  return (
    <Link
      to="/classificados/$id"
      params={{ id: item.id }}
      className="group relative overflow-hidden rounded-lg border border-border/60 bg-card hover:border-foreground/30 transition-all min-h-[136px] pl-32 sm:pl-44 flex items-center justify-between pr-4 py-4 gap-3 cursor-pointer w-full"
    >
      <div className="absolute inset-y-0 left-0 w-32 sm:w-44 rounded-l-lg overflow-hidden bg-muted/60">
        {img ? (
          <img src={img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/40">
            <House size={24} className="text-muted-foreground/40" />
          </div>
        )}
        <Badge variant="secondary" className="absolute top-2 left-2 text-[9px] px-2 py-1 font-bold bg-background/90 backdrop-blur-xs">
          {isTemporada ? "Temp." : isAluguel ? "Aluguel" : "Venda"}
        </Badge>
      </div>

      <div className="flex-1 min-w-0 space-y-1 pl-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin size={12} className="text-primary shrink-0" />
          <span className="truncate">{item.location_name || item.city || "Região"}</span>
        </div>
        <h3 className="font-bold text-sm sm:text-base text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {item.content}
        </p>
      </div>

      <div className="text-right shrink-0 pl-1">
        <span className="text-sm sm:text-base font-black text-foreground font-mono block">
          {formatMoney(item.price_cents || 0)}
        </span>
        <span className="text-[10px] sm:text-[11px] text-muted-foreground block">
          {isAluguel ? "/mês" : isTemporada ? "/diária" : "à vista"}
        </span>
      </div>
    </Link>
  );
}
