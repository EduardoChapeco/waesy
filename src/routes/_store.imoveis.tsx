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

const SearchSchema = z.object({
  q: z.string().optional(),
  tipo: z.enum(["todos", "aluguel", "venda", "comercial", "terreno", "rural"]).default("todos").optional(),
  bairro: z.string().optional(),
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
      const [banners, hotpages, marketplaceFeed] = await Promise.all([
        listActiveBanners({ data: { placement: "imoveis" } }).catch(() => []),
        listHotpages({ data: { module: "imoveis" } }).catch(() => []),
        getModularSurfaceFeed({ data: { surfaceSlug: "imoveis" } }).catch(() => ({ sections: [], allProducts: [] })),
      ]);

      return {
        banners,
        hotpages,
        marketplaceFeed,
      };
    } catch (err) {
      console.error("[loader:_store.imoveis] Unhandled error:", err);
      return { banners: null, hotpages: null, marketplaceFeed: null };
    }
  },
  component: ImoveisVerticalPage,
  pendingComponent: PageSkeleton,
});

function ImoveisVerticalPage() {
  const { banners, hotpages, marketplaceFeed } = ((Route.useLoaderData?.() as any) || {});
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [activeCategory, setActiveCategory] = useState(search.tipo || "todos");

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

  return (
    <div className="w-full space-y-6 pb-20">
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
        viewMode="grid"
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

      {/* ── 5. Grade de Oportunidades Imobiliárias ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
