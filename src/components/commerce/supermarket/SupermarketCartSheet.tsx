import React, { useState } from "react";
import {
  X,
  Trash,
  Minus,
  Plus,
  ShoppingBag,
  Lightning,
  Gift,
  Truck,
  Storefront,
  CreditCard,
  QrCode,
  Money,
  Info,
  PencilSimple,
  ArrowRight,
  ArrowLeft,
  Check,
} from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCartContext } from "@/lib/cart-context";
import { toast } from "sonner";

interface SupermarketCartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  freeShippingThresholdCents?: number;
  onCheckoutComplete?: (orderData: any) => void;
  orderBumpProduct?: {
    id: string;
    title: string;
    priceCents: number;
    imageUrl?: string | null;
  } | null;
}

export function SupermarketCartSheet({
  isOpen,
  onClose,
  freeShippingThresholdCents = 15000,
  onCheckoutComplete,
  orderBumpProduct,
}: SupermarketCartSheetProps) {
  const { globalCarts, updateQty, removeItem, isCartUpdating } = useCartContext();

  const [checkoutStep, setCheckoutStep] = useState<"cart" | "shipping" | "payment" | "review">("cart");
  const [shippingMode, setShippingMode] = useState<"delivery" | "pickup">("delivery");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card_online" | "card_delivery" | "cash">("pix");
  const [itemComments, setItemComments] = useState<Record<string, string>>({});
  const [activeCommentItemId, setActiveCommentItemId] = useState<string | null>(null);

  // Consolidar todos os itens do carrinho ativo
  const allItems = globalCarts.flatMap((c) => c.items);
  const subtotalCents = allItems.reduce((acc, it) => acc + (it.priceCents * it.qty), 0);

  // Meta de Frete Grátis
  const isFreeShipping = subtotalCents >= freeShippingThresholdCents;
  const progressPercent = Math.min(100, Math.round((subtotalCents / freeShippingThresholdCents) * 100));
  const remainingCents = Math.max(0, freeShippingThresholdCents - subtotalCents);

  const formattedSubtotal = (subtotalCents / 100).toFixed(2).replace(".", ",");
  const deliveryFeeCents = isFreeShipping || shippingMode === "pickup" ? 0 : 1500;
  const totalCents = subtotalCents + deliveryFeeCents;
  const formattedTotal = (totalCents / 100).toFixed(2).replace(".", ",");

  const handleFinishPurchase = () => {
    toast.success("Pedido de supermercado enviado com sucesso para separação!");
    onCheckoutComplete?.({
      items: allItems,
      shippingMode,
      paymentMethod,
      totalCents,
      comments: itemComments,
    });
    setCheckoutStep("cart");
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col bg-background gap-0 max-h-screen"
      >
        {/* ── Top Bar do Carrinho / Checkout ── */}
        <SheetHeader className="p-4 border-b border-border/40 bg-background/95 backdrop-blur-md flex flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {checkoutStep !== "cart" ? (
              <button
                type="button"
                onClick={() => {
                  if (checkoutStep === "shipping") setCheckoutStep("cart");
                  if (checkoutStep === "payment") setCheckoutStep("shipping");
                  if (checkoutStep === "review") setCheckoutStep("payment");
                }}
                className="size-11 min-w-11 min-h-11 flex items-center justify-center rounded-xl hover:bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Voltar etapa"
              >
                <ArrowLeft size={20} weight="bold" />
              </button>
            ) : null}

            <SheetTitle className="text-base font-bold text-foreground">
              {checkoutStep === "cart" && "Meu Carrinho"}
              {checkoutStep === "shipping" && "Opções de Envio"}
              {checkoutStep === "payment" && "Método de Pagamento"}
              {checkoutStep === "review" && "Revisão do Pedido"}
            </SheetTitle>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              className="size-11 min-w-11 min-h-11 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Fechar carrinho"
            >
              <X size={20} weight="bold" />
            </button>
          </div>
        </SheetHeader>

        {/* ── Stepper do Checkout (Quando em fluxo de compra) ── */}
        {checkoutStep !== "cart" ? (
          <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-b border-border/40 text-2xs font-bold text-muted-foreground">
            <span className={cn(checkoutStep === "shipping" && "text-primary font-extrabold")}>
              1. Envio
            </span>
            <span>•</span>
            <span className={cn(checkoutStep === "payment" && "text-primary font-extrabold")}>
              2. Pagamento
            </span>
            <span>•</span>
            <span className={cn(checkoutStep === "review" && "text-primary font-extrabold")}>
              3. Revisão
            </span>
          </div>
        ) : null}

        {/* ── Conteúdo Principal do Carrinho (Etapa 1: "cart") ── */}
        {checkoutStep === "cart" ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Barra de Progresso de Frete Grátis */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2 text-foreground">
                  <Gift size={16} weight="duotone" className="text-emerald-600" />
                  {isFreeShipping ? "Você ganhou Frete Grátis!" : `Faltam R$ ${(remainingCents / 100).toFixed(2).replace(".", ",")} para frete grátis`}
                </span>
                <span className="text-2xs text-muted-foreground font-semibold">
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-colors duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Lista de Itens do Carrinho */}
            {allItems.length > 0 ? (
              <div className="space-y-3">
                <span className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Seus produtos ({allItems.length})
                </span>

                {allItems.map((item) => {
                  const itemTotal = ((item.priceCents * item.qty) / 100).toFixed(2).replace(".", ",");
                  const hasComment = Boolean(itemComments[item.id]);

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-card border border-border/60 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        {/* Imagem do Item */}
                        <div className="size-16 rounded-xl bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center border border-border/40">
                          {item.imageUrl ?? (item as any).image_url ? (
                            <img src={item.imageUrl ?? (item as any).image_url} alt="" className="w-full h-full object-contain p-1" />
                          ) : (
                            <ShoppingBag size={24} weight="duotone" className="text-muted-foreground" />
                          )}
                        </div>

                        {/* Título & Preço */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-foreground line-clamp-2">
                            {item.productTitle ?? (item as any).title ?? (item as any).product_name ?? (item as any).name}
                          </h4>
                          <span className="text-sm font-extrabold text-foreground">
                            R$ {itemTotal}
                          </span>
                        </div>

                        {/* Stepper de Quantidade com Lixeira no 1 */}
                        <div className="flex items-center border border-border/60 rounded-xl h-11 min-h-11 px-1 shrink-0 bg-muted/20">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.qty <= 1) {
                                removeItem(item.id);
                              } else {
                                updateQty(item.id, item.qty - 1);
                              }
                            }}
                            className="size-11 min-w-11 min-h-11 flex items-center justify-center text-foreground hover:bg-muted/60 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label="Diminuir ou remover item"
                          >
                            {item.qty <= 1 ? <Trash size={16} weight="bold" className="text-destructive" /> : <Minus size={14} weight="bold" />}
                          </button>

                          <span className="w-8 text-center text-xs font-bold text-foreground">
                            {item.qty}
                          </span>

                          <button
                            type="button"
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            className="size-11 min-w-11 min-h-11 flex items-center justify-center text-foreground hover:bg-muted/60 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label="Aumentar quantidade"
                          >
                            <Plus size={14} weight="bold" />
                          </button>
                        </div>
                      </div>

                      {/* Ação de Comentários por Item (Substituições de estoque) */}
                      <div className="flex items-center justify-between text-2xs pt-1 border-t border-border/30">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveCommentItemId(activeCommentItemId === item.id ? null : item.id)
                          }
                          className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                        >
                          <PencilSimple size={13} weight="bold" className="text-primary" />
                          <span>{hasComment ? "Editar instrução" : "Comentários para o separador"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:underline font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                        >
                          Remover
                        </button>
                      </div>

                      {activeCommentItemId === item.id ? (
                        <div className="pt-1">
                          <input
                            type="text"
                            value={itemComments[item.id] || ""}
                            onChange={(e) =>
                              setItemComments((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            placeholder="Ex: Se não tiver maduro, pode substituir por..."
                            className="w-full h-11 min-h-11 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center space-y-2">
                <ShoppingBag size={48} weight="duotone" className="mx-auto text-muted-foreground/40" />
                <p className="text-sm font-semibold text-foreground">Seu carrinho está vazio</p>
                <p className="text-xs text-muted-foreground">Adicione produtos de supermercado para continuar.</p>
              </div>
            )}

            {/* Card de Order Bump (Oferta Relâmpago em Linha) */}
            {orderBumpProduct && allItems.length > 0 ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                  <Lightning size={16} weight="fill" className="text-amber-500" />
                  <span>Oferta Relâmpago Imperdível</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {orderBumpProduct.imageUrl ? (
                      <img src={orderBumpProduct.imageUrl} alt="" className="size-10 rounded-lg object-contain bg-background p-1 shrink-0" />
                    ) : null}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground line-clamp-1">{orderBumpProduct.title}</p>
                      <p className="text-xs font-black text-foreground">
                        R$ {(orderBumpProduct.priceCents / 100).toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-11 min-h-11 px-3 rounded-xl text-xs font-bold shrink-0"
                    onClick={() => {
                      toast.success(`${orderBumpProduct.title} adicionado à sua compra!`);
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Etapa 2: Opções de Envio ("shipping") ── */}
        {checkoutStep === "shipping" ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <h3 className="text-sm font-extrabold text-foreground">
              Escolha como você deseja receber sua compra:
            </h3>

            {/* Opção Entrega */}
            <div
              onClick={() => setShippingMode("delivery")}
              className={cn(
                "p-4 rounded-2xl border cursor-pointer transition-colors space-y-2 focus-visible:ring-2 focus-visible:ring-primary",
                shippingMode === "delivery"
                  ? "border-primary bg-primary/5"
                  : "border-border/60 hover:border-border",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Truck size={20} weight="bold" className="text-primary" />
                  <span className="text-sm font-bold text-foreground">Receber em meu endereço</span>
                </div>
                <div className={cn("size-4 rounded-full border-2 flex items-center justify-center", shippingMode === "delivery" ? "border-primary bg-primary" : "border-muted-foreground")}>
                  {shippingMode === "delivery" ? <div className="size-1.5 rounded-full bg-primary-foreground" /> : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground pl-7">
                Entregue diretamente na porta da sua casa com agendamento.
              </p>
            </div>

            {/* Opção Retirada */}
            <div
              onClick={() => setShippingMode("pickup")}
              className={cn(
                "p-4 rounded-2xl border cursor-pointer transition-colors space-y-2 focus-visible:ring-2 focus-visible:ring-primary",
                shippingMode === "pickup"
                  ? "border-primary bg-primary/5"
                  : "border-border/60 hover:border-border",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Storefront size={20} weight="bold" className="text-primary" />
                  <span className="text-sm font-bold text-foreground">Irei retirar na loja</span>
                </div>
                <div className={cn("size-4 rounded-full border-2 flex items-center justify-center", shippingMode === "pickup" ? "border-primary bg-primary" : "border-muted-foreground")}>
                  {shippingMode === "pickup" ? <div className="size-1.5 rounded-full bg-primary-foreground" /> : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground pl-7">
                Seus produtos serão embalados e disponibilizados no balcão de retirada (Grátis).
              </p>
            </div>
          </div>
        ) : null}

        {/* ── Etapa 3: Método de Pagamento ("payment") ── */}
        {checkoutStep === "payment" ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <h3 className="text-sm font-extrabold text-foreground">
              Como você prefere pagar?
            </h3>

            {/* Pagar Agora (Online) */}
            <div className="space-y-2">
              <span className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold">
                Pagar agora (Online)
              </span>

              <div
                onClick={() => setPaymentMethod("pix")}
                className={cn(
                  "p-4 rounded-2xl border cursor-pointer flex items-center justify-between focus-visible:ring-2 focus-visible:ring-primary",
                  paymentMethod === "pix" ? "border-primary bg-primary/5" : "border-border/60 hover:border-border",
                )}
              >
                <div className="flex items-center gap-3">
                  <QrCode size={20} weight="bold" className="text-emerald-600" />
                  <span className="text-xs font-bold text-foreground">Pix Instantâneo</span>
                </div>
                <span className="text-3xs font-bold px-2 py-1 rounded-full bg-emerald-600/10 text-emerald-600">
                  Aprovação Imediata
                </span>
              </div>

              <div
                onClick={() => setPaymentMethod("card_online")}
                className={cn(
                  "p-4 rounded-2xl border cursor-pointer flex items-center justify-between focus-visible:ring-2 focus-visible:ring-primary",
                  paymentMethod === "card_online" ? "border-primary bg-primary/5" : "border-border/60 hover:border-border",
                )}
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={20} weight="bold" className="text-primary" />
                  <span className="text-xs font-bold text-foreground">Cartão de Crédito Online</span>
                </div>
              </div>
            </div>

            {/* Pagar na Entrega */}
            <div className="space-y-2">
              <span className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold">
                Pagar na entrega / retirada
              </span>

              <div
                onClick={() => setPaymentMethod("card_delivery")}
                className={cn(
                  "p-4 rounded-2xl border cursor-pointer flex items-center justify-between focus-visible:ring-2 focus-visible:ring-primary",
                  paymentMethod === "card_delivery" ? "border-primary bg-primary/5" : "border-border/60 hover:border-border",
                )}
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={20} weight="bold" className="text-foreground" />
                  <span className="text-xs font-bold text-foreground">Cartão na Maquininha</span>
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod("cash")}
                className={cn(
                  "p-4 rounded-2xl border cursor-pointer flex items-center justify-between focus-visible:ring-2 focus-visible:ring-primary",
                  paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-border/60 hover:border-border",
                )}
              >
                <div className="flex items-center gap-3">
                  <Money size={20} weight="bold" className="text-emerald-600" />
                  <span className="text-xs font-bold text-foreground">Dinheiro</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Etapa 4: Revisão do Pedido ("review") ── */}
        {checkoutStep === "review" ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <h3 className="text-sm font-extrabold text-foreground">
              Revise e finalize sua compra:
            </h3>

            {/* Resumo Financeiro */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({allItems.length} itens)</span>
                <span>R$ {formattedSubtotal}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Taxa de Entrega</span>
                <span className={deliveryFeeCents === 0 ? "text-emerald-600 font-bold" : ""}>
                  {deliveryFeeCents === 0 ? "Grátis" : `R$ ${(deliveryFeeCents / 100).toFixed(2).replace(".", ",")}`}
                </span>
              </div>
              <div className="border-t border-border/40 pt-2 flex justify-between font-black text-base text-foreground">
                <span>Total a Pagar</span>
                <span>R$ {formattedTotal}</span>
              </div>
            </div>

            {/* Aviso Legal Obrigatório de Pesagem (Invariante Canônico) */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-2xs text-amber-900 dark:text-amber-200">
              <Info size={18} weight="bold" className="text-amber-600 shrink-0 mt-1" />
              <p>
                <strong>Importante:</strong> O valor total de sua compra poderá sofrer pequenas variações para mais ou para menos caso ocorra alguma alteração ou diferença de pesagem durante o processo de separação física na loja.
              </p>
            </div>
          </div>
        ) : null}

        {/* ── Footer Sticky com Total e Próxima Ação (Piso 44px) ── */}
        <div className="p-4 border-t border-border/40 bg-background/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col min-w-0">
            <span className="text-3xs text-muted-foreground font-semibold">Total</span>
            <span className="text-lg font-black text-foreground">
              R$ {formattedTotal}
            </span>
          </div>

          {checkoutStep === "cart" ? (
            <Button
              disabled={allItems.length === 0}
              onClick={() => setCheckoutStep("shipping")}
              className="h-11 min-h-11 px-6 rounded-xl font-bold gap-2 text-sm focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Continuar compra</span>
              <ArrowRight size={16} weight="bold" />
            </Button>
          ) : checkoutStep === "shipping" ? (
            <Button
              onClick={() => setCheckoutStep("payment")}
              className="h-11 min-h-11 px-6 rounded-xl font-bold gap-2 text-sm focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Escolher pagamento</span>
              <ArrowRight size={16} weight="bold" />
            </Button>
          ) : checkoutStep === "payment" ? (
            <Button
              onClick={() => setCheckoutStep("review")}
              className="h-11 min-h-11 px-6 rounded-xl font-bold gap-2 text-sm focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Revisar pedido</span>
              <ArrowRight size={16} weight="bold" />
            </Button>
          ) : (
            <Button
              onClick={handleFinishPurchase}
              className="h-11 min-h-11 px-8 rounded-xl font-black gap-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Check size={18} weight="bold" />
              <span>Concluir Compra</span>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
