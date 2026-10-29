import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useEffect, type ElementType } from "react";
import { formatMoney } from "@/lib/money";
import { formatHumanOrderId } from "@/lib/order-id";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeMobileHeader } from "@/components/navigation";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import { listCustomerOrders } from "@/services/order.functions";
import { subscribeToTableChanges } from "@/services/realtime-channel";
import { formatDate } from "@/lib/datetime";
import { useCartContext } from "@/lib/cart-context";
import { cn } from "@/lib/utils";
import {
  ShoppingBag,
  ShoppingCart,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RotateCcw,
  MapPin,
  CreditCard,
  Filter,
  ArrowRight,
  Store,
  Plus,
  Minus,
  Trash2,
  Calendar,
} from "lucide-react";

// ─── Tipos e Constantes ───────────────────────────────────────────────────────

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
> = {
  draft: "warning",
  awaiting_payment: "warning",
  paid: "success",
  processing: "info",
  ready_for_pickup: "default",
  shipped: "default",
  delivered: "success",
  completed: "success",
  cancelled: "destructive",
  return_requested: "warning",
  returned: "secondary",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Aguardando confirmação",
  awaiting_payment: "Aguardando confirmação",
  paid: "Confirmado",
  processing: "Em preparação",
  ready_for_pickup: "Pronto para retirada",
  shipped: "A caminho",
  delivered: "Entregue",
  completed: "Concluído",
  cancelled: "Cancelado",
  return_requested: "Devolução solicitada",
  returned: "Devolvido",
};

const STATUS_ICONS: Record<string, ElementType> = {
  draft: Clock,
  awaiting_payment: CreditCard,
  paid: CheckCircle2,
  processing: Package,
  ready_for_pickup: MapPin,
  shipped: Truck,
  delivered: CheckCircle2,
  completed: CheckCircle2,
  cancelled: XCircle,
  return_requested: AlertCircle,
  returned: RotateCcw,
};

const FILTER_CHIPS = [
  { id: "todos", label: "Todos" },
  { id: "active", label: "Ativos", statuses: ["awaiting_payment", "paid", "processing", "shipped"] },
  { id: "ready_for_pickup", label: "Retirada", statuses: ["ready_for_pickup"] },
  { id: "completed", label: "Concluídos", statuses: ["delivered", "completed"] },
  { id: "cancelled", label: "Cancelados", statuses: ["cancelled", "returned"] },
];

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_store/conta/pedidos/")({
  head: () => ({ meta: [{ title: "Compras | Waesy" }] }),
  loader: async () => {
    try {
      return (await listCustomerOrders().catch(() => [])) || [];
    } catch {
      return [];
    }
  },
  errorComponent: CustomerOrdersErrorComponent,
  component: CustomerOrdersPage,
} as any);

function CustomerOrdersErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
      <div className="inline-flex size-16 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-2">
        <AlertCircle className="size-8" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Instabilidade ao carregar pedidos</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {error?.message || "Não foi possível carregar seu histórico de pedidos no momento."}
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button onClick={reset} className="rounded-lg font-bold">
          Tentar Novamente
        </Button>
        <Button asChild variant="outline" className="rounded-lg font-bold">
          <Link to="/conta">Voltar para Conta</Link>
        </Button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupOrdersByMonth(orders: any[]): { label: string; orders: any[] }[] {
  const groups: Record<string, any[]> = {};
  orders.forEach((order) => {
    const date = new Date(order.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(order);
  });

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, orders]) => {
      const [year, month] = key.split("-");
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
      return { label: label.charAt(0).toUpperCase() + label.slice(1), orders };
    });
}

// ─── Componente de Card de Pedido (WhatsApp Row Style - Mobile) ─────────────

function OrderRow({ order }: { order: any }) {
  const StatusIcon = STATUS_ICONS[order.status] || ShoppingBag;
  const statusLabel = STATUS_LABELS[order.status] || order.status;
  const statusVariant = STATUS_VARIANTS[order.status] || "secondary";
  const firstItem = order.order_items?.[0];
  const extraCount = (order.order_items?.length || 1) - 1;
  const isShipped = ["shipped", "delivered", "completed"].includes(order.status);
  const isReadyPickup = order.status === "ready_for_pickup";

  return (
    <Link
      to="/conta/pedidos/$id"
      params={{ id: order.id }}
      className="flex items-center gap-4 px-4 py-4 min-h-18 hover:bg-muted/40 active:bg-muted/60 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      id={`order-row-${order.id}`}
    >
      {/* Thumbnail ou ícone de status */}
      <div className="size-12 rounded-xl border border-border/50 overflow-hidden shrink-0 flex items-center justify-center bg-muted/30 relative">
        {firstItem?.image_url ? (
          <img
            src={firstItem.image_url}
            alt={firstItem.product_title}
            className="size-full object-cover"
          />
        ) : (
          <StatusIcon className="size-5 text-muted-foreground/50" strokeWidth={1.5} />
        )}
        {/* Bolinha de status sobreposta */}
        <span
          className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-background ${
            ["delivered", "completed"].includes(order.status)
              ? "bg-emerald-500"
              : ["cancelled", "returned"].includes(order.status)
              ? "bg-destructive"
              : ["shipped"].includes(order.status)
              ? "bg-sky-500"
              : ["awaiting_payment"].includes(order.status)
              ? "bg-amber-400"
              : "bg-muted-foreground/40"
          }`}
        />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        {/* Título e total */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-bold text-foreground break-words text-wrap leading-tight">
              {firstItem?.product_title || order.store_name || "Pedido"}
              {extraCount > 0 && (
                <span className="text-muted-foreground font-normal text-xs ml-1">
                  +{extraCount} item{extraCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              {order.order_number || formatHumanOrderId(order.custom_fields?.short_id || order.public_token)}
            </span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-foreground shrink-0 font-mono">
            {formatMoney(order.total_cents)}
          </span>
        </div>

        {/* Status e data */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant} className="text-xs font-semibold h-5 px-2 rounded-md">
              {statusLabel}
            </Badge>
            {isReadyPickup && (
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md animate-pulse motion-reduce:animate-none">
                Retirar já
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatDate(order.created_at)}
            </span>
            <ChevronRight
              className="size-4 text-muted-foreground/60 group-hover:text-foreground transition-transform duration-200"
              strokeWidth={2}
            />
          </div>
        </div>

        {/* Linha extra: rastreio quando enviado */}
        {isShipped && order.tracking_code && (
          <p className="text-xs text-muted-foreground mt-1 font-mono flex items-center gap-1">
            <Truck className="size-3" strokeWidth={1.5} />
            Rastreio: {order.tracking_code}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Componente de Card de Pedido (Desktop System App Card) ───────────────────

function DesktopOrderCard({ order }: { order: any }) {
  const StatusIcon = STATUS_ICONS[order.status] || ShoppingBag;
  const statusLabel = STATUS_LABELS[order.status] || order.status;
  const statusVariant = STATUS_VARIANTS[order.status] || "secondary";
  const items = order.order_items || [];
  const isShipped = ["shipped", "delivered", "completed"].includes(order.status);
  const isReadyPickup = order.status === "ready_for_pickup";
  const orderCode = order.order_number || formatHumanOrderId(order.custom_fields?.short_id || order.public_token);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 shadow-xs hover:border-primary/40 transition-colors">
      {/* Top row: store, date, order code, status */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center shrink-0">
            <Store className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground break-words text-wrap leading-tight">
              {order.store_name || "Loja Parceira Waesy"}
            </p>
            <p className="text-xs text-muted-foreground">
              Realizado em {formatDate(order.created_at)} • <span className="font-mono font-semibold">{orderCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isReadyPickup && (
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md animate-pulse motion-reduce:animate-none">
              Pronto para Retirar
            </span>
          )}
          <Badge variant={statusVariant} className="text-xs font-semibold px-3 py-1 rounded-lg">
            <StatusIcon className="size-4 mr-1" />
            {statusLabel}
          </Badge>
        </div>
      </div>

      {/* Middle row: items previews */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
          {items.slice(0, 3).map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 bg-muted/20 rounded-lg p-2 max-w-xs">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.product_title}
                  className="size-10 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="size-10 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  <Package className="size-4 text-muted-foreground" />
                </div>
              )}
              <div className="text-xs min-w-0 flex-1">
                <p className="font-semibold text-foreground break-words text-wrap leading-tight">
                  {item.product_title}
                </p>
                <p className="text-muted-foreground text-xs font-mono mt-1">
                  {item.qty || 1}x {formatMoney(item.unit_price_cents || 0)}
                </p>
              </div>
            </div>
          ))}
          {items.length > 3 && (
            <span className="text-xs text-muted-foreground font-semibold px-2 py-1 rounded-md bg-muted/30">
              +{items.length - 3} item(s) adicional(is)
            </span>
          )}
        </div>

        {/* Right side: total and action button */}
        <div className="flex items-center gap-4 shrink-0 text-right">
          <div>
            <span className="text-xs text-muted-foreground block">Valor Total</span>
            <span className="text-lg font-bold font-mono text-foreground">
              {formatMoney(order.total_cents)}
            </span>
          </div>

          <Button
            asChild
            variant="default"
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to="/conta/pedidos/$id" params={{ id: order.id }}>
              <span>Ver Detalhes</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Rastreamento se enviado */}
      {isShipped && order.tracking_code && (
        <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span className="flex items-center gap-2">
            <Truck className="size-4 text-primary" /> Código de Rastreio: <strong className="text-foreground">{order.tracking_code}</strong>
          </span>
          <span className="text-xs text-muted-foreground">Acompanhe pelo detalhe do pedido</span>
        </div>
      )}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

function CustomerOrdersPage() {
  const initialOrders = (Route.useLoaderData() as any[]) || [];
  const router = useRouter();
  const { isCompact } = useWindowSizeClass();
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const {
    cart,
    globalCarts,
    updateQty,
    removeItem,
    setIsCartOpen,
    isCartUpdating,
  } = useCartContext();

  const [hubMode, setHubMode] = useState<"pedidos" | "carrinhos" | "agendamentos">("pedidos");
  const [expandedCarts, setExpandedCarts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Consolida carrinhos ativos de todas as lojas
  const activeStoreCarts = useMemo(() => {
    const list = [...(globalCarts || [])].filter((c) => (c.itemCount || 0) > 0);
    if (cart && (cart.itemCount || 0) > 0 && !list.some((c) => c.id === cart.id)) {
      list.unshift(cart);
    }
    return list;
  }, [globalCarts, cart]);

  // Filtra agendamentos (serviços, reservas de turismo ou pedidos com data programada)
  const scheduledOrders = useMemo(() => {
    return orders.filter(
      (o: any) =>
        o.shipping_method === "scheduled" ||
        Boolean(o.custom_fields?.scheduled_at) ||
        Boolean(o.custom_fields?.booking_date) ||
        o.order_type === "service" ||
        o.order_type === "booking",
    );
  }, [orders]);

  const toggleCartExpanded = (cartId: string) => {
    setExpandedCarts((prev) => ({
      ...prev,
      [cartId]: prev[cartId] === undefined ? false : !prev[cartId],
    }));
  };

  // Realtime subscription + adaptive polling for live order updates (DEC-276)
  useEffect(() => {
    const unsub = subscribeToTableChanges({
      channelName: "customer-orders-live",
      table: "orders",
      onPayload: () => {
        router.invalidate();
      },
    });

    const hasActiveOrders = orders.some((o: any) =>
      ["awaiting_payment", "paid", "processing", "shipped", "ready_for_pickup"].includes(o.status),
    );

    let intervalId: any = null;
    if (hasActiveOrders) {
      intervalId = setInterval(() => {
        router.invalidate();
      }, 10000);
    }

    return () => {
      unsub();
      if (intervalId) clearInterval(intervalId);
    };
  }, [orders, router]);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("todos");

  // Filtro por status
  const filterChip = FILTER_CHIPS.find((f) => f.id === activeFilter);
  const statusFiltered = useMemo(() => {
    if (!filterChip || filterChip.id === "todos") return orders;
    return orders.filter((o: any) => filterChip.statuses?.includes(o.status));
  }, [orders, filterChip]);

  // Filtro por busca
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return statusFiltered;
    return statusFiltered.filter(
      (o: any) =>
        o.id?.toLowerCase().includes(term) ||
        o.store_name?.toLowerCase().includes(term) ||
        o.order_items?.some((i: any) =>
          i.product_title?.toLowerCase().includes(term)
        ) ||
        o.tracking_code?.toLowerCase().includes(term)
    );
  }, [statusFiltered, searchTerm]);

  // Agrupamento por mês
  const grouped = useMemo(() => groupOrdersByMonth(filtered), [filtered]);

  // Contadores para chips
  const counts = useMemo(() => {
    return FILTER_CHIPS.reduce(
      (acc, chip) => {
        if (chip.id === "todos") {
          acc[chip.id] = orders.length;
        } else {
          acc[chip.id] = orders.filter((o: any) => chip.statuses?.includes(o.status)).length;
        }
        return acc;
      },
      {} as Record<string, number>
    );
  }, [orders]);

  // KPIs de cabeçalho desktop
  const activeOrdersCount = useMemo(() => {
    return orders.filter((o: any) =>
      ["awaiting_payment", "paid", "processing", "shipped"].includes(o.status)
    ).length;
  }, [orders]);

  const pickupOrdersCount = useMemo(() => {
    return orders.filter((o: any) => o.status === "ready_for_pickup").length;
  }, [orders]);

  const completedOrdersCount = useMemo(() => {
    return orders.filter((o: any) => ["delivered", "completed"].includes(o.status)).length;
  }, [orders]);

  return (
    <div
      className={
        isCompact
          ? "w-full max-w-2xl mx-auto pb-24 px-0 animate-in fade-in duration-200"
          : "w-full max-w-5xl mx-auto pb-24 px-4 sm:px-6 space-y-6 animate-in fade-in duration-200"
      }
    >
      {/* ── 1. Canonical Navigation Header (Mobile App Style) ── */}
      {isCompact && (
        <NativeMobileHeader
          title="Compras"
          fallbackHref="/conta"
          badge={
            orders.length > 0 ? (
              <Badge
                variant="secondary"
                className="text-xs font-mono font-bold px-2 py-1 rounded-md"
              >
                {orders.length}
              </Badge>
            ) : null
          }
          rightActions={
            <Button
              asChild
              size="sm"
              variant="outline"
              className="rounded-lg text-xs font-semibold h-11 px-4 cursor-pointer"
            >
              <Link to="/mercado">Explorar</Link>
            </Button>
          }
        />
      )}

      {/* ── 1.1 Desktop Inpage Header (Desktop System App Style) ── */}
      {!isCompact && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Compras
              </h1>
              {orders.length > 0 && (
                <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-1 rounded-full">
                  {orders.length}
                </Badge>
              )}
            </div>
            <Button
              asChild
              variant="outline"
              className="rounded-lg text-xs font-semibold h-11 px-4 cursor-pointer"
            >
              <Link to="/mercado">Explorar</Link>
            </Button>
          </div>

          {/* KPI Dashboard Cards (Apple HIG Squircles) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Pedidos
              </span>
              <div className="text-xl font-bold text-foreground">
                {orders.length}
              </div>
              <div className="text-xs text-muted-foreground">Histórico acumulado</div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Ativos
              </span>
              <div className="text-xl font-bold text-sky-600 dark:text-sky-400">
                {activeOrdersCount}
              </div>
              <div className="text-xs text-muted-foreground">Preparação ou trânsito</div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Carrinhos
              </span>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {activeStoreCarts.length}
              </div>
              <div className="text-xs text-muted-foreground">Abertos por loja</div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Concluídos
              </span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {completedOrdersCount}
              </div>
              <div className="text-xs text-muted-foreground">Entregues com sucesso</div>
            </div>
          </div>
        </div>
      )}

      {/* ── SELETOR DE MODO DO HUB DE COMPRAS: Pedidos | Carrinhos | Agendamentos ── */}
      <div className={isCompact ? "px-3 pt-3" : ""}>
        <div
          role="tablist"
          aria-label="Seções de Compras"
          className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/50"
        >
          {(
            [
              { id: "pedidos", label: "Pedidos", count: orders.length },
              { id: "carrinhos", label: "Carrinhos", count: activeStoreCarts.length },
              { id: "agendamentos", label: "Agendamentos", count: scheduledOrders.length },
            ] as const
          ).map((tab) => {
            const active = hubMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setHubMode(tab.id)}
                className={cn(
                  "h-11 min-h-11 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  active
                    ? "bg-background text-foreground shadow-2xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="truncate">{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "px-2 py-0 rounded-full text-2xs font-mono",
                      active
                        ? "bg-primary/15 text-primary font-bold"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MODO 2: CARRINHOS MULTI-LOJA COLAPSÁVEIS ── */}
      {hubMode === "carrinhos" && (
        <div className={isCompact ? "px-3 pt-3 space-y-3" : "space-y-4"}>
          {activeStoreCarts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <ShoppingCart className="size-10 text-muted-foreground/40 mb-1" strokeWidth={1.5} />
              <div>
                <h2 className="text-base font-bold text-foreground">Nenhum carrinho aberto</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                  Adicione produtos ou serviços de diferentes lojas para gerenciar e finalizar cada sacola.
                </p>
              </div>
              <Link
                to="/mercado"
                className="h-11 min-h-11 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Explorar
              </Link>
            </div>
          ) : (
            activeStoreCarts.map((storeCart) => {
              const isExpanded = expandedCarts[storeCart.id] !== false;
              const storeName = storeCart.storeName || "Loja Parceira";
              const storeLogo = storeCart.storeLogoUrl || null;
              const storeSlug = (storeCart as any).storeSlug || storeCart.storeId || "";
              const shippingDisplay =
                storeCart.shippingCents > 0
                  ? `Entrega: ${formatMoney(storeCart.shippingCents)}`
                  : "Entrega calculada no checkout";

              return (
                <div
                  key={storeCart.id}
                  className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-2xs"
                >
                  {/* Cabeçalho Resumo do Carrinho da Loja */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-11 min-h-11 min-w-11 rounded-full bg-muted border border-border/50 overflow-hidden flex items-center justify-center shrink-0">
                          {storeLogo ? (
                            <img
                              src={storeLogo}
                              alt={storeName}
                              className="size-full object-cover"
                            />
                          ) : (
                            <Store className="size-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-foreground truncate">
                            {storeName}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {storeCart.itemCount} {storeCart.itemCount === 1 ? "item" : "itens"} · {shippingDisplay}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-2xs text-muted-foreground block">Subtotal</span>
                        <span className="text-sm sm:text-base font-black font-mono text-foreground">
                          {formatMoney(storeCart.subtotalCents)}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Ações do Carrinho: Perfil da Loja | Expandir | Finalizar */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Link
                          to={storeSlug ? ("/loja/$slug" as any) : ("/mercado" as any)}
                          params={storeSlug ? ({ slug: storeSlug } as any) : undefined}
                          className="h-11 min-h-11 px-3 rounded-xl border border-border/60 bg-background hover:bg-muted/50 text-xs font-semibold text-foreground inline-flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Store className="size-4 text-muted-foreground" />
                          <span>Perfil da Loja</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => toggleCartExpanded(storeCart.id)}
                          aria-expanded={isExpanded}
                          className="h-11 min-h-11 px-3 rounded-xl border border-border/60 bg-background hover:bg-muted/50 text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span>{isExpanded ? "Recolher" : "Expandir"}</span>
                          {isExpanded ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </button>
                      </div>

                      <Link
                        to="/checkout"
                        className="h-11 min-h-11 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span>Finalizar</span>
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Lista Colapsável de Itens com Steppers +/-, Editar e Remover */}
                  {isExpanded && storeCart.items && storeCart.items.length > 0 && (
                    <div className="border-t border-border/40 divide-y divide-border/30 bg-muted/10 px-4">
                      {storeCart.items.map((item) => (
                        <div
                          key={item.id || item.variantId}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="size-12 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                              {item.coverUrl ? (
                                <img
                                  src={item.coverUrl}
                                  alt={item.productTitle}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <Package className="size-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                                {item.productTitle}
                              </p>
                              <p className="text-xs font-mono text-muted-foreground">
                                {formatMoney(item.priceCents)} cada · Total {formatMoney(item.lineTotalCents)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={isCartUpdating}
                              onClick={() => updateQty(item.variantId, -1, item.id)}
                              aria-label="Diminuir quantidade"
                              className="size-11 min-h-11 min-w-11 rounded-lg border border-border/50 bg-background hover:bg-muted/60 flex items-center justify-center text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <Minus className="size-4" />
                            </button>
                            <span className="w-8 text-center text-xs font-mono font-bold text-foreground">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              disabled={isCartUpdating}
                              onClick={() => updateQty(item.variantId, 1, item.id)}
                              aria-label="Aumentar quantidade"
                              className="size-11 min-h-11 min-w-11 rounded-lg border border-border/50 bg-background hover:bg-muted/60 flex items-center justify-center text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <Plus className="size-4" />
                            </button>
                            <button
                              type="button"
                              disabled={isCartUpdating}
                              onClick={() => setIsCartOpen(true)}
                              aria-label="Editar opções do item"
                              className="h-11 min-h-11 px-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={isCartUpdating}
                              onClick={() => removeItem(item.id)}
                              aria-label="Remover item"
                              className="size-11 min-h-11 min-w-11 rounded-lg text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── MODO 3: AGENDAMENTOS (Reservas de Serviços, Turismo e Entregas Programadas) ── */}
      {hubMode === "agendamentos" && (
        <div className={isCompact ? "px-3 pt-3 space-y-3" : "space-y-4"}>
          {scheduledOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <Calendar className="size-10 text-muted-foreground/40 mb-1" strokeWidth={1.5} />
              <div>
                <h2 className="text-base font-bold text-foreground">Nenhum agendamento ativo</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                  Suas reservas de serviços, roteiros de turismo e entregas com horário marcado aparecerão aqui.
                </p>
              </div>
              <Link
                to="/classificados"
                className="h-11 min-h-11 px-6 rounded-xl border border-border/60 bg-background hover:bg-muted/50 text-xs font-bold text-foreground inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Explorar
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledOrders.map((order: any) =>
                isCompact ? (
                  <div
                    key={order.id}
                    className="w-full bg-card border border-border/50 rounded-xl overflow-hidden shadow-2xs"
                  >
                    <OrderRow order={order} />
                  </div>
                ) : (
                  <DesktopOrderCard key={order.id} order={order} />
                ),
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MODO 1: PEDIDOS ── */}
      {hubMode === "pedidos" && (orders.length === 0 ? (
        /* ── Empty State Honesto ── */
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
          <ShoppingBag className="size-10 text-muted-foreground/40 mb-1" strokeWidth={1.5} />
          <div>
            <h2 className="text-base font-bold text-foreground">Nenhum pedido realizado</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              Suas compras em lojas e restaurantes parceiros aparecerão aqui com rastreamento em tempo real.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-lg h-11 px-6 text-xs font-bold mt-2">
            <Link to="/mercado">Explorar</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* ── 2. Busca e Filtros ── */}
          <div className={isCompact ? "px-2 pt-3 pb-1 space-y-2" : "space-y-3"}>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                strokeWidth={2}
              />
              <Input
                id="orders-search"
                type="text"
                placeholder="Buscar por produto, loja ou código de rastreio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-11 text-xs rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
              />
            </div>

            {/* Chips de filtro */}
            <div className="overflow-x-auto no-scrollbar py-1">
              <div className="flex items-center gap-2 min-w-max">
                {FILTER_CHIPS.map((chip) => {
                  const count = counts[chip.id] || 0;
                  const isActive = activeFilter === chip.id;
                  if (count === 0 && chip.id !== "todos") return null;
                  return (
                    <button
                      key={chip.id}
                      id={`filter-chip-${chip.id}`}
                      type="button"
                      onClick={() => setActiveFilter(chip.id)}
                      className={`flex items-center gap-2 h-11 min-h-11 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-200 border cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                          : "bg-background text-muted-foreground border-border/60 hover:border-border hover:text-foreground"
                      }`}
                    >
                      {chip.label}
                      {count > 0 && (
                        <span
                          className={`text-xs font-mono px-2 py-1 rounded-full ${
                            isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── 3. Lista de Pedidos ── */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-2">
              <Filter className="size-8 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-foreground">Nenhum pedido encontrado</p>
              <p className="text-xs text-muted-foreground">
                Tente outro filtro ou termo de busca.
              </p>
            </div>
          ) : isCompact ? (
            /* VISÃO MOBILE (< 600px): Linha agrupada por mês estilo WhatsApp */
            <div className="flex flex-col gap-0 mt-1">
              {grouped.map((group) => (
                <section key={group.label} className="mb-2">
                  <div className="px-4 py-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </p>
                  </div>

                  <div className="w-full bg-card border-y border-border/40 overflow-hidden divide-y divide-border/30 shadow-2xs">
                    {group.orders.map((order: any) => (
                      <OrderRow key={order.id} order={order} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            /* VISÃO DESKTOP (>= 840px): Cards ricos de sistema desktop (Anti-Jank / Anti-Sanfona) */
            <div className="space-y-4">
              {filtered.map((order: any) => (
                <DesktopOrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </>
      ))}
    </div>
  );
}

