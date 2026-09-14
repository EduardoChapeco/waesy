import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
 Car,
 Bike,
 Zap,
 Truck,
 Boxes,
 MapPin,
 Clock,
 Loader2,
 Phone,
 Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import {
 listCustomerMobilityRequests,
} from "@/services/mobility.functions";
import {
 getMyCourierApplicationStatus,
} from "@/services/courier-verification.functions";

export const Route = createFileRoute("/_store/conta/mobilidade")({
 head: () => ({
 meta: [{ title: "Minhas Corridas & Mudanças | Waesy" }],
 }),
  loader: async () => {
    try {
      const { getUserSession } = await import("@/services/auth.functions");
      const session = await getUserSession().catch(() => null);
      const role = session?.role || session?.user?.user_metadata?.role;
      const allowedRoles = ["store_owner", "operator", "platform_admin", "master"];
      if (!role || !allowedRoles.includes(role)) {
        const { redirect } = await import("@tanstack/react-router");
        throw redirect({ to: "/conta" });
      }

      const [requests, courierApp] = await Promise.all([
        listCustomerMobilityRequests().catch(() => []),
        getMyCourierApplicationStatus().catch(() => null),
      ]);
      return { requests, courierApp };
    } catch (err) {
      const { isRedirect } = await import("@tanstack/react-router");
      if (isRedirect(err)) throw err;
      console.error("[loader:_store.conta.mobilidade] Unhandled error:", err);
      return { requests: null, courierApp: null };
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
 const { requests: initialRequests, courierApp: initialCourierApp } = ((Route.useLoaderData?.() as any) || {});
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

 return (
 <div className="w-full max-w-4xl mx-auto space-y-6 pb-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold px-2.5 py-0.5">
 Mobilidade
 </Badge>
 <span className="text-xs text-muted-foreground font-mono">Trajetos & Entregas</span>
 </div>

 <div className="flex items-center gap-2">
 <Button asChild variant="outline" size="sm" className="rounded-xl h-9 px-3.5 font-semibold text-xs border-border/80 hover:bg-muted">
 <Link to="/entregador/cadastro">
 <span>{courierApp ? "Status de Parceiro" : "Seja um Parceiro"}</span>
 </Link>
 </Button>

 <Button asChild size="sm" className="rounded-xl h-9 px-4 font-bold text-xs bg-primary text-primary-foreground gap-1.5">
 <Link to="/mobilidade">
 <Plus className="size-3.5" />
 <span>Novo Chamado</span>
 </Link>
 </Button>
 </div>
 </div>

 {/* Banner de Status de Parceiro se houver inscrição */}
 {courierApp && (
 <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
 courierApp.crosscheck_status === "match_approved"
 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-300"
 : courierApp.crosscheck_status === "divergence_flagged"
 ? "bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-300"
 : courierApp.crosscheck_status === "fraud_rejected"
 ? "bg-destructive/10 border-destructive/20 text-destructive"
 : "bg-muted/40 border-border/60 text-foreground"
 }`}>
 <div className="space-y-0.5">
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
 <Badge variant="outline" className="text-[10px] font-mono uppercase">
 {courierApp.vehicle_type}
 </Badge>
 </div>
 <p className="text-[11px] opacity-80">
 {courierApp.crosscheck_status === "match_approved"
 ? "Sua biometria facial e CNH foram aprovadas. Você está apto para entregas e corridas."
 : courierApp.crosscheck_status === "divergence_flagged"
 ? "Divergência detectada com o titular. A equipe de segurança está analisando manualmente."
 : "Seus documentos e minivídeo de prova de vida estão sendo auditados."}
 </p>
 </div>
 <Button asChild size="sm" variant="outline" className="rounded-xl h-8 px-3 text-xs shrink-0 self-start sm:self-auto">
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
 <div className="py-20 text-center space-y-3 bg-muted/20 rounded-2xl p-8">
 <Car className="size-10 text-muted-foreground/50 mx-auto" />
 <div className="space-y-1">
 <h2 className="text-sm font-semibold text-foreground">Nenhuma corrida solicitada</h2>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Precisa transportar um pacote, se deslocar pela cidade ou fazer uma mudança?
 </p>
 </div>
 <Button asChild className="rounded-xl h-10 px-5 font-semibold text-xs bg-foreground text-background hover:opacity-90">
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
 className="rounded-2xl bg-card p-5 space-y-3 hover:border-foreground/20 transition-colors"
 >
 <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
 <div className="flex items-center gap-2">
 <span className="font-mono text-xs font-medium text-muted-foreground">
 #{req.magic_token || req.id.substring(0, 8)}
 </span>
 <span className="text-xs text-muted-foreground">•</span>
 <span className="text-xs text-muted-foreground">
 {formatDate(req.created_at)}
 </span>
 </div>

 <Badge variant={statusConfig.variant} className="text-xs">
 {statusConfig.label}
 </Badge>
 </div>

 {/* Route Information */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
 <div className="space-y-0.5">
 <span className="font-medium text-muted-foreground flex items-center gap-1.5">
 <MapPin className="size-3.5 text-muted-foreground" />
 <span>Origem / Coleta:</span>
 </span>
 <p className="text-foreground pl-5">{req.origin_address}</p>
 </div>

 <div className="space-y-0.5">
 <span className="font-medium text-muted-foreground flex items-center gap-1.5">
 <MapPin className="size-3.5 text-muted-foreground" />
 <span>Destino / Entrega:</span>
 </span>
 <p className="text-foreground pl-5">{req.destination_address}</p>
 </div>
 </div>

 {/* Assigned Driver (if any) */}
 {req.courier_profiles && (
 <div className="p-3 rounded-xl bg-muted/30 flex items-center justify-between gap-3 text-xs">
 <div className="flex items-center gap-3">
 <div className="size-8 rounded-lg bg-foreground text-background flex items-center justify-center font-bold">
 {req.courier_profiles.full_name.charAt(0)}
 </div>
 <div>
 <span className="font-semibold text-foreground">{req.courier_profiles.full_name}</span>
 <p className="text-[11px] text-muted-foreground">
 {req.courier_profiles.vehicle_model || req.courier_profiles.vehicle_type} • {req.courier_profiles.vehicle_plate || "Placa em confirmação"}
 </p>
 </div>
 </div>

 <a
 href={`https://wa.me/55${req.courier_profiles.phone.replace(/\D/g, "")}`}
 target="_blank"
 rel="noreferrer"
 className="px-3 py-1.5 rounded-lg bg-background hover:bg-muted text-foreground font-medium text-xs flex items-center gap-1.5 transition-colors"
 >
 <Phone className="size-3.5" />
 <span>WhatsApp</span>
 </a>
 </div>
 )}

 {/* Price & Summary */}
 <div className="flex items-center justify-between pt-2 text-xs">
 <div className="flex items-center gap-2">
 <Badge variant="outline" className="text-[10px] uppercase font-mono">
 {req.service_type}
 </Badge>
 {req.helpers_count > 0 && (
 <span className="text-xs text-muted-foreground">
 +{req.helpers_count} ajudante(s)
 </span>
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
