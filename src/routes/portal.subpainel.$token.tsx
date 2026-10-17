import { createFileRoute } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import {
  Beer,
  Utensils,
  ShoppingBag,
  Ticket,
  ShieldCheck,
  Calendar,
  MapPin,
  Clock,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Receipt,
  User,
  History,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  getEventSubpanelByToken,
  listSubpanelProducts,
  listSubpanelOrders,
  createSubpanelOrder,
} from "@/services/events.functions";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/portal/subpainel/$token")({
  head: ({ loaderData }: any) => ({
    meta: [
      {
        title: loaderData?.subpanel
          ? `${loaderData.subpanel.name} | Terminal de Operação`
          : "Terminal de Operação | Waesy",
      },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const [subpanel, products, orders] = await Promise.all([
        getEventSubpanelByToken({ data: { token: params.token } }),
        listSubpanelProducts({ data: { token: params.token } }).catch(() => []),
        listSubpanelOrders({ data: { token: params.token } }).catch(() => []),
      ]);
      return { subpanel, products: products || [], initialOrders: orders || [] };
    } catch (err: any) {
      console.error("[portal.subpainel] Falha ao carregar subpainel:", err);
      return {
        subpanel: null,
        products: [],
        initialOrders: [],
        error: err?.message || "Subpainel inválido ou expirado.",
      };
    }
  },
  component: EventSubpanelPortalPage,
});

interface QuickProduct {
  id: string;
  name: string;
  priceCents: number;
}

const DEFAULT_QUICK_PRODUCTS: Record<string, QuickProduct[]> = {
  bar: [
    { id: "b1", name: "Chopp Pilsen 500ml", priceCents: 1800 },
    { id: "b2", name: "Chopp IPA 500ml", priceCents: 2200 },
    { id: "b3", name: "Água Mineral 500ml", priceCents: 600 },
    { id: "b4", name: "Refrigerante Lata", priceCents: 800 },
    { id: "b5", name: "Energético Lata", priceCents: 1600 },
    { id: "b6", name: "Dose de Destilado", priceCents: 2500 },
  ],
  foodtruck: [
    { id: "f1", name: "Burger Artesanal", priceCents: 3500 },
    { id: "f2", name: "Batata Frita Especial", priceCents: 2200 },
    { id: "f3", name: "Pastel Gourmet", priceCents: 1600 },
    { id: "f4", name: "Água / Refrigerante", priceCents: 800 },
  ],
  merchandise: [
    { id: "m1", name: "Camiseta Oficial do Evento", priceCents: 8900 },
    { id: "m2", name: "Copo Colecionável", priceCents: 1500 },
    { id: "m3", name: "Boné Personalizado", priceCents: 5900 },
    { id: "m4", name: "Tirante / Cordão", priceCents: 1200 },
  ],
  ticketing_box: [
    { id: "t1", name: "Ingresso Portaria (Inteira)", priceCents: 12000 },
    { id: "t2", name: "Ingresso Portaria (Meia)", priceCents: 6000 },
    { id: "t3", name: "Acesso Área VIP", priceCents: 18000 },
  ],
};

function EventSubpanelPortalPage() {
  const { subpanel, products: dbProducts, initialOrders, error } = Route.useLoaderData() as any;
  const { token } = Route.useParams();

  const [cart, setCart] = useState<Array<{ product: QuickProduct; qty: number }>>([]);
  const [selectedPayment, setSelectedPayment] = useState<"pix" | "credit_card" | "debit_card" | "cash">("pix");
  const [customerName, setCustomerName] = useState("");
  const [orders, setOrders] = useState<any[]>(initialOrders || []);
  const [lastOrderCompleted, setLastOrderCompleted] = useState<any | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const [showHistory, setShowHistory] = useState(false);

  // Calculadora de Buffet a Quilo / Valor Avulso
  const [customLabel, setCustomLabel] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [pricePerKgReais, setPricePerKgReais] = useState("69.90");
  const [customValueReais, setCustomValueReais] = useState("");

  if (!subpanel || error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-lg border border-border/70 bg-card text-center space-y-4">
          <div className="size-14 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="size-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-foreground">Acesso Não Autorizado</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {error || "O link deste terminal é inválido, foi revogado ou atingiu a data limite de expiração."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const panelType = subpanel.panel_type || "bar";
  const templateTipo = subpanel.template_tipo || "bar_simples";
  const allowCustomPrice = Boolean(subpanel.allow_custom_price || templateTipo === "buffet_kg");

  // Catálogo dinâmico: usa produtos do banco se cadastrados, ou os defaults canônicos
  const quickProducts: QuickProduct[] =
    dbProducts && dbProducts.length > 0
      ? dbProducts.map((p: any) => ({
          id: p.id,
          name: p.nome || p.name,
          priceCents: p.price_cents,
        }))
      : DEFAULT_QUICK_PRODUCTS[panelType] || DEFAULT_QUICK_PRODUCTS.bar;

  const cartTotalCents = cart.reduce((acc, item) => acc + item.product.priceCents * item.qty, 0);

  // Faturamento real do turno persistido
  const sessionTotalCents = orders.reduce((acc, o) => acc + (o.total_cents || 0), 0);
  const sessionOrdersCount = orders.length;

  const handleAddToCart = (product: QuickProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const handleAddWeighedOrCustomItem = () => {
    let computedCents = 0;
    let finalName = customLabel.trim() || (templateTipo === "buffet_kg" ? "Buffet Livre / Peso" : "Item Avulso Balcão");

    if (templateTipo === "buffet_kg" && Number(weightGrams) > 0 && Number(pricePerKgReais) > 0) {
      const kg = Number(weightGrams) / 1000;
      computedCents = Math.round(kg * Number(pricePerKgReais) * 100);
      finalName = `${finalName} (${weightGrams}g)`;
    } else if (Number(customValueReais) > 0) {
      computedCents = Math.round(Number(customValueReais) * 100);
    }

    if (computedCents <= 0) {
      toast.error("Informe um peso ou valor válido em R$.");
      return;
    }

    const customProduct: QuickProduct = {
      id: `custom_${Date.now()}`,
      name: finalName,
      priceCents: computedCents,
    };

    handleAddToCart(customProduct);
    setCustomLabel("");
    setWeightGrams("");
    setCustomValueReais("");
    toast.success(`${finalName} adicionado à comanda!`);
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product.id === productId) {
            const newQty = i.qty + delta;
            return newQty > 0 ? { ...i, qty: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as any,
    );
  };

  const handleClearCart = () => setCart([]);

  const handleFinalizeSale = () => {
    if (cart.length === 0) {
      toast.error("Adicione ao menos um item ao pedido.");
      return;
    }

    startTransition(async () => {
      try {
        const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        const payloadItems = cart.map((i) => ({
          productId: isUuid(i.product.id) ? i.product.id : undefined,
          productName: i.product.name,
          quantity: i.qty,
          unitPriceCents: i.product.priceCents,
        }));

        const res = await createSubpanelOrder({
          data: {
            token,
            orderType: "counter_pos",
            paymentMethod: selectedPayment,
            customerName: customerName.trim() || undefined,
            items: payloadItems,
          },
        });

        const createdOrder = res.order;
        setOrders((prev) => [createdOrder, ...prev]);
        setLastOrderCompleted({
          id: createdOrder.order_number,
          totalCents: createdOrder.total_cents,
          itemsCount: cart.reduce((acc, i) => acc + i.qty, 0),
          paymentMethod: selectedPayment,
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        });

        toast.success(`Pedido #${createdOrder.order_number} registrado e sincronizado no faturamento do evento!`);
        setCart([]);
        setCustomerName("");
      } catch (err: any) {
        toast.error("Erro ao registrar pedido: " + (err?.message || "Tente novamente"));
      }
    });
  };

  const getPanelIcon = () => {
    switch (panelType) {
      case "foodtruck":
      case "restaurant":
        return <Utensils className="size-5" />;
      case "merchandise":
        return <ShoppingBag className="size-5" />;
      case "ticketing_box":
        return <Ticket className="size-5" />;
      default:
        return <Beer className="size-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* ── 1. TopBar do Operador (Isolada, Sem Navegação Global) ── */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border/60 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-11 min-h-11 min-w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {getPanelIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-bold text-foreground break-words">
                  {subpanel.name}
                </h1>
                <Badge variant="outline" className="text-xs px-2 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-500/10 shrink-0">
                  Online
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground break-words">
                {subpanel.event?.title || "Evento Oficial"} • {subpanel.manager_name ? `Operador: ${subpanel.manager_name}` : "Terminal Autorizado"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="h-11 min-h-11 px-3 rounded-lg gap-2 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <History className="size-4" />
              <span className="hidden sm:inline">Histórico</span>
            </Button>

            <div className="text-right hidden sm:block">
              <span className="text-xs text-muted-foreground uppercase font-mono block">Faturamento Turno</span>
              <span className="text-xs font-bold font-mono text-emerald-600">
                {formatMoney(sessionTotalCents)} ({sessionOrdersCount} ped.)
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── 2. Área Central de Operação (Terminal POS) ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Catálogo de Itens Rápidos */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Catálogo de Produtos
            </h2>
            <span className="text-xs text-muted-foreground">Toque para adicionar à comanda</span>
          </div>

          {/* Seletor Rápido de Mesas / Comandas (quando template_tipo === 'bar_comanda') */}
          {templateTipo === "bar_comanda" && (
            <div className="p-3 rounded-lg border border-border/60 bg-card space-y-2">
              <span className="text-xs font-bold text-foreground block">Seleção Rápida de Mesa / Camarote</span>
              <div className="tab-list flex flex-nowrap overflow-x-auto no-scrollbar gap-2 pb-1">
                {["Mesa 01", "Mesa 02", "Mesa 03", "Mesa 04", "Mesa 05", "Mesa 06", "Camarote 01", "Camarote 02"].map((mesa) => (
                  <button
                    key={mesa}
                    type="button"
                    onClick={() => setCustomerName(mesa)}
                    className={`h-11 min-h-11 px-3 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${
                      customerName === mesa
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-foreground border-border/60 hover:bg-muted"
                    }`}
                  >
                    {mesa}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Calculadora de Pesagem (Buffet Kg) ou Valor Avulso */}
          {allowCustomPrice && (
            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {templateTipo === "buffet_kg" ? "Balança & Pesagem de Prato (Buffet a Quilo)" : "Lançamento de Valor Avulso"}
                </span>
                <Badge variant="outline" className="text-xs font-mono border-amber-500/40 text-amber-600">
                  {templateTipo === "buffet_kg" ? "Kg / Gramas" : "Valor Livre"}
                </Badge>
              </div>

              {templateTipo === "buffet_kg" ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(e.target.value)}
                    type="number"
                    min="1"
                    placeholder="Peso em gramas (ex: 450)"
                    className="h-11 min-h-11 rounded-lg text-xs bg-background"
                  />
                  <Input
                    value={pricePerKgReais}
                    onChange={(e) => setPricePerKgReais(e.target.value)}
                    type="number"
                    step="0.1"
                    placeholder="Preço do Kg (R$)"
                    className="h-11 min-h-11 rounded-lg text-xs bg-background"
                  />
                  <Button
                    type="button"
                    onClick={handleAddWeighedOrCustomItem}
                    className="h-11 min-h-11 rounded-lg text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Lançar Prato
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Descrição (ex: Combo Especial)"
                    className="h-11 min-h-11 rounded-lg text-xs bg-background"
                  />
                  <Input
                    value={customValueReais}
                    onChange={(e) => setCustomValueReais(e.target.value)}
                    type="number"
                    step="0.5"
                    placeholder="Valor (R$)"
                    className="h-11 min-h-11 rounded-lg text-xs bg-background"
                  />
                  <Button
                    type="button"
                    onClick={handleAddWeighedOrCustomItem}
                    className="h-11 min-h-11 rounded-lg text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Adicionar Valor
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickProducts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAddToCart(item)}
                className="p-4 rounded-lg bg-card border border-border/60 hover:border-primary/50 active:scale-95 transition-transform text-left flex flex-col justify-between min-h-28 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="text-xs font-semibold text-foreground leading-tight break-words text-wrap">
                  {item.name}
                </span>
                <span className="text-xs font-bold font-mono text-primary mt-2">
                  {formatMoney(item.priceCents)}
                </span>
              </button>
            ))}
          </div>

          {/* Histórico Recente de Pedidos Expandido */}
          {showHistory && (
            <div className="mt-4 p-4 rounded-lg border border-border/60 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Últimos Pedidos do Turno ({orders.length})
                </h3>
              </div>
              {orders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Nenhum pedido registrado neste turno.</p>
              ) : (
                <div className="divide-y divide-border/40 max-h-48 overflow-y-auto pr-1">
                  {orders.slice(0, 10).map((ord) => (
                    <div key={ord.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-foreground">{ord.order_number}</span>
                        <span className="text-muted-foreground ml-2">
                          {new Date(ord.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {ord.customer_name && (
                          <span className="text-muted-foreground block text-xs">Cliente: {ord.customer_name}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-600 block">
                          {formatMoney(ord.total_cents)}
                        </span>
                        <span className="text-xs text-muted-foreground uppercase">{ord.payment_method}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Resumo do Turno Mobile */}
          <div className="sm:hidden p-3 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Turno Atual:</span>
            <span className="font-bold font-mono text-foreground">
              {sessionOrdersCount} pedidos • {formatMoney(sessionTotalCents)}
            </span>
          </div>
        </div>

        {/* Comanda / Carrinho de Venda */}
        <div className="lg:col-span-5 bg-card border border-border/70 rounded-lg p-5 space-y-4 flex flex-col justify-between sticky top-20">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Comanda do Cliente</h3>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-xs text-destructive hover:underline cursor-pointer focus-visible:ring-2 focus-visible:ring-destructive"
                >
                  Limpar
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground space-y-1">
                <ShoppingBag className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                <p>Nenhum item selecionado</p>
                <p className="text-xs text-muted-foreground/60">Selecione produtos no catálogo ao lado</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40 max-h-56 overflow-y-auto pr-1">
                {cart.map((entry) => (
                  <div key={entry.product.id} className="py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground break-words leading-tight">
                        {entry.product.name}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {formatMoney(entry.product.priceCents)} un.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(entry.product.id, -1)}
                        className="size-11 min-h-11 min-w-11 rounded-lg bg-muted text-foreground flex items-center justify-center hover:bg-muted/80 active:scale-95 transition-transform cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`Diminuir quantidade de ${entry.product.name}`}
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="text-xs font-bold font-mono w-5 text-center">
                        {entry.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(entry.product.id, 1)}
                        className="size-11 min-h-11 min-w-11 rounded-lg bg-muted text-foreground flex items-center justify-center hover:bg-muted/80 active:scale-95 transition-transform cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`Aumentar quantidade de ${entry.product.name}`}
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-3 border-t border-border/50">
            {/* Nome Opcional do Cliente */}
            <div className="space-y-2">
              <label htmlFor="customerName" className="text-xs font-semibold text-muted-foreground block">
                Nome, Mesa ou Comanda (Opcional)
              </label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: João Silva ou Mesa 04"
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>

            {/* Método de Pagamento */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground block">
                Forma de Pagamento
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "pix", label: "PIX", icon: QrCode },
                  { id: "credit_card", label: "Crédito", icon: CreditCard },
                  { id: "debit_card", label: "Débito", icon: CreditCard },
                  { id: "cash", label: "Dinheiro", icon: Banknote },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = selectedPayment === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedPayment(m.id as any)}
                      className={`h-11 min-h-11 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${
                        active
                          ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                          : "bg-background text-muted-foreground border-border/70 hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                      <span className="text-xs leading-none">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Totalizador & Botão de Baixa */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Total a Pagar</span>
                <span className="text-lg font-black font-mono text-foreground">
                  {formatMoney(cartTotalCents)}
                </span>
              </div>

              <Button
                onClick={handleFinalizeSale}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full h-11 min-h-11 rounded-lg font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                <CheckCircle2 className="size-4 mr-2" />
                <span>{isSubmitting ? "Registrando Pedido..." : "Finalizar e Registrar Venda"}</span>
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* ── 3. Footer Silencioso ── */}
      <footer className="border-t border-border/40 py-3 px-4 text-center text-xs text-muted-foreground">
        Terminal Operacional Seguro • Waesy Enterprise Events Engine
      </footer>
    </div>
  );
}
