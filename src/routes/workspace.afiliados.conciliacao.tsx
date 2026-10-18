import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  DollarSign,
  TrendingDown,
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import {
  listMerchantAffiliateInvoices,
} from "@/services/affiliate-ledger.functions";

export const Route = createFileRoute("/workspace/afiliados/conciliacao")({
  head: () => ({
    meta: [
      {
        title: "Conciliação e Faturas de Afiliados | Waesy Workspace",
      },
    ],
  }),
  component: MerchantAffiliateReconciliationPage,
});

function MerchantAffiliateReconciliationPage() {
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: invoices = [], isLoading, isError, error } = useQuery({
    queryKey: ["merchant-affiliate-invoices"],
    queryFn: () => listMerchantAffiliateInvoices(),
    staleTime: 15_000,
  });

  const filteredInvoices = invoices.filter((inv: any) => {
    if (filterStatus === "all") return true;
    return inv.status === filterStatus;
  });

  const totalOwedCents = invoices
    .filter((inv: any) => ["open_accumulating", "closed_pending_payment"].includes(inv.status))
    .reduce((acc: number, inv: any) => acc + Number(inv.total_valid_commission_cents || 0), 0);

  const totalCancelledCents = invoices.reduce(
    (acc: number, inv: any) => acc + Number(inv.total_cancelled_commission_cents || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 pb-24">
      {/* ── 1. Top Bar / Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Conciliação de Afiliados
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Acompanhe o faturamento mensal de comissões, vendas rastreadas e estornos automáticos (Padrão Méliuz).
          </p>
        </div>
        <Button asChild variant="outline" className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-primary">
          <Link to="/workspace/pedidos/entregadores">
            <ArrowRight className="size-4" />
            <span>Voltar ao Workspace</span>
          </Link>
        </Button>
      </div>

      {/* ── 2. Cards de Métricas Financeiras ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Comissões Acumuladas no Mês</span>
            <DollarSign className="size-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatMoney(totalOwedCents)}
          </p>
          <p className="text-xs text-muted-foreground">Faturas abertas ou a liquidar</p>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Estornos e Cancelamentos (Méliuz)</span>
            <TrendingDown className="size-4 text-destructive" />
          </div>
          <p className="text-2xl font-bold text-destructive">
            {formatMoney(totalCancelledCents)}
          </p>
          <p className="text-xs text-muted-foreground">Abatidos das faturas</p>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Política de Maturação</span>
            <Clock className="size-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-bold text-foreground mt-1">7 a 15 Dias</p>
          <p className="text-xs text-muted-foreground">Após entrega do pedido</p>
        </div>
      </div>

      {/* ── 3. Filtros e Lista de Faturas Mensais ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar tab-list pb-1">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground ml-1" />
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`h-11 min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                filterStatus === "all"
                  ? "bg-foreground text-background"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas as Faturas
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("open_accumulating")}
              className={`h-11 min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                filterStatus === "open_accumulating"
                  ? "bg-foreground text-background"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              Em Aberto (Acumulando)
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("closed_pending_payment")}
              className={`h-11 min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                filterStatus === "closed_pending_payment"
                  ? "bg-foreground text-background"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              Aguardando Liquidação
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("reconciled_paid")}
              className={`h-11 min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                filterStatus === "reconciled_paid"
                  ? "bg-foreground text-background"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              Conciliadas
            </button>
          </div>
        </div>

        {isError && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            Não foi possível carregar as faturas mensais de afiliados no momento.
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Carregando faturas mensais de afiliados...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center rounded-lg border border-dashed border-border/60 space-y-3">
            <FileText className="size-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">
              Nenhuma fatura encontrada
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              As faturas mensais são geradas conforme as vendas originadas por links de afiliados ocorrem no checkout.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((inv: any) => (
              <div
                key={inv.id}
                className="p-4 rounded-lg bg-card border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground font-mono">
                      Competência: {inv.reference_month}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-xs"
                    >
                      {inv.status === "open_accumulating" && "Em Aberto"}
                      {inv.status === "closed_pending_payment" && "Aguardando Pagamento"}
                      {inv.status === "reconciled_paid" && "Liquidada"}
                      {inv.status === "overdue" && "Vencida"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>
                      Vendas Rastradas:{" "}
                      <strong className="text-foreground">
                        {formatMoney(Number(inv.total_tracked_sales_cents) || 0)}
                      </strong>
                    </span>
                    {Number(inv.total_cancelled_commission_cents) > 0 && (
                      <span className="text-destructive">
                        Estornos:{" "}
                        <strong>
                          -{formatMoney(Number(inv.total_cancelled_commission_cents) || 0)}
                        </strong>
                      </span>
                    )}
                    {inv.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        Vencimento: {formatDate(inv.due_date)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right sm:self-center shrink-0">
                  <span className="text-xs text-muted-foreground block">
                    Comissão Líquida Devida
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {formatMoney(Number(inv.total_valid_commission_cents) || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Nota de Governança Méliuz ── */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border/40 text-xs text-muted-foreground space-y-1 flex items-start gap-3">
        <AlertCircle className="size-4 text-primary shrink-0 mt-1" />
        <div>
          <strong className="text-foreground font-semibold block">
            Proteção Contra Vendas Canceladas (Clawback Méliuz)
          </strong>
          Se um pedido de afiliado for cancelado, estornado ou devolvido pelo cliente durante o período de garantia (7 a 15 dias), o valor da comissão é imediatamente cancelado e abatido da fatura da sua loja com registro auditável.
        </div>
      </div>
    </div>
  );
}
