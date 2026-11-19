// motion-reduce: safe
import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  MagnifyingGlass,
  Briefcase,
  ArrowRight,
  Plus,
  AirplaneTilt,
  SquaresFour,
  Rows,
  CircleNotch,
  CalendarDots,
  Clock,
  Ticket,
  Package,
  Star,
  ShieldCheck,
  MapPin,
  Globe,
  LockKey,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/state/states";
import { Skeleton } from "@/components/ui/skeleton";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { EventHorizontalCard } from "@/components/events/EventHorizontalCard";
import { LeadFormRenderer } from "@/components/leads/lead-form-renderer";
import { CvcNavigationDock } from "@/components/tourism/cvc-navigation-dock";
import { TourismDynamicSearchPanel } from "@/components/tourism/tourism-dynamic-search-panel";
import { CorporateVollConciergeView } from "@/components/tourism/corporate-voll-concierge-view";
import { AppCompanyInfoTab } from "@/components/branded-app/app-company-info-tab";
import { getBrandedAppInfiniteCatalogFn } from "@/services/branded-app.functions";

const OmniPageRenderer = lazy(() =>
  import("@/components/builder/OmniPageRenderer").then((m) => ({
    default: m.OmniPageRenderer,
  })),
);
import { addToCart } from "@/services/cart.functions";
import { useCartContext } from "@/lib/cart-context";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type {
  AppSectionLayoutMode,
  BrandedAppRuntimeBundleDTO,
  BrandedAppSectionDTO,
} from "@/types/branded-app";

export interface AppSectionsRendererProps {
  bundle: BrandedAppRuntimeBundleDTO;
  sections: BrandedAppSectionDTO[];
  activeTabId: string;
  activeCity?: string | null;
  activeTourismChannel?: string;
  onTourismChannelChange?: (ch: string) => void;
  onOpenQuote?: (destination?: string, prefill?: any) => void;
  onSelectProductForModifiers?: (product: any) => void;
  onInspectProduct?: (product: any) => void;
  onInspectTourismItem?: (item: any) => void;
  onInspectClassifiedItem?: (item: any) => void;
  onInspectEventItem?: (item: any) => void;
  onInspectJob?: (job: any) => void;
  onBookService?: (service: any) => void;
  onBuyEventTicket?: (event: any, lot: any) => void;
  onNavigateTab?: (tabId: string) => void;
  isB2BGated?: boolean;
  isAuthenticatedClient?: boolean;
  clientPriceTableName?: string | null;
  onRequireAuth?: () => void;
}

function resolveSectionProducts(
  section: BrandedAppSectionDTO,
  bundle: BrandedAppRuntimeBundleDTO,
): any[] {
  const limit = section.items_limit || 12;
  const products = bundle.products || [];

  if (section.source_type === "category" && section.source_id) {
    return products
      .filter((p: any) => String(p.category_id || "") === String(section.source_id))
      .slice(0, limit);
  }
  if (section.source_type === "collection" && section.source_id) {
    const col = (bundle.collections || []).find((c) => c.id === section.source_id);
    if (!col) return [];
    const idSet = new Set(col.product_ids);
    return products.filter((p: any) => idSet.has(String(p.id))).slice(0, limit);
  }
  if (section.source_type === "featured") {
    const featured = products.filter((p: any) => p.is_featured);
    return (featured.length > 0 ? featured : products).slice(0, limit);
  }
  if (section.source_type === "offers") {
    const offers = products.filter(
      (p: any) => Number(p.compareAtCents || 0) > Number(p.priceCents || 0),
    );
    return (offers.length > 0 ? offers : products).slice(0, limit);
  }
  return products.slice(0, limit);
}

function TourismPackageCard({
  item,
  onOpenQuote,
  onInspect,
}: {
  item: any;
  onOpenQuote?: (destination?: string, prefill?: any) => void;
  onInspect?: (item: any) => void;
}) {
  const imageUrl = item.cover_url || item.image_url || item.gallery_urls?.[0] || null;
  const priceCents = Number(item.price_cents || 0);

  return (
    <article className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col justify-between h-full">
      <button
        type="button"
        onClick={() => (onInspect ? onInspect(item) : onOpenQuote?.(item.destination || item.title))}
        className="block text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="aspect-4/3 w-full bg-muted overflow-hidden relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.title}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="size-full flex items-center justify-center text-muted-foreground">
              <AirplaneTilt className="size-10" weight="duotone" />
            </div>
          )}
          {item.category && (
            <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-card/90 border border-border text-xs font-bold text-foreground">
              {item.category}
            </span>
          )}
        </div>
        <div className="p-4 space-y-2">
          <h3 className="text-sm font-bold text-foreground line-clamp-2 break-words">{item.title}</h3>
          {(item.destination || item.location) && (
            <p className="text-xs text-muted-foreground break-words">
              {item.destination || item.location}
            </p>
          )}
          {priceCents > 0 && (
            <p className="text-base font-black font-mono tabular-nums text-primary">
              {formatMoney(priceCents)}
            </p>
          )}
        </div>
      </button>
      <div className="p-4 pt-0 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => (onInspect ? onInspect(item) : onOpenQuote?.(item.destination || item.title))}
          className="flex-1 h-11 min-h-11 rounded-xl text-xs font-bold cursor-pointer"
        >
          Ver Pacote
        </Button>
        {onOpenQuote && (
          <Button
            type="button"
            onClick={() => onOpenQuote(item.destination || item.title)}
            className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold cursor-pointer"
          >
            Cotar
          </Button>
        )}
      </div>
    </article>
  );
}

export function ServiceBookingCard({
  service,
  onBook,
}: {
  service: any;
  onBook?: (service: any) => void;
}) {
  const priceCents = Number(service.price_cents || 0);
  const durationMin = Number(service.duration_minutes || 0);
  const imageUrl = service.image_url || service.cover_url || null;

  return (
    <article className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col justify-between h-full">
      <div className="space-y-0">
        {imageUrl && (
          <div className="aspect-4/3 w-full bg-muted overflow-hidden">
            <img src={imageUrl} alt={service.title} className="size-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {service.category && <Badge variant="secondary">{service.category}</Badge>}
            {durationMin > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground">
                <Clock className="size-3.5" />
                <span>{durationMin} min</span>
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-foreground line-clamp-2">{service.title}</h3>
          {service.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
          )}
          <p className="text-base font-black font-mono text-primary">
            {priceCents > 0 ? formatMoney(priceCents) : "Sob consulta"}
          </p>
        </div>
      </div>

      <div className="p-4 pt-0">
        <Button
          type="button"
          onClick={() => onBook?.(service)}
          className="w-full h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CalendarDots className="size-4" weight="bold" />
          <span>Agendar Horário</span>
        </Button>
      </div>
    </article>
  );
}

export function ClassifiedPortfolioCard({
  item,
  onInspect,
}: {
  item: any;
  onInspect?: (item: any) => void;
}) {
  const imageUrl =
    (Array.isArray(item.images) ? item.images[0] : null) || item.cover_url || null;
  const priceCents = Number(item.price_cents || 0);

  return (
    <article className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col justify-between h-full">
      <button
        type="button"
        onClick={() => onInspect?.(item)}
        className="block text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="aspect-4/3 w-full bg-muted overflow-hidden relative">
          {imageUrl ? (
            <img src={imageUrl} alt={item.title} className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="size-full flex items-center justify-center text-muted-foreground">
              <Package className="size-8" />
            </div>
          )}
          {item.deal_type && (
            <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-card/90 border border-border text-xs font-bold text-foreground">
              {item.deal_type}
            </span>
          )}
        </div>
        <div className="p-4 space-y-2">
          <h3 className="text-sm font-bold text-foreground line-clamp-2 break-words">{item.title}</h3>
          {(item.city || item.location_name) && (
            <p className="text-xs text-muted-foreground break-words">
              {item.location_name || item.city}
            </p>
          )}
          <p className="text-base font-black font-mono tabular-nums text-primary">
            {priceCents > 0 ? formatMoney(priceCents) : "Consulte"}
          </p>
        </div>
      </button>
      <div className="p-4 pt-0">
        <Button
          type="button"
          variant="outline"
          onClick={() => onInspect?.(item)}
          className="w-full h-11 min-h-11 rounded-xl text-xs font-bold cursor-pointer"
        >
          Ver Detalhes
        </Button>
      </div>
    </article>
  );
}

export function BrandedProductItemCard({
  product,
  storeName,
  onSelectWithModifiers,
  onInspectProduct,
  isB2BGated = false,
  isAuthenticatedClient = false,
  clientPriceTableName,
  onRequireAuth,
}: {
  product: any;
  storeName: string;
  onSelectWithModifiers?: (p: any) => void;
  onInspectProduct?: (p: any) => void;
  isB2BGated?: boolean;
  isAuthenticatedClient?: boolean;
  clientPriceTableName?: string | null;
  onRequireAuth?: () => void;
}) {
  const { setCartData, setIsCartOpen } = useCartContext();
  const [adding, setAdding] = useState(false);

  const hasModifiers = Boolean(product.hasModifiers);
  const priceCents = Number(product.priceCents ?? product.price_cents ?? 0);
  const compareCents = Number(product.compareAtCents ?? product.compare_at_cents ?? 0);
  const discountPct =
    compareCents > priceCents && compareCents > 0
      ? Math.round(((compareCents - priceCents) / compareCents) * 100)
      : 0;
  void storeName;

  const handlePrimaryAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isB2BGated && !isAuthenticatedClient) {
      if (onRequireAuth) {
        onRequireAuth();
      } else if (onInspectProduct) {
        onInspectProduct(product);
      }
      return;
    }
    if (hasModifiers && onSelectWithModifiers) {
      onSelectWithModifiers(product);
      return;
    }
    if (onInspectProduct) {
      onInspectProduct(product);
      return;
    }
    setAdding(true);
    try {
      const res = await addToCart({ data: { productId: product.id, quantity: 1 } });
      if ((res as any)?.status === "error") {
        toast.error((res as any)?.message || "Não foi possível adicionar o item.");
        return;
      }
      if ((res as any)?.cart) {
        setCartData((res as any).cart);
        setIsCartOpen(true);
      }
      toast.success("Adicionado à sacola!");
    } catch {
      toast.error("Não foi possível adicionar o item.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <article className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col justify-between h-full">
      <button
        type="button"
        onClick={() => onInspectProduct?.(product)}
        className="block text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="aspect-4/3 w-full bg-muted overflow-hidden relative">
          {product.coverUrl || product.image_url ? (
            <img
              src={product.coverUrl || product.image_url}
              alt={product.title}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="size-full flex items-center justify-center text-muted-foreground">
              <Package className="size-8" />
            </div>
          )}
          {discountPct > 0 && !isB2BGated && (
            <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              -{discountPct}%
            </span>
          )}
        </div>
        <div className="p-4 space-y-1">
          <h3 className="text-sm font-bold text-foreground line-clamp-2">{product.title}</h3>
          {isB2BGated && !isAuthenticatedClient ? (
            <div className="pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-2xs font-semibold">
                Preços exclusivos para clientes credenciados
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-black font-mono text-primary">{formatMoney(priceCents)}</p>
              {compareCents > priceCents && (
                <span className="text-xs font-mono line-through text-muted-foreground">
                  {formatMoney(compareCents)}
                </span>
              )}
              {clientPriceTableName && (
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-2xs font-semibold">
                  Tabela {clientPriceTableName}
                </span>
              )}
            </div>
          )}
        </div>
      </button>
      <div className="p-4 pt-0">
        {isB2BGated && !isAuthenticatedClient ? (
          <Button
            type="button"
            onClick={handlePrimaryAction}
            className="w-full h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LockKey className="size-4" />
            <span>Ver Preço & Credenciar</span>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handlePrimaryAction}
            disabled={adding}
            className="w-full h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            <span>{hasModifiers ? "Personalizar" : "Ver & Comprar"}</span>
          </Button>
        )}
      </div>
    </article>
  );
}

function InfiniteCatalogSection({
  bundle,
  section,
  onSelectProductForModifiers,
  onInspectProduct,
  onInspectTourismItem,
  onInspectClassifiedItem,
  onInspectEventItem,
  onBookService,
  onBuyEventTicket,
  onOpenQuote,
  isB2BGated = false,
  isAuthenticatedClient = false,
  clientPriceTableName,
  onRequireAuth,
}: {
  bundle: BrandedAppRuntimeBundleDTO;
  section: BrandedAppSectionDTO;
  onSelectProductForModifiers?: (product: any) => void;
  onInspectProduct?: (product: any) => void;
  onInspectTourismItem?: (item: any) => void;
  onInspectClassifiedItem?: (item: any) => void;
  onInspectEventItem?: (item: any) => void;
  onBookService?: (service: any) => void;
  onBuyEventTicket?: (event: any, lot: any) => void;
  onOpenQuote?: (dest?: string) => void;
  isB2BGated?: boolean;
  isAuthenticatedClient?: boolean;
  clientPriceTableName?: string | null;
  onRequireAuth?: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("todas");
  const [layout, setLayout] = useState<"grid" | "list">(
    section.layout_mode === "list" ? "list" : "grid",
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const itemKind: "products" | "tourism" | "events" | "services" | "classifieds" =
    section.source_type === "tourism" ||
    (bundle.appConfig.template_id === "tourism_cvc" && bundle.tourismItems.length > 0 && bundle.products.length === 0)
      ? "tourism"
      : section.source_type === "events" ||
          (bundle.appConfig.template_id === "events_sympla" && bundle.events.length > 0 && bundle.products.length === 0)
        ? "events"
        : section.source_type === "services" ||
            (bundle.appConfig.template_id === "services_agenda" && bundle.services.length > 0 && bundle.products.length === 0)
          ? "services"
          : section.source_type === "classifieds" ||
              (bundle.classifieds.length > 0 && bundle.products.length === 0 && bundle.services.length === 0)
            ? "classifieds"
            : "products";

  const limit = section.items_limit || 12;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      "branded-app-infinite",
      bundle.store.id,
      section.id,
      itemKind,
      selectedCategoryId,
      searchTerm.trim(),
    ],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getBrandedAppInfiniteCatalogFn({
        data: {
          storeId: bundle.store.id,
          offset: Number(pageParam || 0),
          limit,
          categoryId: selectedCategoryId === "todas" ? null : selectedCategoryId,
          collectionId: section.source_type === "collection" ? section.source_id || null : null,
          search: searchTerm.trim() || null,
          itemKind,
        },
      }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextOffset : undefined),
  });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = useMemo(
    () => (data?.pages || []).flatMap((p) => p.items || []),
    [data],
  );

  return (
    <section aria-label={section.title || "Explorar catálogo"} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-foreground tracking-tight">
            {section.title || "Explorar Catálogo Completo"}
          </h2>
          {section.config?.subtitle && (
            <p className="text-xs text-muted-foreground">{section.config.subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <MagnifyingGlass className="size-4 text-muted-foreground absolute left-3 top-3.5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar no app..."
              aria-label="Buscar itens do catálogo"
              className="h-11 min-h-11 pl-9 rounded-xl text-xs bg-card"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setLayout((prev) => (prev === "grid" ? "list" : "grid"))}
            aria-label={layout === "grid" ? "Alternar para visualização em lista" : "Alternar para grade"}
            className="size-11 min-h-11 min-w-11 p-0 rounded-xl shrink-0 cursor-pointer"
          >
            {layout === "grid" ? <Rows className="size-4" /> : <SquaresFour className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Filtro Rápido por Categoria */}
      {itemKind === "products" && bundle.categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategoryId("todas")}
            className={cn(
              "h-11 min-h-11 px-4 rounded-full text-xs font-bold shrink-0 border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedCategoryId === "todas"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted",
            )}
          >
            Todos
          </button>
          {bundle.categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(cat.id)}
              className={cn(
                "h-11 min-h-11 px-4 rounded-full text-xs font-bold shrink-0 border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selectedCategoryId === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-muted",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Erro ao carregar itens"
          description="Não foi possível carregar o catálogo completo agora."
          onRetry={() => refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum item encontrado"
          description="Ajuste sua busca ou explore outras categorias acima."
        />
      ) : (
        <div
          className={cn(
            layout === "list"
              ? "grid grid-cols-1 md:grid-cols-2 gap-3"
              : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3",
          )}
        >
          {items.map((item: any) => {
            if (itemKind === "tourism") {
              return (
                <TourismPackageCard
                  key={item.id}
                  item={item}
                  onOpenQuote={onOpenQuote}
                  onInspect={onInspectTourismItem}
                />
              );
            }
            if (itemKind === "services") {
              return <ServiceBookingCard key={item.id} service={item} onBook={onBookService} />;
            }
            if (itemKind === "classifieds") {
              return (
                <ClassifiedPortfolioCard
                  key={item.id}
                  item={item}
                  onInspect={onInspectClassifiedItem}
                />
              );
            }
            if (itemKind === "events") {
              const lots = Array.isArray(item.ticket_lots) ? item.ticket_lots : [];
              const firstLot =
                lots.find(
                  (l: any) =>
                    l.status !== "closed" &&
                    ((l.capacity || 0) === 0 || (l.sold_count || 0) < l.capacity),
                ) || lots[0] || null;
              return (
                <div key={item.id} className="space-y-2">
                  <EventHorizontalCard
                    id={item.id}
                    title={item.title}
                    eventDate={item.event_date}
                    location={item.location}
                    venue={item.venue || item.venue_name}
                    coverImage={item.cover_image || item.cover_image_url}
                    priceCents={item.price_min_cents ?? item.min_price_cents}
                    isFree={Boolean(item.is_free)}
                    onSelect={() => onInspectEventItem?.(item)}
                  />
                  {firstLot && onBuyEventTicket && (
                    <Button
                      type="button"
                      onClick={() => onBuyEventTicket(item, firstLot)}
                      className="w-full h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Ticket className="size-4" />
                      <span>Garantir Ingresso</span>
                    </Button>
                  )}
                </div>
              );
            }
            return (
              <BrandedProductItemCard
                key={item.id}
                product={item}
                storeName={bundle.store.name}
                onSelectWithModifiers={onSelectProductForModifiers}
                onInspectProduct={onInspectProduct}
                isB2BGated={isB2BGated}
                isAuthenticatedClient={isAuthenticatedClient}
                clientPriceTableName={clientPriceTableName}
                onRequireAuth={onRequireAuth}
              />
            );
          })}
        </div>
      )}

      <div ref={sentinelRef} className="pt-2 flex justify-center">
        {isFetchingNextPage ? (
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground py-3">
            <CircleNotch className="size-4 animate-spin motion-reduce:animate-none" />
            <span>Carregando mais itens...</span>
          </div>
        ) : hasNextPage ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchNextPage()}
            className="h-11 min-h-11 px-6 rounded-xl text-xs font-bold cursor-pointer"
          >
            Carregar mais
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function renderItemsCollection(
  items: any[],
  layoutMode: AppSectionLayoutMode,
  renderItem: (item: any, index: number) => React.ReactNode,
  title?: string | null,
) {
  if (layoutMode === "carousel") {
    return (
      <HorizontalRail title={title || ""} hideHeader={!title}>
        {items.map((item, idx) => (
          <div key={item.id || idx} className="w-64 sm:w-72 shrink-0 snap-start">
            {renderItem(item, idx)}
          </div>
        ))}
      </HorizontalRail>
    );
  }

  if (layoutMode === "bento") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, idx) => (
          <div key={item.id || idx} className={idx === 0 ? "sm:col-span-2" : undefined}>
            {renderItem(item, idx)}
          </div>
        ))}
      </div>
    );
  }

  if (layoutMode === "list") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item, idx) => (
          <div key={item.id || idx}>{renderItem(item, idx)}</div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item, idx) => (
        <div key={item.id || idx}>{renderItem(item, idx)}</div>
      ))}
    </div>
  );
}

export function doesSectionMatchCity(
  cityFilter?: string | null,
  activeCity?: string | null,
): boolean {
  if (!cityFilter || !cityFilter.trim() || !activeCity || !activeCity.trim()) {
    return true;
  }
  const targetCity = activeCity.trim().toLowerCase();
  const allowedCities = cityFilter
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
  return allowedCities.includes(targetCity);
}

export function AppSectionsRenderer({
  bundle,
  sections,
  activeTabId,
  activeCity,
  activeTourismChannel = "pacotes",
  onTourismChannelChange,
  onOpenQuote,
  onSelectProductForModifiers,
  onInspectProduct,
  onInspectTourismItem,
  onInspectClassifiedItem,
  onInspectEventItem,
  onInspectJob,
  onBookService,
  onBuyEventTicket,
  onNavigateTab,
  isB2BGated = false,
  isAuthenticatedClient = false,
  clientPriceTableName,
  onRequireAuth,
}: AppSectionsRendererProps) {
  const visibleSections = useMemo(
    () =>
      sections
        .filter((s) => {
          if (!s.is_active) return false;
          const tabMatch = s.tab_id === activeTabId || (activeTabId === "home" && !s.tab_id);
          if (!tabMatch) return false;
          return doesSectionMatchCity(s.city_filter, activeCity);
        })
        .sort((a, b) => a.section_order - b.section_order),
    [sections, activeTabId, activeCity],
  );

  const attachedHomeOmniDoc = useMemo(() => {
    if (activeTabId !== "home" || !bundle.appConfig?.omni_page_id) return null;
    const alreadyInSections = visibleSections.some(
      (s) =>
        s.section_type === "omni_document" &&
        (s.source_id === bundle.appConfig.omni_page_id ||
          s.config?.omni_document_id === bundle.appConfig.omni_page_id),
    );
    if (alreadyInSections) return null;
    return (
      (bundle.omniDocuments || []).find(
        (doc) => doc.id === bundle.appConfig.omni_page_id && Boolean(doc.snapshot),
      ) || null
    );
  }, [activeTabId, bundle.appConfig?.omni_page_id, bundle.omniDocuments, visibleSections]);

  if (visibleSections.length === 0 && !attachedHomeOmniDoc) {
    return (
      <EmptyState
        title="Nenhuma seção ativa nesta aba"
        description="As seções configuradas para esta página aparecerão aqui automaticamente."
      />
    );
  }

  return (
    <div className="space-y-8">
      {attachedHomeOmniDoc?.snapshot && (
        <section aria-label={attachedHomeOmniDoc.title} className="space-y-3">
          <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
            <OmniPageRenderer
              document={attachedHomeOmniDoc.snapshot as any}
              storeData={bundle.store}
              products={bundle.products}
              categories={bundle.categories}
              collections={bundle.collections}
              classifieds={bundle.classifieds}
              posts={bundle.posts}
              flyers={bundle.flyers}
              events={bundle.events}
              jobs={bundle.jobs}
              banners={bundle.banners}
              activeCity={activeCity}
            />
          </Suspense>
        </section>
      )}

      {visibleSections.map((section) => {
        // 1. Turismo: Dock Estilo CVC
        if (section.section_type === "tourism_cvc_dock") {
          return (
            <section key={section.id} aria-label={section.title || "Serviços de viagem"} className="space-y-3">
              {section.title && (
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  {section.title}
                </h2>
              )}
              <CvcNavigationDock
                activeId={activeTourismChannel}
                onSelect={(id) => {
                  onTourismChannelChange?.(id);
                  if (id === "corporativo" && onNavigateTab) {
                    const corpTab = bundle.appConfig.navigation_tabs.find((t) => t.kind === "corporate" && t.enabled);
                    if (corpTab) onNavigateTab(corpTab.id);
                  }
                }}
              />
            </section>
          );
        }

        // 2. Turismo: Cotador Direto na API InfoTravel/Wooba
        if (section.section_type === "travel_api_quoter") {
          return (
            <section key={section.id} aria-label={section.title || "Cotação online"} className="space-y-4">
              {section.title && (
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  {section.title}
                </h2>
              )}
              <TourismDynamicSearchPanel
                activeChannel={activeTourismChannel === "todos" ? "pacotes" : activeTourismChannel}
                onChannelChange={(ch) => onTourismChannelChange?.(ch)}
                onOpenQuote={(dest, prefill) => onOpenQuote?.(dest, prefill)}
                storeId={bundle.store.id}
                agencyName={bundle.store.name}
                showCorporateTab={bundle.appConfig.niche_features.enableCorporateTravel !== false}
                onCorporateAction={() => {
                  onTourismChannelChange?.("corporativo");
                  const corpTab = bundle.appConfig.navigation_tabs.find((t) => t.kind === "corporate" && t.enabled);
                  if (corpTab && onNavigateTab) onNavigateTab(corpTab.id);
                }}
              />
              {activeTourismChannel === "corporativo" && (
                <CorporateVollConciergeView
                  agencyName={bundle.store.name}
                  agencyId={bundle.store.id}
                  whatsappNumber={bundle.store.whatsapp?.replace(/\D/g, "") || undefined}
                  corporatePortalUrl={bundle.appConfig.niche_features.corporateAppUrl || undefined}
                  corporatePortalLabel={bundle.appConfig.niche_features.corporateAppLabel || undefined}
                />
              )}
            </section>
          );
        }

        // 3. Botão / Bloco Viagens Corporativas
        if (section.section_type === "corporate_travel_cta") {
          const targetUrl =
            (section.config?.ctaUrl as string | undefined) ||
            bundle.appConfig.niche_features.corporateAppUrl ||
            null;
          const label =
            (section.config?.ctaLabel as string | undefined) ||
            bundle.appConfig.niche_features.corporateAppLabel ||
            "Acessar Viagens Corporativas";

          return (
            <section key={section.id} aria-label="Viagens Corporativas">
              <div className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Briefcase className="size-6" weight="duotone" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-extrabold text-foreground">
                      {section.title || "Viagens Corporativas para Empresas"}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {section.config?.subtitle ||
                        `Gestão de passagens, hotéis, aprovações e faturamento B2B com a ${bundle.store.name}.`}
                    </p>
                  </div>
                </div>

                {targetUrl ? (
                  <Button
                    asChild
                    className="h-11 min-h-11 px-5 rounded-xl text-xs font-bold gap-2 shrink-0 cursor-pointer"
                  >
                    <a href={targetUrl} target="_blank" rel="noopener noreferrer">
                      <span>{label}</span>
                      <ArrowRight className="size-4" />
                    </a>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      onTourismChannelChange?.("corporativo");
                      const corpTab = bundle.appConfig.navigation_tabs.find(
                        (t) => t.kind === "corporate" && t.enabled,
                      );
                      if (corpTab && onNavigateTab) onNavigateTab(corpTab.id);
                    }}
                    className="h-11 min-h-11 px-5 rounded-xl text-xs font-bold gap-2 shrink-0 cursor-pointer"
                  >
                    <span>{label}</span>
                    <ArrowRight className="size-4" />
                  </Button>
                )}
              </div>
            </section>
          );
        }

        // 4. Carrossel de Banners
        if (section.section_type === "banner_carousel") {
          if (!bundle.banners || bundle.banners.length === 0) return null;
          return (
            <section key={section.id} aria-label={section.title || "Banners promocionais"} className="space-y-3">
              {section.title && (
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  {section.title}
                </h2>
              )}
              <BannerHeroCarousel banners={bundle.banners} />
            </section>
          );
        }

        // 5. Eventos & Ingressos
        if (section.section_type === "events_rail") {
          const evList = (bundle.events || []).slice(0, section.items_limit || 12);
          return (
            <section key={section.id} aria-label={section.title || "Eventos"} className="space-y-3">
              {section.layout_mode !== "carousel" && section.title && (
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  {section.title}
                </h2>
              )}
              {evList.length === 0 ? (
                <EmptyState
                  title="Nenhum evento publicado"
                  description="Os próximos eventos e ingressos aparecerão aqui."
                />
              ) : (
                renderItemsCollection(
                  evList,
                  section.layout_mode,
                  (ev) => {
                    const lots = Array.isArray(ev.ticket_lots) ? ev.ticket_lots : [];
                    const firstLot =
                      lots.find(
                        (l: any) =>
                          l.status !== "closed" &&
                          ((l.capacity || 0) === 0 || (l.sold_count || 0) < l.capacity),
                      ) || lots[0] || null;
                    return (
                      <div className="space-y-2">
                        <EventHorizontalCard
                          id={ev.id}
                          title={ev.title}
                          eventDate={ev.event_date}
                          endDate={ev.end_date}
                          location={ev.location}
                          venue={ev.venue || ev.venue_name}
                          coverImage={ev.cover_image || ev.cover_image_url}
                          priceCents={ev.price_min_cents ?? ev.min_price_cents}
                          isFree={Boolean(ev.is_free)}
                          onSelect={() => onInspectEventItem?.(ev)}
                        />
                        {firstLot && onBuyEventTicket && (
                          <Button
                            type="button"
                            onClick={() => onBuyEventTicket(ev, firstLot)}
                            className="w-full h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Ticket className="size-4" />
                            <span>Garantir Ingresso</span>
                          </Button>
                        )}
                      </div>
                    );
                  },
                  section.layout_mode === "carousel" ? section.title : null,
                )
              )}
            </section>
          );
        }

        // 5.1 Serviços & Agendamento
        if (section.section_type === "featured_services" || section.source_type === "services") {
          const svcList = (bundle.services || []).slice(0, section.items_limit || 12);
          return (
            <section key={section.id} aria-label={section.title || "Serviços"} className="space-y-3">
              {section.layout_mode !== "carousel" && section.title && (
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  {section.title}
                </h2>
              )}
              {svcList.length === 0 ? (
                <EmptyState
                  title="Nenhum serviço agendável publicado"
                  description="Os serviços e horários de agendamento desta empresa aparecerão aqui."
                />
              ) : (
                renderItemsCollection(
                  svcList,
                  section.layout_mode,
                  (svc) => <ServiceBookingCard service={svc} onBook={onBookService} />,
                  section.layout_mode === "carousel" ? section.title : null,
                )
              )}
            </section>
          );
        }

        // 5.2 Portfólio, Veículos, Imóveis & Classificados da Loja
        if (section.source_type === "classifieds") {
          const clsList = (bundle.classifieds || []).slice(0, section.items_limit || 12);
          if (clsList.length === 0) return null;
          return (
            <section key={section.id} aria-label={section.title || "Portfólio"} className="space-y-3">
              {section.layout_mode !== "carousel" && section.title && (
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  {section.title}
                </h2>
              )}
              {renderItemsCollection(
                clsList,
                section.layout_mode,
                (item) => (
                  <ClassifiedPortfolioCard item={item} onInspect={onInspectClassifiedItem} />
                ),
                section.layout_mode === "carousel" ? section.title : null,
              )}
            </section>
          );
        }

        // 6. Formulário / Pesquisa / Captura de Lead Inline
        if (section.section_type === "lead_form" || section.section_type === "survey_form") {
          const targetForm =
            bundle.leadForms.find(
              (f: any) =>
                String(f.id) === String(section.source_id || "") ||
                String(f.slug) === String(section.config?.formSlug || ""),
            ) || bundle.leadForms[0];

          if (!targetForm) return null;
          return (
            <section key={section.id} aria-label={section.title || targetForm.title} className="space-y-3">
              {section.title && (
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  {section.title}
                </h2>
              )}
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
                <LeadFormRenderer
                  form={targetForm}
                  fields={targetForm.fields || []}
                  isStandalone={false}
                />
              </div>
            </section>
          );
        }

        // 7. Informações & Horários
        if (section.section_type === "contact_hours" || section.section_type === "brand_story") {
          return (
            <AppCompanyInfoTab
              key={section.id}
              store={bundle.store}
              jobs={bundle.jobs}
              reviews={bundle.reviews}
            />
          );
        }

        // 8. Bloco Customizado / Destaques Editoriais
        if (section.section_type === "highlight_cards" || section.section_type === "custom_text_block") {
          const cards = Array.isArray(section.config?.cards) ? section.config.cards : [];
          if (cards.length === 0 && !section.title && !section.config?.subtitle) return null;

          return (
            <section key={section.id} aria-label={section.title || "Destaques"} className="space-y-3">
              {section.title && (
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  {section.title}
                </h2>
              )}
              {cards.length > 0 ? (
                renderItemsCollection(cards, section.layout_mode, (card) => (
                  <article className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col justify-between h-full">
                    {card.imageUrl && (
                      <div className="aspect-4/3 w-full bg-muted overflow-hidden">
                        <img src={card.imageUrl} alt={card.title} className="size-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 space-y-2 flex-1">
                      {card.tag && <Badge variant="secondary">{card.tag}</Badge>}
                      <h3 className="text-sm font-bold text-foreground">{card.title}</h3>
                      {card.subtitle && (
                        <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                      )}
                    </div>
                    {card.linkUrl && (
                      <div className="p-4 pt-0">
                        <Button asChild variant="outline" className="w-full h-11 min-h-11 rounded-xl text-xs font-bold">
                          <a href={card.linkUrl}>Acessar</a>
                        </Button>
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  {section.config?.subtitle && (
                    <p className="text-sm text-foreground whitespace-pre-line break-words">
                      {section.config.subtitle}
                    </p>
                  )}
                  {section.config?.ctaLabel && section.config?.ctaUrl && (
                    <Button asChild className="h-11 min-h-11 rounded-xl text-xs font-bold">
                      <a href={section.config.ctaUrl}>{section.config.ctaLabel}</a>
                    </Button>
                  )}
                </div>
              )}
            </section>
          );
        }

        // 9. Feed Infinito Conectado ao Banco
        if (section.section_type === "infinite_feed") {
          return (
            <InfiniteCatalogSection
              key={section.id}
              bundle={bundle}
              section={section}
              onSelectProductForModifiers={onSelectProductForModifiers}
              onInspectProduct={onInspectProduct}
              onInspectTourismItem={onInspectTourismItem}
              onInspectClassifiedItem={onInspectClassifiedItem}
              onInspectEventItem={onInspectEventItem}
              onBookService={onBookService}
              onBuyEventTicket={onBuyEventTicket}
              onOpenQuote={onOpenQuote}
              isB2BGated={isB2BGated}
              isAuthenticatedClient={isAuthenticatedClient}
              clientPriceTableName={clientPriceTableName}
              onRequireAuth={onRequireAuth}
            />
          );
        }

        // 10. Encartes & Panfletos
        if (section.section_type === "promotional_flyers" || section.section_type === "coupons_grid") {
          const flyers = (bundle.flyers || []).slice(0, section.items_limit || 10);
          if (flyers.length === 0) return null;
          return (
            <section key={section.id} aria-label={section.title || "Encartes"} className="space-y-3">
              {section.title && (
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  {section.title}
                </h2>
              )}
              {renderItemsCollection(flyers, section.layout_mode, (f) => (
                <article className="rounded-2xl border border-border bg-card overflow-hidden">
                  {(f.image_url || f.cover_url) && (
                    <div className="aspect-4/3 bg-muted overflow-hidden">
                      <img
                        src={f.image_url || f.cover_url}
                        alt={f.title || "Encarte"}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="text-xs font-bold text-foreground truncate">
                      {f.title || "Oferta Especial"}
                    </h3>
                  </div>
                </article>
              ))}
            </section>
          );
        }

        // 10.5 Bloco ou Página Completa do Omni-Builder Híbrido
        if (section.section_type === "omni_document") {
          const targetDocId = String(
            section.source_id || section.config?.omni_document_id || bundle.appConfig?.omni_page_id || "",
          ).trim();
          const matchedDoc = (bundle.omniDocuments || []).find(
            (doc) => (targetDocId ? doc.id === targetDocId || doc.slug === targetDocId : true) && doc.snapshot,
          );
          if (!matchedDoc?.snapshot) return null;
          return (
            <section key={section.id} aria-label={section.title || matchedDoc.title} className="space-y-3">
              {section.title && (
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  {section.title}
                </h2>
              )}
              <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
                <OmniPageRenderer
                  document={matchedDoc.snapshot as any}
                  storeData={bundle.store}
                  products={bundle.products}
                  categories={bundle.categories}
                  collections={bundle.collections}
                  classifieds={bundle.classifieds}
                  posts={bundle.posts}
                  flyers={bundle.flyers}
                  events={bundle.events}
                  jobs={bundle.jobs}
                  banners={bundle.banners}
                  activeCity={activeCity}
                />
              </Suspense>
            </section>
          );
        }

        if (section.section_type === "omni_block") {
          const blockType = String(section.config?.omni_block_id || section.source_id || "").trim();
          if (!blockType) return null;
          const singleBlockDoc = {
            id: `section-omni-${section.id}`,
            slug: `section-${section.id}`,
            title: section.title || bundle.store.name,
            document_type: "general",
            blocks: [
              {
                id: `block-${section.id}`,
                type: blockType,
                props: (section.config?.omni_props as Record<string, any>) || {},
                styling: {},
              },
            ],
          };
          return (
            <section key={section.id} aria-label={section.title || "Bloco interativo"} className="space-y-3">
              {section.title && (
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  {section.title}
                </h2>
              )}
              <Suspense fallback={<Skeleton className="h-40 w-full rounded-2xl" />}>
                <OmniPageRenderer
                  document={singleBlockDoc as any}
                  storeData={bundle.store}
                  products={bundle.products}
                  categories={bundle.categories}
                  collections={bundle.collections}
                  classifieds={bundle.classifieds}
                  posts={bundle.posts}
                  flyers={bundle.flyers}
                  events={bundle.events}
                  jobs={bundle.jobs}
                  banners={bundle.banners}
                  activeCity={activeCity}
                />
              </Suspense>
            </section>
          );
        }

        // 10.6 Mural de Vagas da Empresa dentro do App
        if (section.section_type === "jobs_board") {
          const jobs = (bundle.jobs || []).slice(0, section.items_limit || 12);
          if (jobs.length === 0) return null;
          return (
            <section key={section.id} aria-label={section.title || "Vagas abertas"} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  {section.title || "Trabalhe Conosco"}
                </h2>
                <Badge variant="outline">{jobs.length} vagas</Badge>
              </div>
              {renderItemsCollection(jobs, section.layout_mode, (job) => (
                <article className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between gap-3 h-full">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-foreground line-clamp-2">{job.title}</h3>
                      {job.contract_type && <Badge variant="secondary">{job.contract_type}</Badge>}
                    </div>
                    {(job.location || job.workplace_type) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <MapPin className="size-3.5 shrink-0" weight="bold" />
                        <span>{[job.location, job.workplace_type].filter(Boolean).join(" · ")}</span>
                      </p>
                    )}
                    {job.salary_display && (
                      <p className="text-xs font-bold text-primary">{job.salary_display}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => (onInspectJob ? onInspectJob(job) : onNavigateTab?.("empresa"))}
                    className="w-full h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
                  >
                    <Briefcase className="size-4" weight="bold" />
                    <span>Ver Vaga e Candidatar</span>
                  </Button>
                </article>
              ))}
            </section>
          );
        }

        // 10.7 Avaliações Verificadas da Empresa (Zero fakes quando vazio)
        if (section.section_type === "reviews_showcase") {
          const reviews = (bundle.reviews || []).slice(0, section.items_limit || 12);
          if (reviews.length === 0) return null;
          return (
            <section key={section.id} aria-label={section.title || "Avaliações verificadas"} className="space-y-3">
              <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                {section.title || "Avaliações Verificadas"}
              </h2>
              {renderItemsCollection(reviews, section.layout_mode, (rev) => (
                <article className="rounded-2xl border border-border bg-card p-4 space-y-2 h-full">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-foreground truncate">
                      {rev.reviewer_name || "Cliente verificado"}
                    </span>
                    <div className="flex items-center gap-1 text-primary font-mono text-xs font-bold">
                      <Star className="size-3.5" weight="fill" />
                      <span>{Number(rev.rating || 5).toFixed(1)}</span>
                    </div>
                  </div>
                  {rev.verified_purchase && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <ShieldCheck className="size-3" weight="bold" />
                      <span>Compra verificada</span>
                    </Badge>
                  )}
                  {rev.comment && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line break-words">
                      {rev.comment}
                    </p>
                  )}
                </article>
              ))}
            </section>
          );
        }

        // 10.8 Destaque do Aplicativo / Domínio Próprio (permanece no domínio do app)
        if (section.section_type === "custom_domain_cta") {
          return (
            <section key={section.id} aria-label={section.title || "Acesso Oficial"} className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Globe className="size-4 text-primary" weight="bold" />
                  <span>{section.title || `${bundle.store.name} sempre com você`}</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  {section.config?.subtitle || "Acompanhe pedidos, agendamentos e atendimento direto em um só lugar."}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => onNavigateTab?.("minha_area")}
                className="h-11 min-h-11 px-5 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
              >
                {section.config?.ctaLabel || "Acessar Minha Área"}
              </Button>
            </section>
          );
        }

        // 11. Trilhos e Grades de Pacotes Turísticos, Cardápio Delivery ou Produtos por Categoria/Coleção
        const isTourismSource =
          section.source_type === "tourism" ||
          (bundle.appConfig.template_id === "tourism_cvc" &&
            section.source_type === "all" &&
            bundle.tourismItems.length > 0 &&
            bundle.products.length === 0);

        if (isTourismSource) {
          const tourismList = (bundle.tourismItems || []).slice(0, section.items_limit || 12);
          if (tourismList.length === 0) return null;
          return (
            <section key={section.id} aria-label={section.title || "Pacotes e roteiros"} className="space-y-3">
              {section.layout_mode !== "carousel" && section.title && (
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  {section.title}
                </h2>
              )}
              {renderItemsCollection(
                tourismList,
                section.layout_mode,
                (item) => (
                  <TourismPackageCard
                    item={item}
                    onOpenQuote={onOpenQuote}
                    onInspect={onInspectTourismItem}
                  />
                ),
                section.layout_mode === "carousel" ? section.title : null,
              )}
            </section>
          );
        }

        const sectionProducts = resolveSectionProducts(section, bundle);
        if (sectionProducts.length === 0) {
          if (section.section_type === "delivery_menu") {
            return (
              <section key={section.id} className="space-y-3">
                <h2 className="text-lg font-extrabold text-foreground">
                  {section.title || "Cardápio Digital"}
                </h2>
                <EmptyState
                  title="Cardápio em atualização"
                  description="Nenhum item publicado no momento."
                />
              </section>
            );
          }
          return null;
        }

        return (
          <section key={section.id} aria-label={section.title || "Produtos"} className="space-y-3">
            {section.layout_mode !== "carousel" && section.title && (
              <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                {section.title}
              </h2>
            )}
            {renderItemsCollection(
              sectionProducts,
              section.layout_mode,
              (p) => (
                <BrandedProductItemCard
                  product={p}
                  storeName={bundle.store.name}
                  onSelectWithModifiers={onSelectProductForModifiers}
                  onInspectProduct={onInspectProduct}
                  isB2BGated={isB2BGated}
                  isAuthenticatedClient={isAuthenticatedClient}
                  clientPriceTableName={clientPriceTableName}
                  onRequireAuth={onRequireAuth}
                />
              ),
              section.layout_mode === "carousel" ? section.title : null,
            )}
          </section>
        );
      })}
    </div>
  );
}
