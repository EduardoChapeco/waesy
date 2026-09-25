import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  AlertTriangle,
  Loader2,
  Kanban,
  List,
  ArrowRight,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listQuotes, updateQuoteStatus, type QuoteSummaryDTO } from "@/services/quotes.functions";
import { formatMoney } from "@/lib/money";
import { formatRelativeTime } from "@/lib/datetime";
import { toast } from "sonner";

import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet } from "@/components/workspace/workspace-dashboard-sheet";

export const Route = createFileRoute("/workspace/orcamentos/")({
  head: () => ({ meta: [{ title: "Orçamentos | Workspace Waesy" }] }),
  loader: async () => {
    try {
    const res = await listQuotes({ data: { limit: 50 } }).catch(() => ({ items: [], total: 0 }));
    return { initialData: res };
    } catch (err) {
      console.error("[loader:workspace.orcamentos.index] Unhandled error:", err);
      return { initialData: null };
    }
  },
  component: QuotesListPage,
});

// ---- Status config ----
const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; color: string }
> = {
  draft: { label: "Rascunho", variant: "outline", icon: FileText, color: "border-border text-muted-foreground" },
  sent: { label: "Enviado", variant: "secondary", icon: Send, color: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10" },
  negotiating: { label: "Em Negociação", variant: "secondary", icon: Clock, color: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  approved: { label: "Aprovado", variant: "default", icon: CheckCircle2, color: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  rejected: { label: "Recusado", variant: "destructive", icon: XCircle, color: "border-destructive/30 text-destructive bg-destructive/10" },
  expired: { label: "Expirado", variant: "destructive", icon: AlertTriangle, color: "border-destructive/30 text-destructive bg-destructive/10" },
  converted: { label: "Convertido em Pedido", variant: "default", icon: CheckCircle2, color: "border-primary/30 text-primary bg-primary/10" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: "outline", icon: FileText, color: "" };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="gap-1.5 text-[10px] font-semibold rounded-lg px-2 py-0.5">
      <Icon className="size-3" />
      {cfg.label}
    </Badge>
  );
}

const KANBAN_COLUMNS = [
  { id: "draft", title: "Rascunhos & Leads", statuses: ["draft"] },
  { id: "sent", title: "Enviados", statuses: ["sent"] },
  { id: "negotiating", title: "Em Negociação", statuses: ["negotiating"] },
  { id: "won", title: "Ganhos / Fechados", statuses: ["approved", "converted"] },
];

function QuotesListPage() {
  const { initialData } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["quotes", statusFilter, search],
    queryFn: () =>
      listQuotes({ data: { status: statusFilter as any, search: search || undefined, limit: 50 } }),
    initialData: statusFilter === undefined && !search ? initialData : undefined,
    staleTime: 30_000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (vars: { quote_id: string; status: "sent" | "negotiating" | "rejected" }) =>
      updateQuoteStatus({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Estágio do orçamento atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar estágio do orçamento.");
    },
  });

  const quotes = data?.items ?? [];

  // Métricas
  const totalVolumeCents = useMemo(
    () => quotes.reduce((acc: number, q: QuoteSummaryDTO) => acc + (q.total_cents || 0), 0),
    [quotes]
  );
  const negotiatingCount = useMemo(
    () => quotes.filter((q: QuoteSummaryDTO) => q.status === "negotiating").length,
    [quotes]
  );
  const approvedCount = useMemo(
    () => quotes.filter((q: QuoteSummaryDTO) => q.status === "approved" || q.status === "converted").length,
    [quotes]
  );
  const sentCount = useMemo(
    () => quotes.filter((q: QuoteSummaryDTO) => q.status === "sent").length,
    [quotes]
  );
  const draftCount = useMemo(
    () => quotes.filter((q: QuoteSummaryDTO) => q.status === "draft").length,
    [quotes]
  );

  return (
    <div className="flex flex-col gap-4 min-h-[calc(100dvh-8.5rem)]">
      {/* ── 1. Barra Canônica de Operação Silenciosa ── */}
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: "kanban", label: "Kanban", icon: Kanban, count: quotes.length },
          { id: "list", label: "Lista", icon: List, count: quotes.length },
        ]}
        activeTab={viewMode}
        onTabChange={(id) => setViewMode(id as any)}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por código, cliente ou anotações..."
        filters={[
          {
            id: "status",
            label: "Status",
            value: statusFilter || "all",
            options: [
              { label: "Todos os Status", value: "all" },
              { label: "Rascunhos", value: "draft" },
              { label: "Enviados", value: "sent" },
              { label: "Em Negociação", value: "negotiating" },
              { label: "Aprovados", value: "approved" },
              { label: "Recusados", value: "rejected" },
            ],
            onChange: (val) => setStatusFilter(val === "all" ? undefined : val),
          },
        ]}
        onMetricsClick={() => setIsDashboardOpen(true)}
        metricsBadge={totalVolumeCents > 0 ? formatMoney(totalVolumeCents) : undefined}
        primaryAction={{
          label: "Novo Orçamento",
          icon: Plus,
          onClick: () => router.navigate({ to: "/workspace/orcamentos/novo" }),
        }}
      />

      {/* ── 2. Conteúdo Principal (Kanban ou Lista) ── */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-sm text-destructive">
          <XCircle className="size-5 shrink-0" />
          Erro ao carregar orçamentos. Tente novamente.
        </div>
      )}

      {!isLoading && !isError && quotes.length === 0 && (
        <div className="py-12 text-center space-y-4 border border-dashed border-border/70 rounded-2xl bg-card/40">
          <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
            <FileText className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Nenhum orçamento encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Crie propostas e orçamentos para enviar a clientes e negociar pedidos.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold h-9">
            <Link to="/workspace/orcamentos/novo">
              <Plus className="size-3.5 mr-1" />
              Criar Primeiro Orçamento
            </Link>
          </Button>
        </div>
      )}

      {!isLoading && !isError && quotes.length > 0 && viewMode === "list" && (
        <div className="divide-y divide-border/60 bg-card border border-border/70 rounded-2xl overflow-hidden shadow-2xs">
          {quotes.map((q: QuoteSummaryDTO) => (
            <QuoteRow key={q.id} quote={q} />
          ))}
        </div>
      )}

      {!isLoading && !isError && quotes.length > 0 && viewMode === "kanban" && (
        <div className="flex gap-4 items-stretch pb-2 overflow-x-auto no-scrollbar h-[calc(100dvh-10.5rem)] sm:h-[calc(100dvh-9.5rem)] select-none">
          {KANBAN_COLUMNS.map((col) => {
            const colQuotes = quotes.filter((q: QuoteSummaryDTO) => col.statuses.includes(q.status));
            const colTotalCents = colQuotes.reduce((acc: number, q: QuoteSummaryDTO) => acc + q.total_cents, 0);

            return (
              <div
                key={col.id}
                className="bg-card/60 border border-border/70 rounded-xl p-3.5 flex flex-col w-[310px] min-w-[310px] sm:w-[330px] sm:min-w-[330px] shrink-0 h-full shadow-2xs overflow-hidden"
              >
                {/* Header da Coluna */}
                <div className="flex items-center justify-between pb-2 border-b border-border/50 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{col.title}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4">
                      {colQuotes.length}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-muted-foreground">
                    {formatMoney(colTotalCents)}
                  </span>
                </div>

                {/* Cards com scroll interno */}
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pt-1">
                  {colQuotes.length === 0 ? (
                    <div className="h-28 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/50 rounded-xl">
                      Nenhum orçamento
                    </div>
                  ) : (
                    colQuotes.map((q: QuoteSummaryDTO) => (
                      <div
                        key={q.id}
                        className="bg-card border border-border/60 hover:border-border rounded-xl p-3 space-y-2 transition-shadow shadow-2xs group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to="/workspace/orcamentos/$id"
                            params={{ id: q.id }}
                            className="text-xs font-mono font-bold text-foreground hover:text-primary transition-colors"
                          >
                            {q.quote_number}
                          </Link>
                          <StatusBadge status={q.status} />
                        </div>

                        <p className="text-xs text-muted-foreground truncate">
                          {q.customer_name ?? q.customer_email ?? "Cliente não informado"}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                          <span className="font-bold text-foreground font-mono">
                            {formatMoney(q.total_cents)}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            {formatRelativeTime(q.updated_at)}
                          </span>
                        </div>

                        {/* Ações Rápidas de Estágio */}
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          {q.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={updateStatusMutation.isPending}
                              onClick={() => updateStatusMutation.mutate({ quote_id: q.id, status: "sent" })}
                              className="h-6 px-2 text-[10px] font-bold rounded-lg gap-1 text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <span>Enviar</span>
                              <ArrowRight className="size-2.5" />
                            </Button>
                          )}
                          {q.status === "sent" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={updateStatusMutation.isPending}
                              onClick={() => updateStatusMutation.mutate({ quote_id: q.id, status: "negotiating" })}
                              className="h-6 px-2 text-[10px] font-bold rounded-lg gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            >
                              <span>Negociar</span>
                              <ArrowRight className="size-2.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. Painel de Métricas / Dashboard Sob Demanda ── */}
      <WorkspaceDashboardSheet
        open={isDashboardOpen}
        onOpenChange={setIsDashboardOpen}
        title="Painel de Orçamentos & Pipeline"
        description="Indicadores de volume orçado, conversão em pedidos e estágios das propostas comerciais."
        metrics={[
          {
            id: "total_vol",
            label: "Volume Total Orçado",
            value: formatMoney(totalVolumeCents),
            icon: DollarSign,
            trend: { value: "Ativo", direction: "up" },
            description: "Somatório de todos os orçamentos em aberto",
          },
          {
            id: "total_quotes",
            label: "Total de Orçamentos",
            value: quotes.length,
            icon: FileText,
            description: "Contagem de orçamentos registrados",
          },
          {
            id: "negotiating",
            label: "Em Negociação",
            value: negotiatingCount,
            icon: Clock,
            description: "Propostas com contato e negociação ativos",
          },
          {
            id: "approved",
            label: "Aprovados / Ganhos",
            value: approvedCount,
            icon: CheckCircle2,
            trend: { value: "Fechados", direction: "up" },
            description: "Orçamentos aprovados ou convertidos em pedidos",
          },
          {
            id: "sent",
            label: "Aguardando Resposta",
            value: sentCount,
            icon: Send,
            description: "Enviados ao cliente aguardando análise",
          },
        ]}
        breakdown={{
          title: "Distribuição por Estágio",
          items: [
            {
              label: "Aprovados / Convertidos",
              value: approvedCount,
              total: Math.max(quotes.length, 1),
              color: "bg-emerald-500",
            },
            {
              label: "Em Negociação",
              value: negotiatingCount,
              total: Math.max(quotes.length, 1),
              color: "bg-amber-500",
            },
            {
              label: "Enviados",
              value: sentCount,
              total: Math.max(quotes.length, 1),
              color: "bg-sky-500",
            },
            {
              label: "Rascunhos",
              value: draftCount,
              total: Math.max(quotes.length, 1),
              color: "bg-slate-400",
            },
          ],
        }}
      />
    </div>
  );
}

function QuoteRow({ quote }: { quote: QuoteSummaryDTO }) {
  const isExpiring =
    quote.valid_until &&
    quote.status === "sent" &&
    new Date(quote.valid_until).getTime() - Date.now() < 48 * 60 * 60 * 1000;

  return (
    <Link
      to="/workspace/orcamentos/$id"
      params={{ id: quote.id }}
      className="flex items-center gap-4 px-4 py-3.5 bg-card hover:bg-muted/30 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold text-foreground">{quote.quote_number}</span>
          <StatusBadge status={quote.status} />
          {isExpiring && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <AlertTriangle className="size-3" />
              Vence em breve
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {quote.customer_name ?? quote.customer_email ?? "Cliente não identificado"}
          {" · "}
          {quote.item_count} {quote.item_count === 1 ? "item" : "itens"}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs font-bold text-foreground font-mono">{formatMoney(quote.total_cents)}</p>
        <p className="text-[10px] text-muted-foreground">{formatRelativeTime(quote.updated_at)}</p>
      </div>

      <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
    </Link>
  );
}
