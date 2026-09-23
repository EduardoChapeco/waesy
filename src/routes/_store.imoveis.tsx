import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
  House,
  Key,
  Buildings,
  Tree,
  MapPin,
  FileText,
  PhoneCall,
  MagnifyingGlass,
  ArrowRight,
  ShieldCheck,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { PageSkeleton } from "@/components/state/loading";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { StoreCard } from "@/components/commerce/store-card";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import {
  DiscoveryControlBar,
  type ViewModeType,
  type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
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
  loader: async () => {
    try {
      const [banners, hotpages, marketplaceFeed, classifieds] = await Promise.all([
        listActiveBanners({ data: { placement: "imoveis" } }).catch(() => []),
        listHotpages({ data: { module: "imoveis" } }).catch(() => []),
        getModularSurfaceFeed({ data: { surfaceSlug: "imoveis" } }).catch(() => ({ sections: [], allProducts: [] })),
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
  component: ImoveisVerticalPage,
  pendingComponent: PageSkeleton,
});

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
    <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 space-y-6 pb-24">
      {/* ── 1. Banners de Imóveis ── */}
      {banners && banners.length > 0 && (
        <section aria-label="Destaques Imobiliários">
          <BannerHeroCarousel banners={banners} />
        </section>
      )}

      {/* ── 2. Switcher de Ecossistema: Imóveis vs Temporada ── */}
      <div className="p-4 rounded-2xl bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border/40 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <House size={22} weight="bold" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Imóveis</h2>
            <p className="text-xs text-muted-foreground">
              Locação, compra de casas, apartamentos e terrenos na sua região.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/turismo"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted/40 hover:bg-muted text-foreground transition-colors"
          >
            Ver Hospedagem & Temporada ↗
          </Link>
          <Link
            to="/classificados"
            search={{ category: "real_estate" }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted/40 hover:bg-muted text-foreground transition-colors"
          >
            Ver Direto com Proprietário ↗
          </Link>
        </div>
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
            <div className="py-12 text-center bg-card rounded-2xl p-6">
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
            <div className="py-12 text-center bg-card rounded-2xl p-6">
              <EmptyState
                title="Nenhum imóvel encontrado"
                description="Tente ajustar os filtros ou buscar em outras localidades."
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredClassifieds.map((item: any) => (
                <PropertyListItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section aria-label="Grade de Imóveis">
          {filteredClassifieds.length === 0 ? (
            <div className="py-12 text-center bg-card rounded-2xl p-6">
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

      {/* ── 6. Oportunidades & Categorias Rápidas ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <div className="p-6 rounded-2xl bg-card space-y-4 border border-border/40 shadow-none">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              Locação Residencial
            </Badge>
            <span className="text-xs font-mono font-bold text-primary">A partir de R$ 1.200/mês</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Apartamentos & Casas para Alugar</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Imóveis prontos para morar no Centro e bairros residenciais com garantia simplificada.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Contratos anuais e garantia caução/fiança</span>
            <Link
              to="/classificados"
              search={{ category: "real_estate", dealType: "aluguel" }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground hover:underline"
            >
              Explorar Ofertas <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-card space-y-4 border border-border/40 shadow-none">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              Venda & Lançamentos
            </Badge>
            <span className="text-xs font-mono font-bold text-primary">Financiamento Caixa / Bancos</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Casas, Sobrados & Lotes à Venda</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Oportunidades para morar ou investir com assessoria jurídica e documentação regularizada.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Avaliação gratuita de imóveis</span>
            <Link
              to="/classificados"
              search={{ category: "real_estate", dealType: "venda" }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground hover:underline"
            >
              Ver Imóveis à Venda <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function PropertyCard({ item }: { item: any }) {
  const img = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : item.cover_image;
  const isAluguel = item.deal_type === "aluguel";
  const isTemporada = item.deal_type === "temporada";

  return (
    <div className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 hover:shadow-xs transition-all flex flex-col justify-between h-full shadow-2xs">
      <Link to="/classificados/$id" params={{ id: item.id }} className="block flex-1 flex flex-col">
        <div className="relative aspect-16/10 w-full overflow-hidden bg-muted/40 flex items-center justify-center">
          {img ? (
            <img src={img} alt={item.title} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          ) : (
            <div className="size-full bg-muted/30 flex items-center justify-center">
              <House size={32} className="text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-[10px] font-bold">
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
      className="group p-3.5 rounded-2xl bg-card border border-border/60 hover:border-foreground/30 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-2xs"
    >
      <div className="relative size-20 sm:size-24 rounded-xl overflow-hidden bg-muted shrink-0">
        {img ? (
          <img src={img} alt={item.title} className="size-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="size-full flex items-center justify-center bg-muted/40">
            <House size={24} className="text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] font-bold">
            {isTemporada ? "Temporada" : isAluguel ? "Aluguel" : "Venda"}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin size={12} /> {item.location_name || "Região"}
          </span>
        </div>
        <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {item.content}
        </p>
      </div>

      <div className="text-left sm:text-right shrink-0">
        <span className="text-base font-black text-foreground font-mono block">
          {formatMoney(item.price_cents || 0)}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {isAluguel ? "por mês" : isTemporada ? "por diária" : "à vista / financia"}
        </span>
      </div>
    </Link>
  );
}
