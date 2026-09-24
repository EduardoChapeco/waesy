import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getCart,
  getGlobalCarts,
  removeFromCart,
  updateCartItemQty,
  applyCouponToCart,
  updateCartShipping,
} from "@/services/cart.functions";
import { calculateShipping } from "@/services/shipping.functions";
import { Trash2, Plus, Minus, ArrowRight, Ticket, Truck, CheckCircle2, ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/state/states";
import { PageSkeleton } from "@/components/state/loading";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/surface";

export const Route = createFileRoute("/_store/carrinho")({
  head: () => ({ meta: [{ title: "Meu Carrinho" }] }),
  loader: async () => {
    try {
      const carts = await getGlobalCarts();
      return carts && carts.length > 0 ? carts : [];
    } catch {
      return [];
    }
  },
 pendingComponent: PageSkeleton,
 component: StoreCartPage,
});

function StoreCartPage() {
 const carts = Route.useLoaderData();
 const router = useRouter();
 const [selectedStoreId, setSelectedStoreId] = useState<string | null>(
 carts && carts.length > 0 && carts[0] && carts[0].storeId ? carts[0].storeId : null,
 );

 const handleRemove = async (itemId: string) => {
 try {
 await removeFromCart({ data: { itemId } });
 router.invalidate();
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao remover do carrinho.");
 }
 };

 const handleUpdateQty = async (variantId: string, delta: number) => {
 try {
 await updateCartItemQty({ data: { variantId, delta } });
 router.invalidate();
 } catch (e: unknown) {
 toast.error(
 (e instanceof Error ? e.message : String(e)) ||
 "Estoque insuficiente ou erro de validação.",
 );
 }
 };

 const selectedCart = carts?.find((c: any) => c.storeId === selectedStoreId);

  return (
    <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 md:px-0 space-y-4 sm:space-y-6 pb-28 lg:pb-16">
      {/* ── Sub-Header Silencioso Nativo ── */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40 pt-1">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          Meu Carrinho
        </h1>
        {selectedCart && (
          <span className="text-xs text-muted-foreground font-semibold">
            {selectedCart.itemCount} {selectedCart.itemCount === 1 ? "item" : "itens"}
          </span>
        )}
      </div>

      {!carts || carts.length === 0 ? (
        <div className="py-14 px-2 flex flex-col items-center justify-center text-center">
          <div className="size-16 rounded-3xl bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground">
            <ShoppingBag className="size-8 stroke-[1.5]" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Seu carrinho está vazio</h2>
          <p className="text-xs text-muted-foreground max-w-xs mt-1 mb-6">
            Adicione produtos de restaurantes, mercados ou lojas da sua região para finalizar sua compra.
          </p>
          <Button
            onClick={() => router.navigate({ to: "/mercado" })}
            className="rounded-2xl h-11 px-6 font-bold text-sm cursor-pointer active:scale-95 transition-all"
          >
            Continuar Comprando
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10 items-start">
          {/* Coluna Esquerda: Listagem de Lojas e Itens */}
          <div className="lg:col-span-2 space-y-6">
            {carts.map((cart: any) => (
              <Surface
                key={cart.id}
                variant="default"
                className="p-4 sm:p-6 rounded-2xl border border-border/80 bg-card space-y-4"
              >
                <div
                  className="flex items-center justify-between cursor-pointer group pb-3 border-b border-border/40"
                  onClick={() => setSelectedStoreId(cart.storeId)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border transition-colors",
                        selectedStoreId === cart.storeId
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30 text-transparent group-hover:border-primary/50",
                      )}
                    >
                      <CheckCircle2 className="size-3.5" />
                    </div>
                    <h2 className="text-sm sm:text-base font-bold text-foreground">
                      {cart.storeName || `Loja ${cart.storeId?.split("-")[0]}`}
                    </h2>
                  </div>
                  {selectedStoreId === cart.storeId && (
                    <span className="text-[11px] font-semibold text-primary">Selecionado</span>
                  )}
                </div>

                <div className={cn("space-y-4", selectedStoreId !== cart.storeId && "opacity-60")}>
                  {cart.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex gap-3.5 sm:gap-4 py-3 sm:py-4 border-b border-border/40 last:border-0 items-center sm:items-start"
                    >
                      <div className="size-20 sm:size-24 flex-shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
                        {item.coverUrl ? (
                          <img
                            src={item.coverUrl}
                            alt={item.productTitle}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-muted flex items-center justify-center text-muted-foreground/30">
                            <ShoppingBag className="size-6 stroke-[1.5]" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                              {item.productTitle}
                            </h3>
                            {Object.entries(item.variantAttributes || {}).length > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {Object.entries(item.variantAttributes || {})
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(" | ")}
                              </p>
                            )}
                            {item.selectedOptionsLabels &&
                              item.selectedOptionsLabels.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1 flex-wrap">
                                  <span className="opacity-60">+</span>
                                  {item.selectedOptionsLabels.join(", ")}
                                </p>
                              )}
                            {item.isOutOfStock && (
                              <p className="text-[11px] font-bold text-destructive mt-1 block">
                                Sem estoque disponível
                              </p>
                            )}
                          </div>

                          <p
                            className={cn(
                              "font-mono font-bold text-sm sm:text-base shrink-0 text-foreground",
                              item.isOutOfStock && "opacity-50 line-through",
                            )}
                          >
                            {formatMoney(item.priceCents * item.qty)}
                          </p>
                        </div>

                        {/* Controles de Quantidade e Ação com hit-area mínima de 44px (Apple HIG) */}
                        <div className="flex items-center justify-between mt-3 pt-1">
                          <div className="inline-flex items-center rounded-xl border border-border/80 bg-background overflow-hidden">
                            <button
                              type="button"
                              className="size-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                              aria-label="Diminuir quantidade"
                              onClick={() => handleUpdateQty(item.variantId, -1)}
                            >
                              <Minus className="size-4" />
                            </button>
                            <span className="text-sm font-bold font-mono w-10 text-center select-none">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              className="size-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
                              aria-label="Aumentar quantidade"
                              onClick={() => handleUpdateQty(item.variantId, 1)}
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>

                          <button
                            type="button"
                            className="h-11 px-2 text-xs text-destructive/80 hover:text-destructive transition-colors cursor-pointer font-medium select-none"
                            onClick={() => handleRemove(item.id)}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>
            ))}
          </div>

          {/* Coluna Direita: Resumo Fixo Desktop (Apenas da loja selecionada) */}
          <div className="lg:col-span-1">
            <Surface
              variant="default"
              elevation="sm"
              className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card sticky top-24"
            >
              <h2 className="text-base font-bold mb-4 text-foreground">Resumo da Compra</h2>

              {!selectedCart ? (
                <div className="py-8 text-center text-muted-foreground text-xs">
                  Selecione uma loja para ver o resumo.
                </div>
              ) : (
                <>
                  <div className="space-y-3 text-xs mb-5 border-b border-border/40 pb-5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal ({selectedCart.itemCount} itens)</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatMoney(selectedCart.subtotalCents)}
                      </span>
                    </div>

                    {selectedCart.couponCode && (
                      <div className="flex justify-between text-success font-medium">
                        <span className="flex items-center gap-1">
                          <Ticket className="size-3.5" /> Cupom ({selectedCart.couponCode})
                        </span>
                        <span className="font-mono font-medium">
                          -{formatMoney(selectedCart.discountCents)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-baseline mb-6">
                    <span className="font-semibold text-sm text-foreground">Total estimado</span>
                    <span className="font-mono font-bold text-2xl tracking-tight text-foreground">
                      {formatMoney(selectedCart.totalCents - selectedCart.shippingCents)}
                    </span>
                  </div>

                  {selectedCart.items.some((i: any) => i.isOutOfStock) ? (
                    <Button size="lg" className="w-full font-bold rounded-xl h-11" disabled>
                      Remova itens sem estoque
                    </Button>
                  ) : (
                    <Link
                      to="/checkout"
                      search={{ store: selectedCart.storeId }}
                      className="w-full block"
                    >
                      <Button size="lg" className="w-full font-bold rounded-xl h-11 text-sm">
                        <span>Finalizar Compra</span>
                        <ArrowRight className="ml-2 size-4 shrink-0" />
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </Surface>
          </div>
        </div>
      )}

      {/* ── Sticky Mobile Bottom Bar (Thumb Zone para Mobile) ── */}
      {selectedCart && selectedCart.items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3.5 bg-background border-t border-border/60 z-40">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">
                Total Estimado
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-foreground leading-none">
                {formatMoney(selectedCart.totalCents - selectedCart.shippingCents)}
              </span>
            </div>

            {selectedCart.items.some((i: any) => i.isOutOfStock) ? (
              <Button className="h-12 px-5 font-bold rounded-xl text-xs" disabled>
                Itens sem estoque
              </Button>
            ) : (
              <Link
                to="/checkout"
                search={{ store: selectedCart.storeId }}
                className="flex-1 max-w-[220px]"
              >
                <Button className="w-full h-12 font-bold rounded-xl text-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground shadow-none active:scale-95 transition-all cursor-pointer">
                  <span>Finalizar Compra</span>
                  <ArrowRight className="size-4 shrink-0" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
 );
}
