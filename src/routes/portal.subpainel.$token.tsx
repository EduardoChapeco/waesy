import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEventSubpanelByToken } from "@/services/events.functions";
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
      const subpanel = await getEventSubpanelByToken({ data: { token: params.token } });
      return { subpanel };
    } catch (err: any) {
      console.error("[portal.subpainel] Falha ao carregar subpainel:", err);
      return { subpanel: null, error: err?.message || "Subpainel inválido ou expirado." };
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
  const { subpanel, error } = Route.useLoaderData() as any;

  const [cart, setCart] = useState<Array<{ product: QuickProduct; qty: number }>>([]);
  const [selectedPayment, setSelectedPayment] = useState<"pix" | "card" | "cash">("pix");
  const [sessionTotalCents, setSessionTotalCents] = useState<number>(0);
  const [sessionOrdersCount, setSessionOrdersCount] = useState<number>(0);
  const [lastOrderCompleted, setLastOrderCompleted] = useState<any | null>(null);

  if (!subpanel || error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-lg border border-border/70 bg-card text-center space-y-4 shadow-sm">
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
  const quickProducts = DEFAULT_QUICK_PRODUCTS[panelType] || DEFAULT_QUICK_PRODUCTS.bar;

  const cartTotalCents = cart.reduce((acc, item) => acc + item.product.priceCents * item.qty, 0);

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

    const orderId = `SUB-${Math.floor(1000 + Math.random() * 9000)}`;
    setSessionTotalCents((prev) => prev + cartTotalCents);
    setSessionOrdersCount((prev) => prev + 1);
    setLastOrderCompleted({
      id: orderId,
      totalCents: cartTotalCents,
      itemsCount: cart.reduce((acc, i) => acc + i.qty, 0),
      paymentMethod: selectedPayment,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    });

    toast.success(`Pedido #${orderId} registrado com sucesso (${formatMoney(cartTotalCents)})!`);
    setCart([]);
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
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col justify-between">
      {/* ── 1. TopBar do Operador (Isolada, Sem Navegação Global) ── */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border/60 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {getPanelIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-foreground truncate">
                  {subpanel.name}
                </h1>
                <Badge variant="outline" className="text-[10px] px-2 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-500/10 shrink-0">
                  Online
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {subpanel.event?.title || "Evento Oficial"} • {subpanel.manager_name ? `Operador: ${subpanel.manager_name}` : "Terminal Autorizado"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-muted-foreground uppercase font-mono block">Faturamento Turno</span>
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
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Catálogo de Produtos
            </h2>
            <span className="text-[11px] text-muted-foreground">Toque para adicionar</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickProducts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAddToCart(item)}
                className="p-4 rounded-lg bg-card border border-border/60 hover:border-primary/50 active:scale-98 transition-all text-left flex flex-col justify-between min-h-[96px] shadow-xs cursor-pointer"
              >
                <span className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                  {item.name}
                </span>
                <span className="text-xs font-bold font-mono text-primary mt-2">
                  {formatMoney(item.priceCents)}
                </span>
              </button>
            ))}
          </div>

          {/* Resumo do Turno Mobile */}
          <div className="sm:hidden p-3 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Turno Atual:</span>
            <span className="font-bold font-mono text-foreground">
              {sessionOrdersCount} pedidos • {formatMoney(sessionTotalCents)}
            </span>
          </div>
        </div>

        {/* Comanda / Carrinho de Venda */}
        <div className="lg:col-span-5 bg-card border border-border/70 rounded-lg p-5 space-y-4 shadow-sm flex flex-col justify-between sticky top-20">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Comanda Atual</h3>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-[11px] text-destructive hover:underline cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
                <ShoppingBag className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                <p>Nenhum item selecionado</p>
                <p className="text-[11px] text-muted-foreground/60">Selecione produtos ao lado</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40 max-h-60 overflow-y-auto pr-1">
                {cart.map((entry) => (
                  <div key={entry.product.id} className="py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {entry.product.name}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground">
                        {formatMoney(entry.product.priceCents)} un.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(entry.product.id, -1)}
                        className="size-7 rounded-lg bg-muted text-foreground flex items-center justify-center hover:bg-muted/80 cursor-pointer"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="text-xs font-bold font-mono w-4 text-center">
                        {entry.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(entry.product.id, 1)}
                        className="size-7 rounded-lg bg-muted text-foreground flex items-center justify-center hover:bg-muted/80 cursor-pointer"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-3 border-t border-border/50">
            {/* Método de Pagamento */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground block">
                Forma de Pagamento
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "pix", label: "PIX", icon: QrCode },
                  { id: "card", label: "Cartão", icon: CreditCard },
                  { id: "cash", label: "Dinheiro", icon: Banknote },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = selectedPayment === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedPayment(m.id as any)}
                      className={`h-9 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        active
                          ? "bg-foreground text-background border-foreground font-bold"
                          : "bg-background text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      <span>{m.label}</span>
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
                disabled={cart.length === 0}
                className="w-full h-12 rounded-lg font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="size-4 mr-2" />
                <span>Confirmar Pagamento</span>
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* ── 3. Footer Silencioso ── */}
      <footer className="border-t border-border/40 py-3 px-4 text-center text-[11px] text-muted-foreground">
        Terminal Operacional Seguro • Waesy Enterprise Events Engine
      </footer>
    </div>
  );
}
