import React, { useState, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
  Storefront,
  Tag,
  Flame,
  ShieldCheck,
  CheckCircle,
  ForkKnife,
  ShoppingBag,
  Heartbeat,
  BeerBottle,
  TShirt,
  Bone,
  Laptop,
  Armchair,
  Hammer,
  Briefcase,
  Buildings,
  Scissors,
  ArrowRight,
  Sparkle,
  ArrowSquareOut,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { ModularSurfaceFeed } from "@/components/commerce/modular-surface-feed";
import { OfferCard, type OfferCardProps } from "@/components/commerce/offer-card";
import {
  DiscoveryControlBar,
  type ViewModeType,
  type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { EmptyState } from "@/components/state/states";
import { resolveActiveCity } from "@/lib/city-helper";
import { cn } from "@/lib/utils";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { getModularSurfaceFeed } from "@/services/surface-cms.functions";
import { listUnifiedListings } from "@/services/unified-listing.functions";
import type { UnifiedListing } from "@/types/unified-ad-engine";

// ─── Sub-Marketplaces e Nichos Canônicos do Waesy ───────────────────────────
const MARKETPLACE_NICHES = [
  { id: "todos", label: "Todas as Vitrines", icon: Storefront, targetRoute: "/marketplace" },
  { id: "gastronomia", label: "Gastronomia & Comida", icon: ForkKnife, targetRoute: "/gastronomia" },
  { id: "mercado", label: "Supermercado & Feira", icon: ShoppingBag, targetRoute: "/mercado" },
  { id: "farmacia", label: "Farmácia & Saúde", icon: Heartbeat, targetRoute: "/farmacia" },
  { id: "bebidas", label: "Bebidas & Adega", icon: BeerBottle, targetRoute: "/bebidas" },
  { id: "acougue", label: "Açougue & Carnes", icon: Flame, targetRoute: "/acougue" },
  { id: "moda", label: "Moda & Vestuário", icon: TShirt, targetRoute: "/moda" },
  { id: "pet", label: "Pet Shop", icon: Bone, targetRoute: "/pet" },
  { id: "eletronicos", label: "Tech & Eletrônicos", icon: Laptop, targetRoute: "/eletronicos" },
  { id: "casa", label: "Casa & Móveis", icon: Armchair, targetRoute: "/casa" },
  { id: "construcao", label: "Construção & Reforma", icon: Hammer, targetRoute: "/construcao" },
  { id: "servicos", label: "Serviços Especializados", icon: Briefcase, targetRoute: "/servicos" },
  { id: "imoveis", label: "Imóveis & Locação", icon: Buildings, targetRoute: "/imoveis" },
  { id: "beleza", label: "Beleza & Estética", icon: Scissors, targetRoute: "/beleza" },
  { id: "ofertas", label: "Ofertas Relâmpago", icon: Flame, targetRoute: "/ofertas" },
];

const NICHE_FILTER_CHIPS: FilterChipOption[] = MARKETPLACE_NICHES.map((n) => ({
  id: n.id,
  label: n.label,
  icon: n.icon as any,
}));

const SearchSchema = z.object({
  niche: z.string().optional().default("todos"),
  q: z.string().optional(),
  view: z.enum(["feed", "grid", "list"]).optional().default("feed"),
  sort: z.enum(["newest", "price_asc", "price_desc"]).optional().default("newest"),
  city: z.string().optional(),
});

type MarketplaceSearch = z.infer<typeof SearchSchema>;

export const Route = createFileRoute("/_store/marketplace/")({
  validateSearch: (search: Record<string, unknown>): MarketplaceSearch => SearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Marketplace da Cidade | Vitrines e Lojas Verificadas | Waesy" },
      {
        name: "description",
        content:
          "Vitrines e produtos de comércios locais credenciados. Compre online de empresas verificadas com garantia, nota fiscal e entrega rápida na sua cidade.",
      },
    ],
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ location }) => {
    const search = location.search as MarketplaceSearch;
    const activeCity = resolveActiveCity(location?.search);
    const activeNiche = search.niche && search.niche !== "todos" ? search.niche : undefined;

    try {
      const [bannersRes, hotpagesRes, feedRes, listingsRes] = await Promise.all([
        listActiveBanners({ data: { placement: "marketplace", city: activeCity } }).catch(() => []),
        listHotpages({ data: { module: "marketplace" } }).catch(() => []),
        getModularSurfaceFeed({
          data: { surfaceSlug: activeNiche || "marketplace", city: activeCity },
        }).catch(() => ({ sections: [], allProducts: [] })),
        listUnifiedListings({
          data: {
            origin: "workspace", // ── REGRA ABSOLUTA DOS 4 PILARES: ZERO CLASSIFICADOS NO MARKETPLACE ──
            niche_id: activeNiche,
            q: search.q,
            limit: 48,
          },
        }).catch(() => []),
      ]);

      // Fallback para banners da home caso ainda não haja específicos configurados
      const banners =
        bannersRes && bannersRes.length > 0
          ? bannersRes
          : await listActiveBanners({ data: { placement: "home", city: activeCity } }).catch(() => []);

      // Fallback para botões/chips da home caso ainda não haja específicos configurados
      const hotpages =
        hotpagesRes && hotpagesRes.length > 0
          ? hotpagesRes
          : await listHotpages({ data: { module: "home" } }).catch(() => []);

      return {
        banners: banners || [],
        hotpages: hotpages || [],
        surfaceFeed: feedRes || { sections: [], allProducts: [] },
        listings: (listingsRes || []) as UnifiedListing[],
        activeCity,
      };
    } catch (err) {
      console.warn("[marketplace] Loader degradado com segurança:", err);
      return {
        banners: [],
        hotpages: [],
        surfaceFeed: { sections: [], allProducts: [] },
        listings: [],
        activeCity,
      };
    }
  },
  errorComponent: MarketplaceErrorComponent,
  component: AdvancedMarketplacePage,
});

function MarketplaceErrorComponent({ error }: { error: any }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
      <div className="inline-flex size-14 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-1">
        <Storefront className="size-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">Falha ao Conectar com o Marketplace</h1>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          Não foi possível sincronizar as vitrines e o catálogo de produtos comerciais no momento.
        </p>
      </div>
      {error?.message && (
        <pre className="mt-2 rounded-lg bg-muted/40 border border-border/50 p-3 text-xs text-muted-foreground overflow-auto max-h-32 text-left font-mono">
          {error.message}
        </pre>
      )}
      <div className="pt-2 flex items-center justify-center gap-3">
        <Button
          variant="default"
          className="rounded-lg text-xs h-11 px-5 font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="size-3.5 mr-2" />
          <span>Tentar Novamente</span>
        </Button>
      </div>
    </div>
  );
}

function mapListingToOfferCardProps(item: UnifiedListing): OfferCardProps {
  const originalPrice = item.compare_at_cents || item.price_cents;
  const price = item.price_cents;
  const hasDiscount = originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return {
    id: item.id,
    title: item.title,
    slug: item.slug || item.id,
    store_name: item.store_name || "Loja Credenciada",
    price_cents: price,
    original_price_cents: originalPrice,
    discount_percent: discountPercent,
    mechanic_label: hasDiscount ? `${discountPercent}% OFF` : "Verificado",
    cover_image: item.cover_url || item.media_urls?.[0] || "",
    selling_unit: item.selling_unit || "un",
    in_stock: item.is_unlimited_stock || (item.stock_quantity ?? 1) > 0,
    has_flash_offer: hasDiscount,
  };
}

function AdvancedMarketplacePage() {
  const { banners, hotpages, surfaceFeed, listings } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [activeNiche, setActiveNiche] = useState<string>(search.niche || "todos");
  const [viewMode, setViewMode] = useState<ViewModeType>(search.view || "feed");
  const [searchTerm, setSearchTerm] = useState<string>(search.q || "");

  // Mapeia listagens do catálogo com isolamento estrito
  const productCards: OfferCardProps[] = useMemo(() => {
    const rawFeedProducts = surfaceFeed?.allProducts || [];
    const directListingProducts = listings.map(mapListingToOfferCardProps);

    // Unifica e deduplica por ID
    const map = new Map<string, OfferCardProps>();
    for (const p of directListingProducts) {
      if (p.id) map.set(p.id, p);
    }
    for (const p of rawFeedProducts) {
      if (p.id && !map.has(p.id)) map.set(p.id, p);
    }

    let result = Array.from(map.values());

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.store_name || "").toLowerCase().includes(q)
      );
    }

    if (search.sort === "price_asc") {
      result.sort((a, b) => a.price_cents - b.price_cents);
    } else if (search.sort === "price_desc") {
      result.sort((a, b) => b.price_cents - a.price_cents);
    }

    return result;
  }, [surfaceFeed?.allProducts, listings, searchTerm, search.sort]);

  const activeNicheConfig = useMemo(() => {
    return MARKETPLACE_NICHES.find((n) => n.id === activeNiche) || MARKETPLACE_NICHES[0];
  }, [activeNiche]);

  const handleNicheChange = (nicheId: string) => {
    setActiveNiche(nicheId);
    navigate({
      search: (prev) => ({
        ...prev,
        niche: nicheId === "todos" ? undefined : nicheId,
      }),
    });
  };

  const handleSearchChange = (q: string) => {
    setSearchTerm(q);
    navigate({
      search: (prev) => ({
        ...prev,
        q: q ? q : undefined,
      }),
    });
  };

  const handleViewModeChange = (mode: ViewModeType) => {
    setViewMode(mode);
    navigate({
      search: (prev) => ({
        ...prev,
        view: mode,
      }),
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-24">
      {/* ── Header Mobile Nativo ── */}
      <NativeMobileHeader
        title="Marketplace"
        centerTitle
        backTo="/"
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar produtos e lojas verificadas..."
      />

      <div className="px-4 sm:px-6 space-y-6 pt-3 sm:pt-5">
        {/* ── 1. Banner Canônico de Segurança e Garantia B2C ── */}
        <section aria-label="Garantia Waesy Marketplace" className="bg-card border border-border/80 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck size={22} weight="fill" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-foreground">
                  Marketplace 100% Verificado
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                  <CheckCircle size={11} weight="fill" />
                  Garantia B2C
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Apenas empresas e lojas ativas credenciadas com nota fiscal e estoque real. Todos os pedidos contam com proteção ao comprador e atendimento direto.
              </p>
            </div>
          </div>

          {activeNiche !== "todos" && activeNicheConfig.targetRoute && (
            <Link
              to={activeNicheConfig.targetRoute as any}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-colors shrink-0 cursor-pointer"
            >
              <span>Ver Vitrine {activeNicheConfig.label}</span>
              <ArrowSquareOut size={14} weight="bold" />
            </Link>
          )}
        </section>

        {/* ── 2. Banners Herói Dinâmicos (Admin Master / Banners) ── */}
        {banners && banners.length > 0 && (
          <section aria-label="Banners Promocionais do Marketplace">
            <BannerHeroCarousel banners={banners} />
          </section>
        )}

        {/* ── 3. Botões e Cards Herói Editáveis (Admin Master / Botões e Hotpages) ── */}
        {hotpages && hotpages.length > 0 && (
          <section aria-label="Atalhos e Destaques Rápidos">
            <HotpagesRail hotpages={hotpages} />
          </section>
        )}

        {/* ── 4. Seletor de Sub-Marketplaces e Vitrines Especializadas ── */}
        <section aria-label="Vitrines por Nicho" className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground/80">
              Vitrines por Nicho
            </span>
            <span className="text-2xs text-muted-foreground font-mono">
              14 subnichos ativos
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {MARKETPLACE_NICHES.map((niche) => {
              const Icon = niche.icon;
              const isSelected = activeNiche === niche.id;

              return (
                <button
                  key={niche.id}
                  type="button"
                  onClick={() => handleNicheChange(niche.id)}
                  className={cn(
                    "inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon size={14} weight={isSelected ? "fill" : "regular"} className="shrink-0" />
                  <span>{niche.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 5. Barra de Controle de Descoberta (Busca + Modos Feed/Grid/List) ── */}
        <DiscoveryControlBar
          search={searchTerm}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Buscar produtos em todas as vitrines comerciais..."
          categories={NICHE_FILTER_CHIPS}
          activeCategory={activeNiche}
          onSelectCategory={handleNicheChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />

        {/* ── 6. Feed Dinâmico CMS & Catálogo de Produtos ── */}
        {viewMode === "feed" ? (
          <div className="space-y-8">
            {/* Seções CMS Dinâmicas Configuradas no Admin Master (Random Shuffle, Flash Deals, Rails, Bento, Banners) */}
            {surfaceFeed?.sections && surfaceFeed.sections.length > 0 && (
              <ModularSurfaceFeed sections={surfaceFeed.sections} />
            )}

            {/* Vitrine Geral de Produtos Verificados */}
            <section aria-label="Catálogo Geral do Marketplace" className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    <Storefront size={14} weight="bold" />
                  </span>
                  <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight">
                    {activeNiche === "todos"
                      ? "Destaques das Lojas Locais"
                      : `Produtos em ${activeNicheConfig.label}`}
                  </h2>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {productCards.length} {productCards.length === 1 ? "produto" : "produtos"}
                </span>
              </div>

              {productCards.length === 0 ? (
                <div className="py-12 text-center bg-card rounded-xl border border-border/60 p-6">
                  <EmptyState
                    title="Nenhum produto cadastrado neste nicho"
                    description="As lojas deste segmento estão atualizando seus estoques. Experimente selecionar outro nicho ou buscar pelo nome do item."
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {productCards.map((product) => (
                    <OfferCard key={product.id} {...product} />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <section aria-label="Grade de Produtos do Marketplace" className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {activeNicheConfig.label} ({productCards.length})
              </h2>
            </div>

            {productCards.length === 0 ? (
              <div className="py-12 text-center bg-card rounded-xl border border-border/60 p-6">
                <EmptyState
                  title="Nenhum produto encontrado"
                  description="Verifique os termos de busca ou selecione outro nicho no menu superior."
                />
              </div>
            ) : viewMode === "list" ? (
              <div className="flex flex-col gap-3">
                {productCards.map((product) => (
                  <OfferCard key={product.id} {...product} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {productCards.map((product) => (
                  <OfferCard key={product.id} {...product} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
