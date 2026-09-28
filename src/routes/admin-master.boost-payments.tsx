import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { toast } from "sonner";
import { Flame, CheckCircle2, Clock, XCircle, Loader2, RefreshCw, ExternalLink, Search, CheckCheck, AlertCircle } from "lucide-react";
import { listBoostPayments, confirmBoostPaymentAdmin } from "@/services/classifieds.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin-master/boost-payments")({
  head: () => ({ meta: [{ title: "Boost Payments | Admin Master · Waesy" }] }),
  loader: async () => {
    try {
      const payments = await listBoostPayments({ data: { status: "all", limit: 100 } });
      return { payments: payments || [] };
    } catch (err) {
      console.error("[admin-master.boost-payments] loader error:", err);
      return { payments: [] };
    }
  },
  errorComponent: ({ error }) => (
    <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm">
      <strong>Erro ao carregar:</strong>{" "}
      {error instanceof Error ? error.message : "Erro desconhecido."}
    </div>
  ),
  component: BoostPaymentsAdmin,
});

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; className: string }
> = {
  pending: {
    label: "Aguardando",
    icon: <Clock className="size-3.5" />,
    className: "text-amber-600 bg-amber-500/10 border-amber-500/25",
  },
  paid: {
    label: "Pago · Ativo",
    icon: <CheckCircle2 className="size-3.5" />,
    className: "text-emerald-600 bg-emerald-500/10 border-emerald-500/25",
  },
  failed: {
    label: "Falhou",
    icon: <XCircle className="size-3.5" />,
    className: "text-destructive bg-destructive/10 border-destructive/25",
  },
  refunded: {
    label: "Estornado",
    icon: <RefreshCw className="size-3.5" />,
    className: "text-muted-foreground bg-muted/30 border-border/50",
  },
  expired: {
    label: "Expirado",
    icon: <AlertCircle className="size-3.5" />,
    className: "text-muted-foreground bg-muted/30 border-border/50",
  },
};

function BoostPaymentsAdmin() {
  const { payments } = ((Route.useLoaderData?.() as any) || {});
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [confirmingPayment, setConfirmingPayment] = useState<any | null>(null);

  const { data: boostPayments, isLoading, refetch } = useQuery({
    queryKey: ["admin-boost-payments"],
    queryFn: () => listBoostPayments({ data: { status: "all", limit: 100 } }),
    initialData: payments,
    staleTime: 30_000,
  });

  const confirmMutation = useMutation({
    mutationFn: async (boostPaymentId: string) => {
      return await confirmBoostPaymentAdmin({
        data: { boostPaymentId, method: "admin_manual" },
      });
    },
    onSuccess: (res) => {
      toast.success(`Boost ativado! Anúncio em destaque até ${new Date((res as any).boostedUntil || Date.now()).toLocaleDateString("pt-BR")}.`);
      setConfirmingPayment(null);
      queryClient.invalidateQueries({ queryKey: ["admin-boost-payments"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao confirmar pagamento.");
    },
  });

  const filtered = (boostPayments || []).filter((bp: any) => {
    const matchesSearch =
      !search ||
      bp.classifieds?.title?.toLowerCase().includes(search.toLowerCase()) ||
      bp.profiles?.name?.toLowerCase().includes(search.toLowerCase()) ||
      bp.profiles?.username?.toLowerCase().includes(search.toLowerCase()) ||
      bp.provider_ref?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === "all" || bp.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = (boostPayments || []).reduce(
    (acc: Record<string, number>, bp: any) => {
      acc[bp.status] = (acc[bp.status] || 0) + 1;
      return acc;
    },
    {}
  );

  const totalRevenuePaid = (boostPayments || [])
    .filter((bp: any) => bp.status === "paid")
    .reduce((sum: number, bp: any) => sum + (bp.amount_cents || 0), 0);

  const totalPending = (boostPayments || [])
    .filter((bp: any) => bp.status === "pending")
    .reduce((sum: number, bp: any) => sum + (bp.amount_cents || 0), 0);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="size-5 text-amber-500 fill-amber-500" />
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Boost Payments
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Transações de impulsionamento de anúncios classificados. Confirme pagamentos manuais pendentes.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="rounded-xl h-9 px-3 text-xs gap-1.5 cursor-pointer"
        >
          <RefreshCw className="size-3.5" />
          Atualizar
        </Button>
      </div>

      {/* ── Cards de Resumo ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Transações", value: (boostPayments || []).length, className: "text-foreground" },
          { label: "Pagos · Receita", value: formatMoney(totalRevenuePaid), className: "text-emerald-600" },
          { label: "Pendentes", value: `${statusCounts.pending || 0} (${formatMoney(totalPending)})`, className: "text-amber-600" },
          { label: "Falhas", value: statusCounts.failed || 0, className: "text-destructive" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border/60 bg-card p-4 space-y-1"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">{card.label}</p>
            <p className={`text-lg font-black font-mono ${card.className}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por anúncio, usuário ou ref..."
            className="pl-8 h-9 rounded-xl text-xs border-border/70"
          />
        </div>
        <div className="flex gap-1.5">
          {["all", "pending", "paid", "failed", "expired"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`h-9 px-3 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                filterStatus === s
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border/60 hover:border-border"
              }`}
            >
              {s === "all"
                ? "Todos"
                : s === "pending"
                ? "Pendentes"
                : s === "paid"
                ? "Pagos"
                : s === "failed"
                ? "Falhas"
                : "Expirados"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabela de Transações ─────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-xs">Carregando transações...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
          <Flame className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-bold text-foreground">Nenhuma transação encontrada</p>
          <p className="text-xs text-muted-foreground mt-1">
            {search || filterStatus !== "all"
              ? "Tente outros filtros."
              : "Quando usuários impulsionarem anúncios, as transações aparecerão aqui."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((bp: any) => {
            const statusConf = STATUS_CONFIG[bp.status] || STATUS_CONFIG.pending;
            const profile = bp.profiles;
            const classified = bp.classifieds;

            return (
              <div
                key={bp.id}
                className="rounded-xl border border-border/60 bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                {/* Info principal */}
                <div className="flex-1 space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground truncate max-w-[200px]">
                      {classified?.title || "Anúncio removido"}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono px-1.5 py-0 flex items-center gap-1 ${statusConf.className}`}
                    >
                      {statusConf.icon}
                      {statusConf.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                    {profile && (
                      <span>
                        @{profile.username || profile.name || "—"}
                      </span>
                    )}
                    <span>·</span>
                    <span>{bp.plan_name}</span>
                    <span>·</span>
                    <span className="uppercase font-mono">{bp.provider}</span>
                    {bp.provider_ref && (
                      <>
                        <span>·</span>
                        <span className="font-mono text-[9px]">{bp.provider_ref.slice(0, 16)}...</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{new Date(bp.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {bp.paid_at && (
                    <div className="text-[10px] text-emerald-600">
                      Pago em {new Date(bp.paid_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                  {bp.failure_reason && (
                    <div className="text-[10px] text-destructive">{bp.failure_reason}</div>
                  )}
                </div>

                {/* Valor + Ações */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-base font-black font-mono text-foreground">
                    {formatMoney(bp.amount_cents)}
                  </span>

                  {bp.payment_link && bp.status === "pending" && (
                    <a
                      href={bp.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-xl border border-border/60 bg-card hover:bg-muted/30 text-xs font-medium flex items-center gap-1.5 transition-colors text-muted-foreground"
                    >
                      <ExternalLink className="size-3.5" />
                      Link
                    </a>
                  )}

                  {bp.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => setConfirmingPayment(bp)}
                      className="h-8 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 gap-1.5 cursor-pointer"
                    >
                      <CheckCheck className="size-3.5" />
                      Confirmar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dialog de Confirmação Manual ─────────────────────── */}
      <Dialog
        open={!!confirmingPayment}
        onOpenChange={(open) => !open && setConfirmingPayment(null)}
      >
        <DialogContent className="max-w-sm rounded-2xl p-6 space-y-4">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="size-5 text-emerald-600" />
            </div>
            <DialogTitle className="text-base font-bold">Confirmar Pagamento</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirmar que o pagamento foi recebido e ativar o boost no anúncio?
            </DialogDescription>
          </DialogHeader>

          {confirmingPayment && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Anúncio</span>
                <span className="font-medium truncate max-w-[160px]">
                  {confirmingPayment.classifieds?.title || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plano</span>
                <span className="font-medium">{confirmingPayment.plan_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-black font-mono text-foreground">
                  {formatMoney(confirmingPayment.amount_cents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-mono uppercase text-[10px]">{confirmingPayment.provider}</span>
              </div>
            </div>
          )}

          <div className="text-[10px] text-amber-600 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2">
            ⚠️ Esta ação é irreversível. O boost será ativado imediatamente após a confirmação.
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmingPayment(null)}
              className="rounded-xl text-xs h-10 flex-1 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => confirmingPayment && confirmMutation.mutate(confirmingPayment.id)}
              disabled={confirmMutation.isPending}
              className="rounded-xl text-xs h-10 flex-1 font-bold bg-emerald-600 text-white hover:bg-emerald-500 gap-1.5 cursor-pointer"
            >
              {confirmMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCheck className="size-4" />
                  Confirmar Pagamento
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
