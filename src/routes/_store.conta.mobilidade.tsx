import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { Car, Bike, Truck, MapPin, Clock, Loader2, Phone, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import {
  listCustomerMobilityRequests,
  getMyCourierProfile,
  checkCustomerDebtStatus,
  payCustomerDebt,
} from "@/services/mobility.functions";
import { getMyCourierApplicationStatus } from "@/services/courier-verification.functions";
import { MobilityQuickButton } from "@/components/mobility/mobility-quick-button";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/conta/mobilidade")({
  head: () => ({
    meta: [{ title: "Minhas Corridas e Mudanças | Waesy" }],
  }),
  loader: async () => {
    try {
      const { getUserSession } = await import("@/services/auth.functions");
      const session = await getUserSession().catch(() => null);
      if (!session?.user) {
        const { redirect } = await import("@tanstack/react-router");
        throw redirect({ to: "/entrar" });
      }

      const [requests, courierApp, courierProfile, debtStatus] = await Promise.all([
        listCustomerMobilityRequests().catch(() => []),
        getMyCourierApplicationStatus().catch(() => null),
        getMyCourierProfile().catch(() => null),
        checkCustomerDebtStatus().catch(() => ({ has_debts: false, total_debt_cents: 0, debts: [] })),
      ]);
      return { requests, courierApp, courierProfile, debtStatus };
    } catch (err) {
      const { isRedirect } = await import("@tanstack/react-router");
      if (isRedirect(err)) throw err;
      console.error("[loader:_store.conta.mobilidade] Unhandled error:", err);
      return { requests: null, courierApp: null, courierProfile: null, debtStatus: null };
    }
  },
  component: CustomerMobilityHistoryPage,
});

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  searching: { label: "Buscando Motorista", variant: "secondary" },
  accepted: { label: "Motorista a Caminho", variant: "default" },
  in_progress: { label: "Em Transporte", variant: "default" },
  delivered: { label: "Entregue", variant: "outline" },
  completed: { label: "Concluído", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "secondary" },
};

function CustomerMobilityHistoryPage() {
  const { requests: initialRequests, courierApp: initialCourierApp, debtStatus: initialDebtStatus } =
    ((Route.useLoaderData?.() as any) || {});

  const [isPaying, startPaying] = useTransition();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["customer-mobility-history"],
    queryFn: () => listCustomerMobilityRequests(),
    initialData: initialRequests,
    refetchInterval: 10000,
  });

  const { data: courierApp } = useQuery({
    queryKey: ["my-courier-application-status"],
    queryFn: () => getMyCourierApplicationStatus(),
    initialData: initialCourierApp,
  });

  const { data: debtStatus, refetch: refetchDebts } = useQuery({
    queryKey: ["customer-debt-status"],
    queryFn: () => checkCustomerDebtStatus(),
    initialData: initialDebtStatus,
  });

  const handlePayDebt = (debtId: string) => {
    startPaying(async () => {
      try {
        await payCustomerDebt({ data: { debtId } });
        toast.success("Débito quitado com sucesso! Seus serviços de mobilidade e delivery foram liberados.");
        refetchDebts();
      } catch (err: any) {
        toast.error(err?.message || "Erro ao quitar débito.");
      }
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-6 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MobilityQuickButton />
          <Badge variant="outline" className="font-mono text-xs uppercase font-bold px-3 py-1">
            Mobilidade
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">Trajetos e Entregas</span>
        </div>

        <div className="flex items-center gap-2">
          {courierApp?.crosscheck_status === "match_approved" ? (
            <Button
              asChild
              className="rounded-lg h-11 min-h-11 px-4 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-primary-foreground gap-2 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Link to="/conta/entregador">
                <Bike className="size-4" />
                <span>Painel do Condutor</span>
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              className="rounded-lg h-11 min-h-11 px-4 font-semibold text-xs border-border/80 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Link to="/entregador/cadastro">
                <span>{courierApp ? "Status de Parceiro" : "Seja um Parceiro"}</span>
              </Link>
            </Button>
          )}

          <Button
            asChild
            className="rounded-lg h-11 min-h-11 px-4 font-bold text-xs bg-primary text-primary-foreground gap-2 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to="/mobilidade">
              <Plus className="size-4" />
              <span>Novo Chamado</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Banner de Débito Pendente / Inadimplência (se houver) */}
      {debtStatus?.has_debts && (
        <div className="p-4 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 shrink-0" />
              <div>
                <span className="font-bold text-xs">Pendência Financeira no Waesy Go</span>
                <p className="text-xs opacity-90">
                  Consta um débito pendente no valor de {formatMoney(debtStatus.total_debt_cents)} por não-comparecimento dentro da tolerância de 3 minutos.
                </p>
              </div>
            </div>
            {debtStatus.debts?.[0] && (
              <Button
                onClick={() => handlePayDebt(debtStatus.debts[0].id)}
                disabled={isPaying}
                className="h-11 min-h-11 px-4 text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive shrink-0"
              >
                Quitar Débito Agora
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Banner de Status de Parceiro se houver inscrição */}
      {courierApp && (
        <div
          className={`p-4 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            courierApp.crosscheck_status === "match_approved"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-300"
              : courierApp.crosscheck_status === "divergence_flagged"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-300"
              : courierApp.crosscheck_status === "fraud_rejected"
              ? "bg-destructive/10 border-destructive/20 text-destructive"
              : "bg-muted/40 border-border/60 text-foreground"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold">
                {courierApp.crosscheck_status === "match_approved"
                  ? "Motorista/Entregador Ativo"
                  : courierApp.crosscheck_status === "divergence_flagged"
                  ? "Inscrição em Revisão de Segurança"
                  : courierApp.crosscheck_status === "fraud_rejected"
                  ? "Inscrição Recusada"
                  : "Inscrição de Parceiro em Análise"}
              </span>
              <Badge variant="outline" className="text-xs font-mono uppercase">
                {courierApp.vehicle_type}
              </Badge>
            </div>
            <p className="text-xs opacity-80">
              {courierApp.crosscheck_status === "match_approved"
                ? "Sua biometria facial e CNH foram aprovadas. Você está apto para entregas e corridas."
                : courierApp.crosscheck_status === "divergence_flagged"
                ? "Divergência detectada com o titular. A equipe de segurança está analisando manualmente."
                : "Seus documentos e minivídeo de prova de vida estão sendo auditados."}
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="rounded-lg h-11 min-h-11 px-4 text-xs shrink-0 self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to="/entregador/cadastro">Ver Dossiê</Link>
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && requests && requests.length === 0 && (
        <div className="py-20 text-center space-y-3 bg-muted/20 rounded-lg p-8">
          <Car className="size-10 text-muted-foreground/50 mx-auto" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Nenhuma corrida solicitada</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Precisa transportar um pacote, se deslocar pela cidade ou fazer uma mudança?
            </p>
          </div>
          <Button
            asChild
            className="rounded-lg h-11 min-h-11 px-5 font-semibold text-xs bg-foreground text-background hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to="/mobilidade">Chamar Agora</Link>
          </Button>
        </div>
      )}

      {!isLoading && requests && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((req: any) => {
            const statusConfig = (STATUS_LABELS as any)[req.status] || {
              label: req.status,
              variant: "outline",
            };

            return (
              <div
                key={req.id}
                className="rounded-lg bg-card p-5 space-y-3 hover:border-foreground/20 transition-colors border border-border/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-muted-foreground">
                      #{req.magic_token || req.id.substring(0, 8)}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{formatDate(req.created_at)}</span>
                  </div>

                  <Badge variant={statusConfig.variant} className="text-xs">
                    {statusConfig.label}
                  </Badge>
                </div>

                {/* Route Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="font-medium text-muted-foreground flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span>Origem / Coleta:</span>
                    </span>
                    <p className="text-foreground pl-6">{req.origin_address}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-medium text-muted-foreground flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span>Destino / Entrega:</span>
                    </span>
                    <p className="text-foreground pl-6">{req.destination_address}</p>
                  </div>
                </div>

                {/* Assigned Driver (if any) */}
                {req.courier_profiles && (
                  <div className="p-3 rounded-lg bg-muted/30 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-foreground text-background flex items-center justify-center font-bold">
                        {req.courier_profiles.full_name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">{req.courier_profiles.full_name}</span>
                        <p className="text-xs text-muted-foreground">
                          {req.courier_profiles.vehicle_model || req.courier_profiles.vehicle_type} •{" "}
                          {req.courier_profiles.vehicle_plate || "Placa em confirmação"}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`https://wa.me/55${req.courier_profiles.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-11 min-h-11 px-3 rounded-lg bg-background hover:bg-muted text-foreground font-medium text-xs flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Phone className="size-4" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                )}

                {/* Price & Summary */}
                <div className="flex items-center justify-between pt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs uppercase font-mono">
                      {req.service_type}
                    </Badge>
                    {req.helpers_count > 0 && (
                      <span className="text-xs text-muted-foreground">+{req.helpers_count} ajudante(s)</span>
                    )}
                  </div>

                  <span className="font-semibold text-sm text-foreground">
                    {formatMoney(req.final_price_cents || req.estimated_price_cents)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
