import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
  MagnifyingGlass,
  Plus,
  ArrowRight,
  ForkKnife,
  Storefront,
  Clock,
  MapPin,
  Snowflake,
  ShoppingBag,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/state/loading";
import { listPublishedProducts, getPublicStoreProfile, getStorePublicCatalog } from "@/services/catalog.functions";
import { useCartContext } from "@/lib/cart-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ProductCardDTO } from "@/types/catalog";

const SearchSchema = z.object({
  q: z.string().optional(),
  categoria: z.string().optional(),
  storeId: z.string().optional(),
  slug: z.string().optional(),
});

type CardapioSearch = z.infer<typeof SearchSchema>;

export const Route = createFileRoute("/_store/cardapio")({
  head: ({ loaderData }: any) => ({
    meta: [
      {
        title: loaderData?.storeProfile?.name
          ? `Cardápio Online — ${loaderData.storeProfile.name} | Waesy Delivery`
          : "Cardápio Online & Delivery | Waesy",
      },
      {
        name: "description",
        content: "Cardápio completo com opções deliciosas, entrega rápida e pedidos diretos.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): CardapioSearch =>
    SearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: search }) => {
    try {
      let storeProfile: any = null;
      let catalogItems: ProductCardDTO[] = [];

      if (search.storeId || search.slug) {
        const [profile, catalog] = await Promise.all([
          getPublicStoreProfile({ data: { storeId: search.storeId || search.slug! } }).catch(() => null),
          getStorePublicCatalog({ data: { storeId: search.storeId || search.slug! } }).catch(() => null),
        ]);
        storeProfile = profile;
        if (catalog && (catalog as any).products) {
          catalogItems = (catalog as any).products;
        }
      }

      if (catalogItems.length === 0) {
        const fallbackRes = await listPublishedProducts({
          data: { niche: "gastronomia", limit: 40 },
        }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] }));
        if (fallbackRes.status === "ok" && Array.isArray((fallbackRes as any).data)) {
          catalogItems = (fallbackRes as any).data;
        }
      }

      return {
        storeProfile,
        products: catalogItems,
      };
    } catch (err) {
      console.error("[loader:_store.cardapio] Error loading cardapio:", err);
      return { storeProfile: null, products: [] };
    }
  },
  pendingComponent: PageSkeleton,
  component: CardapioVerticalPage,
});

export function CardapioVerticalPage() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const { storeProfile, products } = loaderData;
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { globalCarts, addToCart } = useCartContext() as any;

  const [activeCategory, setActiveCategory] = useState(search.categoria || "todos");
  const [searchQuery, setSearchQuery] = useState(search.q || "");

  const storeName = storeProfile?.name || "Cardápio Digital";
  const storeLogo = storeProfile?.settings?.logoUrl || storeProfile?.settings?.logo_url || storeProfile?.logoUrl || null;
  const storeDeliveryEstimate = storeProfile?.settings?.delivery_estimate || "30 a 50 min";

  // Categorias extraídas dinamicamente dos produtos
  const categories = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(products)) {
      products.forEach((p: any) => {
        const cat = p.categoryName || p.category || (p.attributes as any)?.category_name;
        if (cat) set.add(cat);
      });
    }
    return ["todos", ...Array.from(set)];
  }, [products]);

  // Produtos filtrados
  const filteredProducts = useMemo(() => {
    let list = Array.isArray(products) ? products : [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p: any) =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (activeCategory && activeCategory !== "todos") {
      list = list.filter((p: any) => {
        const cat = p.categoryName || p.category || (p.attributes as any)?.category_name;
        return cat === activeCategory;
      });
    }

    return list;
  }, [products, searchQuery, activeCategory]);

  // Contagem do carrinho
  const allCartItems = Array.isArray(globalCarts) ? globalCarts.flatMap((c: any) => c.items) : [];
  const cartItemCount = allCartItems.reduce((acc: number, it: any) => acc + (it.qty || 1), 0);
  const cartSubtotalCents = allCartItems.reduce(
    (acc: number, it: any) => acc + (it.priceCents * (it.qty || 1)),
    0
  );

  const handleAddProduct = (prod: any) => {
    addToCart({
      id: prod.id,
      storeId: prod.storeId || storeProfile?.id || "",
      storeName: prod.storeName || storeName,
      title: prod.title,
      priceCents: prod.priceCents || prod.price_cents || 0,
      qty: 1,
      imageUrl: prod.media?.[0]?.url || prod.imageUrl || undefined,
    });
    toast.success(`${prod.title} adicionado ao pedido!`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-16 select-none">
      {/* ── 1. Header do Cardápio ── */}
      <header className="sticky top-0 z-20 bg-background border-b border-border/40 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            {storeLogo ? (
              <img
                src={storeLogo}
                alt=""
                className="size-11 rounded-xl object-cover border border-border/50 shrink-0"
              />
            ) : (
              <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ForkKnife size={22} weight="bold" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-foreground truncate">
                {storeName}
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 shrink-0">
                  <Clock size={13} weight="bold" />
                  {storeDeliveryEstimate}
                </span>
                {storeProfile?.city ? (
                  <>
                    <span>•</span>
                    <span className="truncate">{storeProfile.city}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <Link
            to="/carrinho"
            className="flex items-center gap-2 h-11 min-h-11 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
            aria-label={`Ver carrinho com ${cartItemCount} itens`}
          >
            <ShoppingBag size={18} weight="bold" />
            {cartItemCount > 0 ? (
              <span className="px-2 py-1 rounded-full bg-primary-foreground text-primary text-2xs font-black">
                {cartItemCount}
              </span>
            ) : null}
          </Link>
        </div>

        {/* Barra de Busca de Itens */}
        <div className="relative max-w-4xl mx-auto">
          <MagnifyingGlass
            size={18}
            weight="bold"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar no cardápio..."
            className="w-full h-11 min-h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border/40 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Buscar pratos no cardápio"
          />
        </div>

        {/* Régua de Categorias */}
        {categories.length > 1 ? (
          <div className="flex items-center gap-2 overflow-x-auto carousel no-scrollbar py-1 max-w-4xl mx-auto">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat);
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        categoria: cat === "todos" ? undefined : cat,
                      }),
                    });
                  }}
                  className={cn(
                    "h-11 min-h-11 px-4 rounded-xl text-xs font-bold transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary capitalize",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {cat === "todos" ? "Todos os Pratos" : cat}
                </button>
              );
            })}
          </div>
        ) : null}
      </header>

      {/* ── 2. Lista de Itens do Cardápio ── */}
      <main className="max-w-4xl mx-auto px-4 py-4 space-y-3">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredProducts.map((prod: any) => {
              const priceCents = prod.priceCents || prod.price_cents || 0;
              const formattedPrice = (priceCents / 100).toFixed(2).replace(".", ",");
              const imgUrl = prod.media?.[0]?.url || prod.imageUrl || null;
              const isChilled =
                (prod.attributes as any)?.temperature === "gelada" ||
                (prod.attributes as any)?.temperature === "gelado";

              return (
                <article
                  key={prod.id}
                  className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/60 hover:border-border transition-colors select-none"
                >
                  <div className="flex flex-col justify-between flex-1 min-w-0 pr-2 space-y-1">
                    <div>
                      {isChilled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-3xs font-extrabold uppercase bg-sky-600 text-primary-foreground mb-1">
                          <Snowflake size={10} weight="bold" />
                          Gelado
                        </span>
                      ) : null}
                      <h3 className="text-sm font-bold text-foreground line-clamp-1">
                        {prod.title}
                      </h3>
                      {prod.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {prod.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-extrabold text-foreground">
                        R$ {formattedPrice}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="size-20 rounded-xl bg-muted/40 overflow-hidden flex items-center justify-center border border-border/40">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={prod.title}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ForkKnife size={28} weight="duotone" className="text-muted-foreground/40" />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddProduct(prod)}
                      className="h-11 min-h-11 px-3 w-full rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`Adicionar ${prod.title} ao pedido`}
                    >
                      <Plus size={14} weight="bold" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center space-y-2">
            <ForkKnife size={40} weight="duotone" className="mx-auto text-muted-foreground/40" />
            <h2 className="text-sm font-bold text-foreground">Nenhum item encontrado</h2>
            <p className="text-xs text-muted-foreground">Tente buscar por outro termo ou categoria.</p>
          </div>
        )}
      </main>

      {/* ── 3. Barra de Pedido Flutuante ── */}
      {cartItemCount > 0 ? (
        <aside
          aria-label="Resumo do Pedido"
          className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-30 flex items-center justify-between p-3 rounded-2xl bg-primary text-primary-foreground border border-border/40 animate-in fade-in select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-primary-foreground/20 flex items-center justify-center font-black text-xs shrink-0">
              {cartItemCount}
            </div>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="text-2xs text-primary-foreground/80 font-semibold truncate">
                {storeName}
              </span>
              <span className="text-xs font-bold truncate">Ver pedido</span>
            </div>
          </div>

          <Link
            to="/carrinho"
            className="flex items-center gap-2 h-11 min-h-11 px-4 rounded-xl bg-primary-foreground text-primary font-black text-xs hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground shrink-0"
          >
            <span>R$ {(cartSubtotalCents / 100).toFixed(2).replace(".", ",")}</span>
            <ArrowRight size={14} weight="bold" />
          </Link>
        </aside>
      ) : null}
    </div>
  );
}
