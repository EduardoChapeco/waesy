import { createFileRoute, Link } from "@tanstack/react-router";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listCustomerOrders } from "@/services/order.functions";
import { formatDate } from "@/lib/datetime";
import { ShoppingBag, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_store/conta/pedidos/")(({
  head: () => ({ meta: [{ title: "Pedidos | Waesy" }] }),
  loader: async () => {
    try {
      return (await listCustomerOrders().catch(() => [])) || [];
    } catch {
      return [];
    }
  },
  component: Page,
} as any));

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  awaiting_payment: "bg-warning/10 text-warning",
  paid: "bg-info/10 text-info",
  processing: "bg-info/10 text-info",
  ready_for_pickup: "bg-primary/10 text-primary",
  shipped: "bg-primary/10 text-primary",
  delivered: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  return_requested: "bg-warning/10 text-warning",
  returned: "bg-muted text-muted-foreground",
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

function Page() {
  const orders = Route.useLoaderData() as any[];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-24 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-3 pt-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Pedidos
          </h1>
          {orders.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {orders.length}
            </Badge>
          )}
        </div>

        <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold h-9 px-3.5 cursor-pointer hover:bg-muted">
          <Link to="/mercado">Explorar Lojas</Link>
        </Button>
      </div>

      {/* ── Lista ── */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-16 px-4 text-center gap-3">
          <div className="size-16 rounded-3xl bg-muted/60 flex items-center justify-center mb-1 text-muted-foreground">
            <ShoppingBag className="size-8 stroke-[1.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Nenhum pedido realizado</h2>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs mx-auto">
              Suas compras em lojas e restaurantes parceiros aparecerão aqui com rastreamento em tempo real.
            </p>
          </div>
          <Button asChild size="sm" className="rounded-2xl h-11 px-6 text-sm font-bold mt-3 shadow-xs">
            <Link to="/mercado">Explorar Lojas</Link>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {orders.map((order: any) => {
            const statusLabel = STATUS_LABELS[order.status] || order.status;
            const statusStyle = STATUS_STYLE[order.status] || "bg-muted text-muted-foreground";
            const firstItem = order.order_items?.[0];
            const extraCount = (order.order_items?.length || 1) - 1;

            return (
              <Link
                key={order.id}
                to="/conta/pedidos/$id"
                params={{ id: order.id }}
                className="flex items-center gap-3.5 px-4 py-4 hover:bg-muted/40 active:bg-muted/60 transition-colors cursor-pointer group"
                id={`order-item-${order.id}`}
              >
                {/* Imagem do produto ou placeholder */}
                <div className="size-14 rounded-xl bg-muted border border-border/40 overflow-hidden shrink-0 flex items-center justify-center">
                  {firstItem?.image_url ? (
                    <img src={firstItem.image_url} alt={firstItem.product_title} className="size-full object-cover" />
                  ) : (
                    <ShoppingBag className="size-5 text-muted-foreground/40" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-bold text-foreground truncate leading-snug">
                      {firstItem?.product_title || order.store_name || "Pedido"}
                      {extraCount > 0 && (
                        <span className="text-muted-foreground font-normal"> +{extraCount} item{extraCount > 1 ? "s" : ""}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusStyle}`}>
                        {statusLabel}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono hidden xs:block">
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm font-bold text-foreground">
                        {formatMoney(order.total_cents)}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-all group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Page;
