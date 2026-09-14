import { createFileRoute, Link } from "@tanstack/react-router";
import { Ticket, Calendar, QrCode, MapPin, Layers, Clock, CheckCircle2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { listCustomerOrders } from "@/services/order.functions";

export const Route = createFileRoute("/_store/conta/ingressos")({
  head: () => ({ meta: [{ title: "Meus Ingressos & Eventos | Waesy" }] }),
  loader: async () => {
    try {
      const orders = (await listCustomerOrders().catch(() => [])) || [];
      // Filtra itens de ingresso ou eventos
      const ticketOrders = orders.filter((order: any) =>
        order.order_items?.some(
          (i: any) => i.item_type === "ticket" || i.item_type === "event" || i.product_title?.toLowerCase().includes("ingresso"),
        ),
      );
      return ticketOrders;
    } catch (err) {
      console.error("[loader:_store.conta.ingressos] Unhandled error:", err);
      return [];
    }
  },
  component: CustomerTicketsPage,
});

function CustomerTicketsPage() {
  const ticketOrders = (Route.useLoaderData() as any[]) || [];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Ingressos
          </h1>
          {ticketOrders && ticketOrders.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {ticketOrders.length}
            </Badge>
          )}
        </div>

        <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold h-8 px-3.5 cursor-pointer">
          <Link to="/agenda">Ver Agenda Cultural</Link>
        </Button>
      </div>

      {/* ── 2. Lista de Ingressos ou Empty State ── */}
      {ticketOrders.length === 0 ? (
        <div className="w-full rounded-2xl border border-border/60 bg-card p-4 sm:p-8 text-center space-y-4">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Ticket className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-foreground">Nenhum ingresso encontrado</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Você ainda não possui ingressos comprados para shows, festivais, palestras ou eventos culturais na plataforma.
            </p>
          </div>
          <div className="pt-2">
            <Button asChild className="rounded-xl text-xs font-bold h-9 px-5">
              <Link to="/agenda">Explorar Próximos Eventos</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ticketOrders.map((order: any) => {
            const ticketItem = order.order_items?.[0];
            return (
              <div
                key={order.id}
                className="rounded-2xl border border-border/60 bg-card p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Ticket className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {ticketItem?.product_title || "Ingresso Oficial"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Pedido #{order.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {formatDate(order.created_at)}
                  </Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <QrCode className="size-4 text-primary" />
                    <span>Acesso Digital Válido</span>
                  </div>
                  <span className="font-bold font-mono text-primary">
                    {formatMoney(order.total_cents)}
                  </span>
                </div>

                <Button asChild size="sm" className="w-full rounded-xl text-xs font-bold h-9">
                  <Link to="/conta/pedidos/$id" params={{ id: order.id }}>
                    Ver Comprovante & QR Code
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CustomerTicketsPage;
