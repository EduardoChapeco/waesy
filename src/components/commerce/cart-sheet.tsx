import { useState, useMemo } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  X,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  SlidersHorizontal,
  Package,
  Truck,
  CheckCircle2,
  Store,
  Check,
} from "lucide-react";
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

// Limiar padrão de frete grátis por loja (Mercado Livre parity: R$ 120,00)
const FREE_SHIPPING_THRESHOLD_CENTS = 12000;

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
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");

  // Itens selecionados para checkout (por padrão todos selecionados)
  const [unselectedItemIds, setUnselectedItemIds] = useState<Set<string>>(new Set());

  const handleToggleItemSelection = (itemId: string) => {
    setUnselectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleToggleStoreSelection = (storeCart: any) => {
    const storeItemIds = storeCart.items.map((it: any) => it.id);
    const allStoreSelected = storeItemIds.every((id: string) => !unselectedItemIds.has(id));

    setUnselectedItemIds((prev) => {
      const next = new Set(prev);
      if (allStoreSelected) {
        // Desmarcar todos os itens desta loja
        storeItemIds.forEach((id: string) => next.add(id));
      } else {
        // Marcar todos os itens desta loja
        storeItemIds.forEach((id: string) => next.delete(id));
      }
      return next;
    });
  };

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

  // Filtro de lojas ativas
  const visibleCarts = useMemo(() => {
    if (selectedStoreId === "all") return globalCarts;
    return globalCarts.filter((c) => c.storeId === selectedStoreId);
  }, [globalCarts, selectedStoreId]);

  // Cálculo de Subtotal baseado nos itens selecionados
  const selectedTotalCents = useMemo(() => {
    let sum = 0;
    globalCarts.forEach((cart) => {
      cart.items.forEach((item: any) => {
        if (!unselectedItemIds.has(item.id)) {
          sum += (item.priceCents || 0) * (item.qty || 1);
        }
      });
    });
    return sum;
  }, [globalCarts, unselectedItemIds]);

  const selectedItemCount = useMemo(() => {
    let count = 0;
    globalCarts.forEach((cart) => {
      cart.items.forEach((item: any) => {
        if (!unselectedItemIds.has(item.id)) {
          count += item.qty || 1;
        }
      });
    });
    return count;
  }, [globalCarts, unselectedItemIds]);

  return (
    <>
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent
          side="right"
          size="wide"
          className={cn(
            "w-full sm:max-w-lg md:max-w-xl flex flex-col p-0 bg-background/95 backdrop-blur-md border-l border-border/60 overscroll-contain",
            "max-sm:inset-0 max-sm:h-dvh max-sm:w-full max-sm:rounded-none max-sm:border-none"
          )}
        >
          {/* Cabeçalho do Carrinho */}
          <SheetHeader className="px-5 py-4 bg-card/60 backdrop-blur-md shrink-0 border-b border-border/40">
            <SheetTitle className="flex items-center justify-between font-bold text-foreground text-lg">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-foreground text-background flex items-center justify-center">
                  <ShoppingBag className="size-5" />
                </div>
                <div>
                  <span>Carrinho Multiloja</span>
                  {totalItemCount > 0 && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      ({selectedItemCount} de {totalItemCount} selecionados)
                    </span>
                  )}
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          {/* ── 1. Seletor de Modalidade (Alinhamento Estratégico R1) ── */}
          {totalItemCount > 0 && (
            <div className="px-4 py-2 bg-muted/20 border-b border-border/40 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setModalityFilter("all")}
                className={cn(
                  "h-11 min-h-11 px-4 text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  modalityFilter === "all"
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                Tudo ({totalItemCount})
              </button>
              <button
                type="button"
                onClick={() => setModalityFilter("delivery")}
                className={cn(
                  "h-11 min-h-11 px-4 text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  modalityFilter === "delivery"
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                Entrega / Físico
              </button>
              <button
                type="button"
                onClick={() => setModalityFilter("services")}
                className={cn(
                  "h-11 min-h-11 px-4 text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  modalityFilter === "services"
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                Agendamentos
              </button>
              <button
                type="button"
                onClick={() => setModalityFilter("digital")}
                className={cn(
                  "h-11 min-h-11 px-4 text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  modalityFilter === "digital"
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                Digitais & Vouchers
              </button>
            </div>
          )}

          {/* ── 2. Régua de Lojas (Mercado Livre Parity) se houver mais de 1 loja ── */}
          {globalCarts.length > 1 && (
            <div className="px-4 py-2 bg-muted/40 border-b border-border/40 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold shrink-0">
                Lojas:
              </span>
              <button
                type="button"
                onClick={() => setSelectedStoreId("all")}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  selectedStoreId === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
                )}
              >
                Todas ({globalCarts.length})
              </button>
              {globalCarts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedStoreId(c.storeId || "all")}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-xl text-xs font-semibold transition-colors shrink-0 flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                    selectedStoreId === c.storeId
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Store className="size-3.5" />
                  <span className="truncate max-w-30">{c.storeName}</span>
                </button>
              ))}
            </div>
          )}

          {/* Corpo com scroll */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-background scrollbar-none">
            {globalCarts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-4">
                <div className="size-20 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground/60 mb-2">
                  <ShoppingBag className="size-9" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Sua sacola está vazia</h3>
                <p className="font-sans text-xs text-muted-foreground max-w-xs">
                  Explore o comércio local, aproveite ofertas e finalize seus pedidos com entrega rápida.
                </p>
                <Button
                  onClick={handleNavigateToCatalog}
                  className="bg-foreground text-background rounded-xl font-bold text-xs px-6 h-11 min-h-11 cursor-pointer hover:bg-foreground/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  Explorar Mercado
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {visibleCarts.map((storeCart, idx) => {
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

                  const storeSubtotal = filteredItems.reduce(
                    (acc: number, item: any) => acc + (item.priceCents || 0) * (item.qty || 1),
                    0
                  );

                  // Cálculo de frete grátis da loja
                  const freeShippingRemainingCents = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - storeSubtotal);
                  const freeShippingPercent = Math.min(100, Math.round((storeSubtotal / FREE_SHIPPING_THRESHOLD_CENTS) * 100));
                  const hasFreeShipping = storeSubtotal >= FREE_SHIPPING_THRESHOLD_CENTS;

                  // Estado da seleção da loja inteira
                  const allStoreSelected = filteredItems.every((it: any) => !unselectedItemIds.has(it.id));

                  return (
                    <Surface
                      key={storeCart.id}
                      variant="default"
                      className="overflow-hidden rounded-2xl border border-border/70 shadow-xs"
                    >
                      {/* Cabeçalho da Loja com Checkbox & Barra de Frete Grátis */}
                      <div className="bg-muted/40 p-4 space-y-2 border-b border-border/40">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {/* Checkbox de Loja Inteira */}
                            <button
                              type="button"
                              onClick={() => handleToggleStoreSelection(storeCart)}
                              className={cn(
                                "size-11 min-h-11 min-w-11 rounded-xl flex items-center justify-center transition-colors border cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                                allStoreSelected
                                  ? "bg-foreground text-background border-foreground"
                                  : "bg-background border-border text-transparent hover:border-foreground"
                              )}
                              aria-label={`Selecionar todos os itens de ${storeCart.storeName}`}
                            >
                              <Check className="size-4" />
                            </button>

                            {storeCart.storeLogoUrl ? (
                              <img
                                src={storeCart.storeLogoUrl}
                                alt={storeCart.storeName}
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                }}
                                className="size-8 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="size-8 rounded-lg bg-card border border-border/60 flex items-center justify-center text-xs font-bold text-foreground">
                                {storeCart.storeName?.substring(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div>
                              <h4 className="text-xs font-bold text-foreground leading-tight">
                                {storeCart.storeName}
                              </h4>
                              <span className="text-2xs text-muted-foreground font-mono">
                                Pacote {idx + 1} • {filteredItems.length} {filteredItems.length === 1 ? "item" : "itens"}
                              </span>
                            </div>
                          </div>

                          <span className="text-xs font-mono font-bold text-foreground">
                            {formatMoney(storeSubtotal)}
                          </span>
                        </div>

                        {/* Barra de Frete Grátis Mercado Livre Parity */}
                        <div className="p-2 rounded-xl bg-background border border-border/40 space-y-2">
                          <div className="flex items-center justify-between text-2xs">
                            <div className="flex items-center gap-2 text-foreground font-medium">
                              {hasFreeShipping ? (
                                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Truck className="size-3.5 text-primary" />
                              )}
                              <span>
                                {hasFreeShipping ? (
                                  <strong className="text-emerald-600 dark:text-emerald-400">
                                    Você ganhou frete grátis nesta loja!
                                  </strong>
                                ) : (
                                  <>
                                    Faltam <strong>{formatMoney(freeShippingRemainingCents)}</strong> para frete grátis
                                  </>
                                )}
                              </span>
                            </div>
                            <span className="font-mono text-muted-foreground">{freeShippingPercent}%</span>
                          </div>

                          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-colors duration-300",
                                hasFreeShipping ? "bg-emerald-500" : "bg-primary"
                              )}
                              style={{ width: `${freeShippingPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Lista de Itens do Pacote */}
                      <div className="p-4 flex flex-col gap-4 divide-y divide-border/40">
                        {filteredItems.map((item: any) => {
                          const isItemSelected = !unselectedItemIds.has(item.id);

                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "pt-3 first:pt-0 flex gap-4 items-start transition-opacity",
                                !isItemSelected && "opacity-50",
                                isCartUpdating && "opacity-60 pointer-events-none"
                              )}
                            >
                              {/* Checkbox Individual do Item */}
                              <button
                                type="button"
                                onClick={() => handleToggleItemSelection(item.id)}
                                className={cn(
                                  "size-11 min-h-11 min-w-11 rounded-xl flex items-center justify-center transition-colors border shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none mt-1",
                                  isItemSelected
                                    ? "bg-foreground text-background border-foreground"
                                    : "bg-background border-border text-transparent hover:border-foreground"
                                )}
                                aria-label={`Selecionar ${item.productTitle}`}
                              >
                                <Check className="size-4" />
                              </button>

                              {/* Imagem do Produto */}
                              <div className="size-20 sm:size-24 shrink-0 overflow-hidden rounded-xl bg-muted/20 flex items-center justify-center relative group border border-border/40">
                                {item.coverUrl ? (
                                  <img
                                    src={item.coverUrl}
                                    alt={item.productTitle}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = "none";
                                    }}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                ) : (
                                  <Package className="size-7 text-muted-foreground/50" />
                                )}
                              </div>

                              <div className="flex flex-1 flex-col min-w-0 min-h-20 justify-between">
                                <div>
                                  <div className="flex justify-between items-start gap-2">
                                    <h4 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                                      {item.productTitle}
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={() => removeItem(item.id)}
                                      className="size-11 min-h-11 min-w-11 -mr-2 -mt-2 rounded-xl text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer flex items-center justify-center active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                      title="Remover item"
                                      aria-label="Remover item"
                                    >
                                      <X className="size-4" />
                                    </button>
                                  </div>

                                  {Object.entries(item.variantAttributes || {}).length > 0 && (
                                    <p className="text-2xs text-muted-foreground mt-1 font-medium">
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
                                          className="px-2 py-1 rounded-md text-3xs font-bold bg-primary/10 text-primary border border-primary/20"
                                        >
                                          +{lbl}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  <div className="pt-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingItem(item)}
                                      className="inline-flex items-center gap-2 text-2xs font-semibold text-foreground/80 hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-1 rounded-lg transition-colors cursor-pointer min-h-11 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                      <SlidersHorizontal className="size-3.5" />
                                      <span>Opções</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 mt-auto">
                                  <div className="flex items-center rounded-xl bg-card border border-border/50 p-1">
                                    <button
                                      type="button"
                                      className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                                      onClick={() => updateQty(item.variantId, -1, item.id)}
                                      disabled={item.qty <= 1}
                                      aria-label="Diminuir quantidade"
                                    >
                                      <Minus className="size-4" />
                                    </button>
                                    <span className="w-8 text-center text-xs font-mono font-bold text-foreground">
                                      {item.qty}
                                    </span>
                                    <button
                                      type="button"
                                      className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                                      onClick={() => updateQty(item.variantId, 1, item.id)}
                                      disabled={item.isOutOfStock}
                                      aria-label="Aumentar quantidade"
                                    >
                                      <Plus className="size-4" />
                                    </button>
                                  </div>

                                  <div className="text-right">
                                    <PriceDisplay
                                      amountCents={(item.priceCents || 0) * (item.qty || 1)}
                                      size="sm"
                                      className="text-foreground font-black font-mono text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
            <div className="bg-card/95 backdrop-blur-md p-4 pb-safe z-10 shrink-0 space-y-3 border-t border-border/60">
              <div className="space-y-1">
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Subtotal Selecionado ({selectedItemCount} itens)
                  </span>
                  <span className="text-xl font-black font-mono text-foreground">
                    {formatMoney(selectedTotalCents)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  * O frete e opções de entrega serão calculados no checkout.
                </p>
              </div>

              <Button
                size="lg"
                className="w-full h-11 min-h-11 bg-foreground text-background hover:bg-foreground/90 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                onClick={handleNavigateToCheckoutHub}
                disabled={isCartUpdating || selectedItemCount === 0}
              >
                <span>Finalizar Pedido ({selectedItemCount})</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {editingItem && (
        <CartItemEditDrawer
          open={Boolean(editingItem)}
          onOpenChange={(open) => {
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
        />
      )}
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
    <div className="border-t border-border/40 p-4 bg-muted/20 space-y-2">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-bold text-foreground">Aproveite e leve também</h5>
        <span className="text-2xs text-muted-foreground font-mono">Mesma loja</span>
      </div>
      <div className="flex flex-col gap-2">
        {crossSellItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 p-2 rounded-xl bg-card border border-border/50"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-11 min-h-11 min-w-11 rounded-lg overflow-hidden bg-muted/30 shrink-0 flex items-center justify-center">
                {item.coverUrl ? (
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                    className="size-full object-cover"
                  />
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
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleQuickAdd(item)}
              disabled={addingId === item.variantId}
              className="h-11 min-h-11 px-3 rounded-xl text-xs font-bold shrink-0 hover:bg-foreground hover:text-background transition-colors active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {addingId === item.variantId ? "Adicionando..." : "+ Adicionar"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
