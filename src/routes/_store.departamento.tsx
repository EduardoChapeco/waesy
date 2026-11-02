import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  ShoppingBag,
  MagnifyingGlass,
  ArrowRight,
  Storefront,
} from "@phosphor-icons/react";
import { PageSkeleton } from "@/components/state/loading";
import { listPublishedProducts } from "@/services/catalog.functions";
import {
  getSupermarketDeliveryWindows,
  getSupermarketClubMemberData,
  type SupermarketProductCardDTO,
} from "@/services/supermarket.functions";
import {
  SupermarketProductCard,
  SupermarketProductDetailModal,
  SupermarketBottomNav,
} from "@/components/commerce/supermarket";
import { useCartContext } from "@/lib/cart-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SearchSchema = z.object({
  categoria: z.string().optional().default("hortifruti"),
  q: z.string().optional(),
  storeId: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest").optional(),
});

type DepartamentoSearch = z.infer<typeof SearchSchema>;

const DEPARTMENTS: Record<string, string> = {
  hortifruti: "Hortifrúti & Feira",
  carnes: "Açougue & Carnes",
  padaria: "Padaria & Confeitaria",
  bebidas: "Bebidas & Adega",
  mercearia: "Mercearia & Despensa",
  limpeza: "Limpeza & Higiene",
  frios: "Laticínios & Frios",
};

export const Route = createFileRoute("/_store/departamento")({
  head: ({ search }: any) => {
    const deptTitle = DEPARTMENTS[search?.categoria || "hortifruti"] || "Departamento";
    return {
      meta: [
        { title: `${deptTitle} — Supermercado Online | Waesy` },
        {
          name: "description",
          content: `Confira todos os itens e ofertas de ${deptTitle} com entrega rápida.`,
        },
      ],
    };
  },
  validateSearch: (search: Record<string, unknown>): DepartamentoSearch =>
    SearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: search }) => {
    try {
      const [productsRes, deliveryWindows, clubMemberData] = await Promise.all([
        listPublishedProducts({
          data: { niche: "mercado", limit: 50, sort: search.sort ?? "newest" },
        }).catch(() => ({ status: "empty" as const, data: [] })),
        getSupermarketDeliveryWindows({ data: { storeId: search.storeId } }).catch(() => []),
        getSupermarketClubMemberData({ data: { storeId: search.storeId } }).catch(() => null),
      ]);

      return {
        catalogProducts: productsRes.status === "ok" ? (productsRes as any).data ?? [] : [],
        deliveryWindows: deliveryWindows || [],
        clubMemberData: clubMemberData || null,
      };
    } catch (err) {
      console.error("[loader:_store.departamento] Error:", err);
      return { catalogProducts: [], deliveryWindows: [], clubMemberData: null };
    }
  },
  pendingComponent: PageSkeleton,
  component: DepartamentoVerticalPage,
});

export function DepartamentoVerticalPage() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const { catalogProducts, clubMemberData } = loaderData;
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { globalCarts, addToCart } = useCartContext() as any;

  const activeCategory = search.categoria || "hortifruti";
  const departmentTitle = DEPARTMENTS[activeCategory] || "Departamento";
  const [searchQuery, setSearchQuery] = useState(search.q || "");
  const [selectedProduct, setSelectedProduct] = useState<SupermarketProductCardDTO | null>(null);

  // Mapeamento DTO
  const products: SupermarketProductCardDTO[] = useMemo(() => {
    if (!Array.isArray(catalogProducts)) return [];
    return catalogProducts.map((p: any) => {
      const attrs = p.attributes || {};
      const pricingTiers = attrs.pricing_tiers || {};
      const promotionalRule = attrs.promotional_rules || {};
      const freshFoodSpecs = attrs.fresh_food_specs || {};

      return {
        id: p.id,
        title: p.title,
        slug: p.slug || p.id,
        imageUrl: p.media?.[0]?.url || p.imageUrl || null,
        sku: attrs.sku || p.id.slice(0, 8),
        brand: attrs.brand || "",
        unit: freshFoodSpecs.pricing_unit || "un",
        priceCents: p.priceCents || p.price_cents || 0,
        compareAtCents: p.compareAtCents || p.compare_at_cents || undefined,
        clubPriceCents: pricingTiers.club_cents,
        onlineExclusivePriceCents: pricingTiers.online_cents,
        pricingTiers,
        promotionalRule,
        freshFoodSpecs,
        badges: attrs.badges || [],
        inStock: p.inStock ?? true,
        storeId: p.storeId || p.store_id || "",
        storeName: p.storeName || "Supermercado",
      };
    });
  }, [catalogProducts]);

  // Filtro do departamento
  const filteredProducts = useMemo(() => {
    let list = products;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q));
    }

    if (activeCategory) {
      list = list.filter((p) => {
        const titleLower = p.title.toLowerCase();
        if (activeCategory === "hortifruti") return titleLower.includes("tomate") || titleLower.includes("fruta") || titleLower.includes("legume") || p.freshFoodSpecs?.pricing_unit === "kg";
        if (activeCategory === "carnes") return titleLower.includes("carne") || titleLower.includes("frango") || titleLower.includes("bife") || titleLower.includes("hamburguer");
        if (activeCategory === "padaria") return titleLower.includes("pão") || titleLower.includes("bolo") || titleLower.includes("torta") || titleLower.includes("biscoito");
        if (activeCategory === "bebidas") return titleLower.includes("cerveja") || titleLower.includes("refrigerante") || titleLower.includes("suco") || titleLower.includes("água");
        if (activeCategory === "frios") return titleLower.includes("queijo") || titleLower.includes("presunto") || titleLower.includes("leite") || titleLower.includes("iogurte");
        if (activeCategory === "limpeza") return titleLower.includes("sabão") || titleLower.includes("detergente") || titleLower.includes("desinfetante");
        return true;
      });
    }

    return list;
  }, [products, searchQuery, activeCategory]);

  const allCartItems = Array.isArray(globalCarts) ? globalCarts.flatMap((c: any) => c.items) : [];
  const cartItemCount = allCartItems.reduce((acc: number, it: any) => acc + (it.qty || 1), 0);
  const cartSubtotalCents = allCartItems.reduce(
    (acc: number, it: any) => acc + (it.priceCents * (it.qty || 1)),
    0
  );

  const handleAddToCart = (product: SupermarketProductCardDTO) => {
    addToCart({
      id: product.id,
      storeId: product.storeId,
      storeName: product.storeName,
      title: product.title,
      priceCents: product.priceCents,
      qty: 1,
      imageUrl: product.imageUrl || undefined,
    });
    toast.success(`${product.title} adicionado ao carrinho!`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-16 select-none">
      {/* ── Header do Departamento ── */}
      <header className="sticky top-0 z-20 bg-background border-b border-border/40 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <Link
              to="/mercado"
              className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Voltar para supermercado"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <span className="text-3xs uppercase tracking-wider text-muted-foreground font-semibold">
                Departamento
              </span>
              <h1 className="text-base font-extrabold text-foreground truncate">
                {departmentTitle}
              </h1>
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
        <div className="relative max-w-5xl mx-auto">
          <MagnifyingGlass
            size={18}
            weight="bold"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Buscar em ${departmentTitle}...`}
            className="w-full h-11 min-h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border/40 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Buscar em ${departmentTitle}`}
          />
        </div>

        {/* Régua de Troca Rápida de Departamentos */}
        <div className="flex items-center gap-2 overflow-x-auto carousel no-scrollbar py-1 max-w-5xl mx-auto">
          {Object.entries(DEPARTMENTS).map(([key, label]) => {
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  navigate({
                    search: (prev: any) => ({ ...prev, categoria: key }),
                  });
                }}
                className={cn(
                  "h-11 min-h-11 px-4 rounded-xl text-xs font-bold transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Grade de Produtos ── */}
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground">
            {filteredProducts.length} itens disponíveis
          </span>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((prod) => (
              <SupermarketProductCard
                key={prod.id}
                product={prod}
                isMember={Boolean(clubMemberData?.isMember)}
                onAddToCart={handleAddToCart}
                onProductClick={(p) => setSelectedProduct(p)}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center space-y-2">
            <Storefront size={40} weight="duotone" className="mx-auto text-muted-foreground/40" />
            <h2 className="text-sm font-bold text-foreground">Nenhum produto neste departamento</h2>
            <p className="text-xs text-muted-foreground">Tente outro departamento ou termo de busca.</p>
          </div>
        )}
      </main>

      {/* ── Modal de Detalhe ── */}
      <SupermarketProductDetailModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={({ product, quantity }) => {
          addToCart({
            id: product.id,
            storeId: product.storeId,
            storeName: product.storeName,
            title: product.title,
            priceCents: product.priceCents,
            qty: quantity,
            imageUrl: product.imageUrl || undefined,
          });
          toast.success(`${quantity}x ${product.title} adicionado!`);
        }}
        isMember={Boolean(clubMemberData?.isMember)}
      />

      {/* ── Barra de Carrinho Flutuante ── */}
      {cartItemCount > 0 ? (
        <aside
          aria-label="Resumo do Carrinho"
          className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-30 flex items-center justify-between p-3 rounded-2xl bg-emerald-600 text-primary-foreground border border-border/40 animate-in fade-in select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-primary-foreground/20 flex items-center justify-center font-black text-xs shrink-0">
              {cartItemCount}
            </div>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="text-xs font-bold truncate">Ver carrinho de compras</span>
            </div>
          </div>

          <Link
            to="/carrinho"
            className="flex items-center gap-2 h-11 min-h-11 px-4 rounded-xl bg-card text-foreground font-black text-xs hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          >
            <span>R$ {(cartSubtotalCents / 100).toFixed(2).replace(".", ",")}</span>
            <ArrowRight size={14} weight="bold" />
          </Link>
        </aside>
      ) : null}
    </div>
  );
}
