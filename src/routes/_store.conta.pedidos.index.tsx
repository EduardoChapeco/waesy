import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, type ElementType } from "react";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeMobileHeader } from "@/components/navigation";
import { listCustomerOrders } from "@/services/order.functions";
import { formatDate } from "@/lib/datetime";
import {
  ShoppingBag,
  ChevronRight,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RotateCcw,
  MapPin,
  QrCode,
  CreditCard,
  Filter,
} from "lucide-react";

// ─── Tipos e Constantes ───────────────────────────────────────────────────────

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
> = {
  draft: "secondary",
  awaiting_payment: "warning",
  paid: "info",
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
  draft: "Rascunho",
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em separação",
  ready_for_pickup: "Pronto para retirada",
  shipped: "Enviado",
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
  head: () => ({ meta: [{ title: "Pedidos | Waesy" }] }),
  loader: async () => {
    try {
      return (await listCustomerOrders().catch(() => [])) || [];
    } catch {
      return [];
    }
  },
  component: CustomerOrdersPage,
} as any);

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

// ─── Componente de Card de Pedido (WhatsApp Row Style) ───────────────────────

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
      className="flex items-center gap-3.5 px-4 py-4 min-h-[72px] hover:bg-muted/40 active:bg-muted/60 transition-colors cursor-pointer group"
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
          className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-background ${
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
          <p className="text-[13px] font-bold text-foreground truncate leading-snug">
            {firstItem?.product_title || order.store_name || "Pedido"}
            {extraCount > 0 && (
              <span className="text-muted-foreground font-normal text-xs ml-1">
                +{extraCount} item{extraCount > 1 ? "s" : ""}
              </span>
            )}
          </p>
          <span className="text-[13px] font-bold text-foreground shrink-0 font-mono">
            {formatMoney(order.total_cents)}
          </span>
        </div>

        {/* Status e data */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant} className="text-[10px] font-semibold h-5 px-2 rounded-md">
              {statusLabel}
            </Badge>
            {isReadyPickup && (
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md animate-pulse">
                Retirar já!
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">
              {formatDate(order.created_at)}
            </span>
            <ChevronRight
              className="size-3.5 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
              strokeWidth={2}
            />
          </div>
        </div>

        {/* Linha extra: rastreio quando enviado */}
        {isShipped && order.tracking_code && (
          <p className="text-[10px] text-muted-foreground mt-1 font-mono flex items-center gap-1">
            <Truck className="size-3" strokeWidth={1.5} />
            Rastreio: {order.tracking_code}
          </p>
        )}
        {isShipped && !order.tracking_code && (
          <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 flex items-center gap-1">
            <Truck className="size-3" strokeWidth={1.5} />
            A caminho — toque para acompanhar
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

function CustomerOrdersPage() {
  const orders = (Route.useLoaderData() as any[]) || [];

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

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 px-0 sm:px-0 animate-in fade-in duration-200">
      {/* ── 1. Canonical Navigation Header ── */}
      <NativeMobileHeader
        title="Pedidos"
        fallbackHref="/conta"
        badge={
          orders.length > 0 ? (
            <Badge
              variant="secondary"
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
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
            className="rounded-xl text-xs font-semibold h-8.5 px-3 cursor-pointer"
          >
            <Link to="/mercado">Explorar Lojas</Link>
          </Button>
        }
      />

      {orders.length === 0 ? (
        /* ── Empty State Honesto ── */
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
          <ShoppingBag className="size-10 stroke-[1.5] text-muted-foreground/40 mb-1" />
          <div>
            <h2 className="text-base font-bold text-foreground">Nenhum pedido realizado</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              Suas compras em lojas e restaurantes parceiros aparecerão aqui com rastreamento em tempo real.
            </p>
          </div>
          <Button asChild className="rounded-xl h-10 px-6 text-xs font-bold mt-2">
            <Link to="/mercado">Explorar Lojas</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* ── 2. Busca ── */}
          <div className="px-4 sm:px-0 pt-3 pb-1">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
                strokeWidth={2}
              />
              <Input
                id="orders-search"
                type="text"
                placeholder="Buscar por produto, loja ou código de rastreio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8.5 h-10 text-xs rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
              />
            </div>
          </div>

          {/* ── 3. Chips de filtro com scroll horizontal ── */}
          <div className="overflow-x-auto scrollbar-none px-4 sm:px-0 py-2">
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
                    className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border/60 hover:border-border hover:text-foreground"
                    }`}
                  >
                    {chip.label}
                    {count > 0 && (
                      <span
                        className={`text-[10px] font-mono ${isActive ? "opacity-80" : "text-muted-foreground"}`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 4. Lista agrupada por mês ── */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-2">
              <Filter className="size-8 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-foreground">Nenhum pedido encontrado</p>
              <p className="text-xs text-muted-foreground">
                Tente outro filtro ou termo de busca.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-0 mt-1">
              {grouped.map((group) => (
                <section key={group.label} className="mb-2">
                  {/* Cabeçalho do mês */}
                  <div className="px-4 sm:px-0 py-2">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </p>
                  </div>

                  {/* Cards do mês — WhatsApp list style */}
                  <div className="bg-card border border-border/40 rounded-2xl overflow-hidden divide-y divide-border/20 mx-0">
                    {group.orders.map((order: any) => (
                      <OrderRow key={order.id} order={order} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CustomerOrdersPage;
