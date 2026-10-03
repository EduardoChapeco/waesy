import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { X, Minus, Plus, ShoppingBag, ArrowRight, SlidersHorizontal, Package } from 'lucide-react';
import { formatMoney } from "@/lib/money";
import { addToCart, getCartCrossSellItems } from "@/services/cart.functions";
import type { CrossSellItemDTO } from "@/types/orders";
import { toast } from "sonner";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCartContext } from "@/lib/cart-context";
import { cn } from "@/lib/utils";
import { PriceDisplay } from "./price-display";
import { Surface } from "@/components/ui/surface";
import { CartItemEditDrawer } from "./cart-item-edit-drawer";

export function CartSheet() {
  const {
    globalCarts,
    isCartOpen,
    setIsCartOpen,
    updateQty,
    removeItem,
    isCartUpdating,
    refreshCart,
  } = useCartContext();
  const router = useRouter();

  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [modalityFilter, setModalityFilter] = useState<"all" | "delivery" | "services" | "digital">("all");

  const handleNavigateToCheckoutHub = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsCartOpen(false);
    router.navigate({ to: "/checkout" });
  };

  const handleNavigateToCatalog = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsCartOpen(false);
    router.navigate({ to: "/mercado" });
  };

  const totalItemCount = globalCarts.reduce((acc, c) => acc + c.itemCount, 0);
  const globalTotalCents = globalCarts.reduce(
    (acc, c) => acc + (c.totalCents - c.shippingCents),
    0,
  );

  return (
    <>
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent
          side="right"
          size="wide"
          className={cn(
            "w-full sm:max-w-lg md:max-w-xl flex flex-col p-0 bg-background/95 backdrop-blur-md border-l border-border/60",
            totalItemCount > 0
              ? "max-sm:inset-0 max-sm:h-dvh max-sm:w-full max-sm:rounded-none max-sm:border-none"
              : "max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-full max-sm:rounded-t-lg"
          )}
        >
          {/* Cabeçalho do Carrinho */}
          <SheetHeader className="px-6 py-4 bg-card/60 backdrop-blur-md shrink-0">
            <SheetTitle className="flex items-center justify-between font-bold text-foreground text-xl">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-lg bg-foreground text-background flex items-center justify-center">
                  <ShoppingBag className="size-5" />
                </div>
                <span>Carrinho{totalItemCount > 0 ? ` (${totalItemCount})` : ""}</span>
              </div>
            </SheetTitle>
          </SheetHeader>

          {/* ── Sacola Modular em Abas (Alinhamento Estratégico R1) ── */}
          {totalItemCount > 0 && (
            <div className="px-4 sm:px-6 py-2 bg-muted/20 border-b border-border/40 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setModalityFilter("all")}
                className={cn(
                  "px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0",
                  modalityFilter === "all"
                    ? "bg-foreground text-background"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                Tudo ({totalItemCount})
              </button>
              <button
                type="button"
                onClick={() => setModalityFilter("delivery")}
                className={cn(
                  "px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0",
                  modalityFilter === "delivery"
                    ? "bg-foreground text-background"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                Entrega / Físico
              </button>
              <button
                type="button"
                onClick={() => setModalityFilter("services")}
                className={cn(
                  "px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0",
                  modalityFilter === "services"
                    ? "bg-foreground text-background"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                Agendamentos
              </button>
              <button
                type="button"
                onClick={() => setModalityFilter("digital")}
                className={cn(
                  "px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0",
                  modalityFilter === "digital"
                    ? "bg-foreground text-background"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                Digitais & Vouchers
              </button>
            </div>
          )}

          {/* Corpo com scroll */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-background scrollbar-none">
            {globalCarts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-4">
                <div className="size-24 rounded-lg border-0 bg-muted/20 flex items-center justify-center text-muted-foreground/60 mb-2">
                  <ShoppingBag className="size-10" />
                </div>
                <h3 className="font-bold text-xl text-foreground">Sua sacola está vazia</h3>
                <p className="font-sans text-xs text-muted-foreground max-w-xs">
                  Explore o mercado local, descubra produtos incríveis e faça seus pedidos.
                </p>
                <Button /* focus-visible: */
                  onClick={handleNavigateToCatalog} /* focus-visible:ring-2 */
                  className="bg-foreground text-background rounded-lg font-bold text-xs px-6 h-11 cursor-pointer hover:bg-foreground/90 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Explorar Mercado
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {globalCarts.map((storeCart, idx) => {
                  const filteredItems = storeCart.items.filter((item: any) => {
                    if (modalityFilter === "all") return true;
                    const isDigital = Boolean(item.is_digital || item.type === "digital" || item.product?.type === "digital");
                    const isService = Boolean(item.is_service || item.type === "service" || item.item_type === "service");
                    if (modalityFilter === "digital") return isDigital;
                    if (modalityFilter === "services") return isService;
                    if (modalityFilter === "delivery") return !isDigital && !isService;
                    return true;
                  });

                  if (filteredItems.length === 0) return null;
                  return (
                  <Surface
                    key={storeCart.id}
                    variant="default"
                    className="overflow-hidden rounded-lg"
                  >
                    {/* Cabeçalho da Loja / Pacote */}
                    <div className="bg-muted/40 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {storeCart.storeLogoUrl ? (
                          <img
                            src={storeCart.storeLogoUrl}
                            alt={storeCart.storeName}
                            className="size-7 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="size-7 rounded-lg bg-card flex items-center justify-center text-xs font-bold text-foreground">
                            {storeCart.storeName?.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-foreground leading-tight">
                            {storeCart.storeName}
                          </h4>
                          <span className="text-xs font-mono text-muted-foreground">
                            Pacote {idx + 1}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-mono font-bold text-foreground">
                        {formatMoney(storeCart.totalCents - storeCart.shippingCents)}
                      </span>
                    </div>

                    {/* Lista de Itens do Pacote */}
                    <div className="p-4 flex flex-col gap-4 divide-y divide-border/40">
                      {filteredItems.map((item: any) => (
                        <div
                          key={item.id}
                          className={cn(
                            "pt-3 first:pt-0 flex gap-4 items-start",
                            isCartUpdating && "opacity-60 pointer-events-none",
                          )}
                        >
                          <div className="size-24 sm:size-28 shrink-0 overflow-hidden rounded-lg bg-muted/20 flex items-center justify-center relative group">
                            {item.coverUrl ? (
                              <img
                                src={item.coverUrl}
                                alt={item.productTitle}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <Package className="size-8 text-muted-foreground/50" />
                            )}
                          </div>

                          <div className="flex flex-1 flex-col min-w-0 min-h-24 justify-between">
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-snug">
                                  {item.productTitle}
                                </h4>
                                <button /* focus-visible: */
                                  type="button"
                                  onClick={() => removeItem(item.id)} /* focus-visible:ring-2 */
                                  className="size-11 -mr-2 -mt-2 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer flex items-center justify-center active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  title="Remover item"
                                  aria-label="Remover item"
                                >
                                  <X className="size-4" />
                                </button>
                              </div>

                              {Object.entries(item.variantAttributes || {}).length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1 font-medium">
                                  {Object.entries(item.variantAttributes || {})
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(" • ")}
                                </p>
                              )}

                              {item.selectedOptionsLabels && item.selectedOptionsLabels.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {item.selectedOptionsLabels.map((lbl: string, lIdx: number) => (
                                    <span
                                      key={lIdx}
                                      className="px-2 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/20"
                                    >
                                      +{lbl}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="pt-2">
                                <button /* focus-visible: */
                                  type="button"
                                  onClick={() => setEditingItem(item)} /* focus-visible:ring-2 */
                                  className="inline-flex items-center gap-2 text-xs font-semibold text-foreground/80 hover:text-foreground bg-muted/60 hover:bg-muted px-3 py-1 rounded-lg transition-colors cursor-pointer min-h-11 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <SlidersHorizontal className="size-4" />
                                  <span>Editar opções</span>
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 mt-auto">
                              <div className="flex items-center rounded-lg bg-card border border-border/50 p-1">
                                <button /* focus-visible: */
                                  type="button"
                                  className="size-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                                  onClick={() => updateQty(item.variantId, -1, item.id)} /* focus-visible:ring-2 */
                                  disabled={item.qty <= 1}
                                  aria-label="Diminuir quantidade"
                                >
                                  <Minus className="size-4" />
                                </button>
                                <span className="w-8 text-center text-xs font-mono font-bold text-foreground">
                                  {item.qty}
                                </span>
                                <button /* focus-visible: */
                                  type="button"
                                  className="size-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                                  onClick={() => updateQty(item.variantId, 1, item.id)} /* focus-visible:ring-2 */
                                  disabled={item.isOutOfStock}
                                  aria-label="Aumentar quantidade"
                                >
                                  <Plus className="size-4" />
                                </button>
                              </div>

                              <div className="text-right">
                                <PriceDisplay
                                  amountCents={item.priceCents * item.qty}
                                  size="sm"
                                  className="text-foreground font-black font-mono text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Seção Cross-Sell */}
                    <CartCrossSellSection
                      storeId={storeCart.storeId}
                      currentItems={storeCart.items}
                      onRefresh={refreshCart}
                    />
                  </Surface>
                );
                })}
              </div>
            )}
          </div>

          {/* Rodapé fixo do Carrinho */}
          {globalCarts.length > 0 && (
            <div className="bg-card/90 backdrop-blur-md p-4 pb-safe z-10 shrink-0 space-y-3 border-t border-border/60">
              <div className="space-y-1">
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Subtotal Geral
                  </span>
                  <span className="text-xl font-black font-mono text-foreground">
                    {formatMoney(globalTotalCents)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  * O frete e opções de entrega serão calculados no caixa.
                </p>
              </div>

              <Button /* focus-visible: */
                size="lg"
                className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-bold text-sm rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={handleNavigateToCheckoutHub} /* focus-visible:ring-2 */
                disabled={isCartUpdating}
              >
                <span>Finalizar Pedido</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CartItemEditDrawer
        open={Boolean(editingItem)}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
        item={editingItem}
      />
    </>
  );
}

function CartCrossSellSection({
  storeId,
  currentItems,
  onRefresh,
}: {
  storeId?: string;
  currentItems: any[];
  onRefresh: () => Promise<void>;
}) {
  const [crossSellItems, setCrossSellItems] = useState<CrossSellItemDTO[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadCrossSell() {
      if (!storeId) return;
      try {
        const variantIds = currentItems.map((it) => it.variantId || it.item_id).filter(Boolean);
        const data = await getCartCrossSellItems({
          data: { storeId, currentVariantIds: variantIds },
        });
        if (isMounted) setCrossSellItems(data || []);
      } catch (err) {
        console.warn("[cart-cross-sell] Erro ao carregar cross-sell:", err);
      }
    }
    loadCrossSell();
    return () => {
      isMounted = false;
    };
  }, [storeId, currentItems.length]);

  if (!storeId || crossSellItems.length === 0) return null;

  const handleQuickAdd = async (item: CrossSellItemDTO) => {
    setAddingId(item.variantId);
    try {
      await addToCart({
        data: {
          variantId: item.variantId,
          quantity: 1,
        },
      });
      toast.success("Item adicionado ao carrinho!");
      await onRefresh();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao adicionar item.");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="border-t border-border/40 p-4 bg-muted/20 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-bold text-foreground">Aproveite e leve também</h5>
        <span className="text-xs text-muted-foreground font-mono">Mesma loja</span>
      </div>
      <div className="flex flex-col gap-2">
        {crossSellItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 p-2 rounded-lg bg-card border border-border/50"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-11 rounded-lg overflow-hidden bg-muted/30 shrink-0 flex items-center justify-center">
                {item.coverUrl ? (
                  <img src={item.coverUrl} alt={item.title} className="size-full object-cover" />
                ) : (
                  <Package className="size-5 text-muted-foreground/40" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate max-w-xs">
                  {item.title}
                </p>
                <p className="text-xs font-bold font-mono text-foreground">
                  {formatMoney(item.priceCents)}
                </p>
              </div>
            </div>
            <Button /* focus-visible: */
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleQuickAdd(item)} /* focus-visible:ring-2 */
              disabled={addingId === item.variantId}
              className="h-11 px-3 rounded-lg text-xs font-bold shrink-0 hover:bg-foreground hover:text-background transition-colors active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {addingId === item.variantId ? "Adicionando..." : "+ Adicionar"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
