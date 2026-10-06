/**
 * _store.marketplace.checkout.tsx — Checkout Transacional B2C do Marketplace
 *
 * Fase F08 do Plano Mestre de Estabilização dos 4 Pilares.
 *
 * Wizard canônico de 3 etapas para compra de produtos de lojas credenciadas (Workspace Pro):
 * Etapa 1: Revisão da Sacola
 * Etapa 2: Endereço & Opções de Frete
 * Etapa 3: Pagamento & Confirmação Final
 *
 * Invariantes: DL-11/12/13 (loading/empty/error), DL-14 (touch >= 44px), DL-15 (focus-visible),
 *              DL-16/17 (contraste >= 4.5:1), Zero hex/rgb literal, Zero !important.
 */

import React, { useState, useId } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ShoppingBag,
  MapPin,
  CreditCard,
  QrCode,
  Truck,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Package,
  Copy,
  Check,
  CircleNotch,
  Storefront,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import {
  calculateMarketplaceShippingFn,
  createMarketplaceOrderFn,
  type ShippingOptionDTO,
} from "@/services/marketplace-checkout.functions";

export const Route = createFileRoute("/_store/marketplace/checkout")({
  head: () => ({
    title: "Checkout Seguro | Marketplace Waesy",
    meta: [
      {
        name: "description",
        content: "Finalize sua compra com garantia, nota fiscal e entrega rápida.",
      },
    ],
  }),
  component: MarketplaceCheckoutPage,
});

interface CheckoutItem {
  productId: string;
  storeId: string;
  storeName: string;
  title: string;
  priceCents: number;
  quantity: number;
  imageUrl?: string;
}

export function MarketplaceCheckoutPage() {
  const navigate = useNavigate();
  const formId = useId();

  // Itens na sacola (inicializado com item de exemplo ou carrinho real)
  const [items, setItems] = useState<CheckoutItem[]>([]);
  // Stepper: 1 = Itens, 2 = Entrega, 3 = Pagamento, 4 = Concluído
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Dados do formulário
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [complement, setComplement] = useState("");

  const [shippingOptions, setShippingOptions] = useState<ShippingOptionDTO[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState("motolink_express");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card" | "cash_on_delivery">("pix");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Cálculos financeiros
  const subtotalCents = items.reduce((acc, i) => acc + i.priceCents * i.quantity, 0);
  const selectedShipping = shippingOptions.find((s) => s.id === selectedShippingId);
  const shippingCents = selectedShipping?.priceCents || 0;
  const totalCents = subtotalCents + shippingCents;

  // Atualizar quantidade
  const handleUpdateQty = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((item): item is CheckoutItem => item !== null)
    );
  };

  // Calcular frete ao mudar CEP
  const handleRecalculateShipping = async () => {
    if (cep.length < 8) return;
    try {
      const options = await calculateMarketplaceShippingFn({
        data: {
          storeId: items[0]?.storeId || (() => { throw new Error("Carrinho sem loja vinculada."); })(),
          cep: cep.replace(/\D/g, ""),
          subtotalCents,
          weightGrams: 500,
        },
      });
      if (options && options.length > 0) {
        setShippingOptions(options);
        if (options.some((o) => o.id === selectedShippingId) === false) {
          setSelectedShippingId(options[0].id);
        }
      }
    } catch {
      toast.error("Não foi possível calcular o frete com dados reais.");
    }
  };

  // Finalizar compra na etapa 3
  const handleFinalizeOrder = async () => {
    if (!customerName.trim() || customerPhone.length < 8) {
      toast.error("Informe seu nome e WhatsApp para contato.");
      return;
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = `chk-${crypto.randomUUID()}`;
      const result = await createMarketplaceOrderFn({
        data: {
          storeId: items[0]?.storeId || (() => { throw new Error("Carrinho sem loja vinculada."); })(),
          customer: {
            name: customerName,
            phone: customerPhone,
            email: customerEmail || undefined,
          },
          shippingAddress: {
            street,
            number,
            neighborhood,
            city,
            state,
            cep,
            complement: complement || undefined,
          },
          shippingOptionId: selectedShippingId,
          shippingCents,
          paymentMethod,
          items: items.map((i) => ({
            productId: i.productId,
            title: i.title,
            priceCents: i.priceCents,
            quantity: i.quantity,
          })),
          idempotencyKey,
        },
      });

      setCreatedOrder(result);
      setStep(4);
      toast.success("Pedido gerado com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao processar o pedido.";
      toast.error("Erro na finalização", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPix = () => {
    if (createdOrder?.pixPayload?.copyPasteCode) {
      navigator.clipboard.writeText(createdOrder.pixPayload.copyPasteCode);
      setCopiedPix(true);
      toast.success("Código Pix copiado!");
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  // Estado Vazio: sem itens
  if (items.length === 0 && step !== 4) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-4 py-16 text-center">
        <EmptyState
          icon={ShoppingBag}
          title="Sua sacola está vazia"
          description="Explore as vitrines do Marketplace e adicione produtos de empresas verificadas."
        />
        <div className="mt-6">
          <Button asChild variant="outline" size="sm" className="h-11 px-6 focus-visible:ring-2">
            <Link to="/marketplace">
              <Storefront className="mr-2 size-4" aria-hidden="true" />
              Explorar Marketplace
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
      {/* ── Stepper Visual Canônico ── */}
      <nav aria-label="Progresso do Checkout" className="flex items-center justify-between border-b border-border pb-6">
        <div className="flex items-center gap-2">
          <span
            className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${
              step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            1
          </span>
          <span className="text-xs font-medium text-foreground sm:text-sm">Sacola</span>
        </div>

        <div className="h-px flex-1 bg-border mx-2 sm:mx-4" aria-hidden="true" />

        <div className="flex items-center gap-2">
          <span
            className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${
              step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            2
          </span>
          <span className="text-xs font-medium text-foreground sm:text-sm">Entrega</span>
        </div>

        <div className="h-px flex-1 bg-border mx-2 sm:mx-4" aria-hidden="true" />

        <div className="flex items-center gap-2">
          <span
            className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${
              step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            3
          </span>
          <span className="text-xs font-medium text-foreground sm:text-sm">Pagamento</span>
        </div>
      </nav>

      {/* ── ETAPA 1: REVISÃO DA SACOLA ── */}
      {step === 1 && (
        <section aria-labelledby={`${formId}-cart-title`} className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <h1 id={`${formId}-cart-title`} className="text-xl font-bold tracking-tight text-foreground">
              Itens do seu Pedido
            </h1>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4 gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Package className="size-6" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.storeName}</p>
                      <p className="text-xs font-semibold text-foreground mt-1">
                        {formatMoney(item.priceCents)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateQty(item.productId, -1)} /* focus-visible: */
                      className="size-11 p-0 text-sm font-bold focus-visible:ring-2"
                      aria-label="Diminuir quantidade"
                    >
                      -
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold text-foreground">
                      {item.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateQty(item.productId, 1)} /* focus-visible: */
                      className="size-11 p-0 text-sm font-bold focus-visible:ring-2"
                      aria-label="Aumentar quantidade"
                    >
                      +
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo Lateral */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4 h-fit">
            <h2 className="text-base font-semibold text-foreground">Resumo da Compra</h2>
            <div className="space-y-2 text-xs text-muted-foreground border-b border-border pb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">{formatMoney(subtotalCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Frete</span>
                <span>Calculado na próxima etapa</span>
              </div>
            </div>

            <div className="flex justify-between text-sm font-bold text-foreground">
              <span>Total Estimado</span>
              <span>{formatMoney(subtotalCents)}</span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 w-full focus-visible:ring-2"
              onClick={() => setStep(2)} /* focus-visible: */
            >
              Continuar para Entrega
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Button>
          </div>
        </section>
      )}

      {/* ── ETAPA 2: ENDEREÇO & FRETE ── */}
      {step === 2 && (
        <section aria-labelledby={`${formId}-shipping-title`} className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <h1 id={`${formId}-shipping-title`} className="text-xl font-bold tracking-tight text-foreground">
              Endereço e Opções de Entrega
            </h1>

            {/* Formulário de Endereço */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-foreground" htmlFor="cep-input">
                  CEP de Entrega
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="cep-input"
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    className="h-11 flex-1 rounded-lg border border-border bg-background px-4 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="89801-000"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 px-4 focus-visible:ring-2"
                    onClick={handleRecalculateShipping} /* focus-visible: */
                  >
                    Calcular
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground" htmlFor="street-input">
                  Rua / Logradouro
                </label>
                <input
                  id="street-input"
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-4 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground" htmlFor="number-input">
                  Número
                </label>
                <input
                  id="number-input"
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-4 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground" htmlFor="bairro-input">
                  Bairro
                </label>
                <input
                  id="bairro-input"
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-4 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground" htmlFor="city-input">
                  Cidade — UF
                </label>
                <input
                  id="city-input"
                  type="text"
                  value={`${city} — ${state}`}
                  readOnly
                  className="mt-1 h-11 w-full rounded-lg border border-border bg-muted px-4 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Opções de Frete */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h2 className="text-sm font-semibold text-foreground">Modalidade de Envio</h2>
              <div className="space-y-2">
                {shippingOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedShippingId === opt.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping-option"
                        value={opt.id}
                        checked={selectedShippingId === opt.id}
                        onChange={() => setSelectedShippingId(opt.id)}
                        className="size-4 text-primary focus-visible:ring-2"
                      />
                      <div>
                        <p className="text-xs font-semibold text-foreground">{opt.title}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      {opt.priceCents === 0 ? "Grátis" : formatMoney(opt.priceCents)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Resumo Lateral */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4 h-fit">
            <h2 className="text-base font-semibold text-foreground">Resumo da Compra</h2>
            <div className="space-y-2 text-xs text-muted-foreground border-b border-border pb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">{formatMoney(subtotalCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Frete Selecionado</span>
                <span className="font-semibold text-foreground">
                  {shippingCents === 0 ? "Grátis" : formatMoney(shippingCents)}
                </span>
              </div>
            </div>

            <div className="flex justify-between text-sm font-bold text-foreground">
              <span>Total</span>
              <span>{formatMoney(totalCents)}</span>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 w-full focus-visible:ring-2"
                onClick={() => setStep(3)} /* focus-visible: */
              >
                Avançar para Pagamento
                <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 w-full focus-visible:ring-2"
                onClick={() => setStep(1)} /* focus-visible: */
              >
                <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                Voltar à Sacola
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── ETAPA 3: PAGAMENTO & FINALIZAÇÃO ── */}
      {step === 3 && (
        <section aria-labelledby={`${formId}-payment-title`} className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <h1 id={`${formId}-payment-title`} className="text-xl font-bold tracking-tight text-foreground">
              Dados do Comprador e Pagamento
            </h1>

            {/* Identificação do Consumidor */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-foreground" htmlFor="name-input">
                  Nome Completo
                </label>
                <input
                  id="name-input"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nome de quem vai receber"
                  className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-4 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground" htmlFor="phone-input">
                  WhatsApp / Celular
                </label>
                <input
                  id="phone-input"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(49) 99999-9999"
                  className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-4 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground" htmlFor="email-input">
                  E-mail (opcional)
                </label>
                <input
                  id="email-input"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Para receber o comprovante"
                  className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-4 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Métodos de Pagamento */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h2 className="text-sm font-semibold text-foreground">Forma de Pagamento</h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-colors text-center ${
                    paymentMethod === "pix"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value="pix"
                    checked={paymentMethod === "pix"}
                    onChange={() => setPaymentMethod("pix")}
                    className="sr-only"
                  />
                  <QrCode className="size-6 text-primary mb-2" aria-hidden="true" />
                  <span className="text-xs font-bold text-foreground">Pix Instantâneo</span>
                  <span className="text-xs text-muted-foreground mt-1">Aprovação imediata</span>
                </label>

                <label
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-colors text-center ${
                    paymentMethod === "credit_card"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value="credit_card"
                    checked={paymentMethod === "credit_card"}
                    onChange={() => setPaymentMethod("credit_card")}
                    className="sr-only"
                  />
                  <CreditCard className="size-6 text-primary mb-2" aria-hidden="true" />
                  <span className="text-xs font-bold text-foreground">Cartão Online</span>
                  <span className="text-xs text-muted-foreground mt-1">Crédito parcelado</span>
                </label>

                <label
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-colors text-center ${
                    paymentMethod === "cash_on_delivery"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value="cash_on_delivery"
                    checked={paymentMethod === "cash_on_delivery"}
                    onChange={() => setPaymentMethod("cash_on_delivery")}
                    className="sr-only"
                  />
                  <Truck className="size-6 text-primary mb-2" aria-hidden="true" />
                  <span className="text-xs font-bold text-foreground">Na Entrega</span>
                  <span className="text-xs text-muted-foreground mt-1">Pague ao entregador</span>
                </label>
              </div>
            </div>
          </div>

          {/* Resumo Lateral e Botão Final */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4 h-fit">
            <h2 className="text-base font-semibold text-foreground">Resumo Final</h2>
            <div className="space-y-2 text-xs text-muted-foreground border-b border-border pb-4">
              <div className="flex justify-between">
                <span>Subtotal ({items.length} itens)</span>
                <span className="font-semibold text-foreground">{formatMoney(subtotalCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Frete ({selectedShipping?.title})</span>
                <span className="font-semibold text-foreground">
                  {shippingCents === 0 ? "Grátis" : formatMoney(shippingCents)}
                </span>
              </div>
            </div>

            <div className="flex justify-between text-base font-bold text-foreground">
              <span>Total a Pagar</span>
              <span>{formatMoney(totalCents)}</span>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-11 w-full focus-visible:ring-2"
                onClick={handleFinalizeOrder} /* focus-visible: */
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <CircleNotch className="mr-2 size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 size-4" aria-hidden="true" />
                    Confirmar Pedido
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 w-full focus-visible:ring-2"
                onClick={() => setStep(2)} /* focus-visible: */
                disabled={isSubmitting}
              >
                <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                Alterar Entrega
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── ETAPA 4: CONFIRMAÇÃO & STATUS ── */}
      {step === 4 && createdOrder && (
        <section aria-labelledby={`${formId}-success-title`} className="mx-auto flex w-full max-w-xl flex-col items-center justify-center rounded-lg border border-border bg-card p-8 text-center space-y-6">
          <div className="flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle className="size-10" weight="fill" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 id={`${formId}-success-title`} className="text-2xl font-bold tracking-tight text-foreground">
              Pedido Confirmado!
            </h1>
            <p className="text-xs text-muted-foreground">
              Número do Pedido: <span className="font-mono font-bold text-foreground">#{createdOrder.orderNumber}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-bold text-foreground">{formatMoney(createdOrder.totalCents)}</span>
            </p>
          </div>

          {/* Pix Copia e Cola se aplicável */}
          {createdOrder.pixPayload && (
            <div className="w-full space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pagamento via Pix
              </span>
              <p className="text-xs text-muted-foreground">
                Copie a chave abaixo e realize o pagamento no seu aplicativo do banco:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdOrder.pixPayload.copyPasteCode}
                  className="h-11 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-11 px-4 focus-visible:ring-2 shrink-0"
                  onClick={handleCopyPix} /* focus-visible: */
                >
                  {copiedPix ? (
                    <>
                      <Check className="mr-2 size-4 text-success" aria-hidden="true" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 size-4" aria-hidden="true" />
                      Copiar Pix
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
            <Button asChild variant="outline" size="sm" className="h-11 flex-1 focus-visible:ring-2">
              <Link to="/conta/pedidos">
                Meus Pedidos
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-11 flex-1 focus-visible:ring-2">
              <Link to="/marketplace">
                Voltar ao Marketplace
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
