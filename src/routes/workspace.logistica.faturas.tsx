import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
 DollarSign,
 CheckCircle2,
 Clock,
 Download,
 Calendar,
 Users,
 CreditCard,
 Building,
 Loader2,
 Inbox,
 Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { toast } from "sonner";
import {
 listLogisticsInvoices,
 settleLogisticsInvoice,
 type LogisticsInvoiceDTO,
} from "@/services/mobility.functions";

export const Route = createFileRoute("/workspace/logistica/faturas")({
 head: () => ({
 meta: [{ title: "Faturas & Repasses de Frota | Workspace Waesy" }],
 }),
 component: WorkspaceLogisticsInvoicesPage,
});

function WorkspaceLogisticsInvoicesPage() {
 const queryClient = useQueryClient();

 const { data: invoices = [], isLoading } = useQuery<LogisticsInvoiceDTO[]>({
 queryKey: ["logistics_invoices"],
 queryFn: () => listLogisticsInvoices(),
 });

 const settleMutation = useMutation({
 mutationFn: (id: string) => settleLogisticsInvoice({ data: { id } }),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["logistics_invoices"] });
 toast.success("Fatura liquidada com sucesso e comprovante gerado!");
 },
 onError: (err: any) => {
 toast.error(`Erro ao liquidar fatura: ${err.message || "Tente novamente"}`);
 },
 });

 const handleMarkAsPaid = (id: string) => {
 settleMutation.mutate(id);
 };

 const totalPendingCents = invoices
 .filter((i) => i.status === "pending")
 .reduce((acc, i) => acc + i.net_payable_cents, 0);

 const totalPaidCents = invoices
 .filter((i) => i.status === "paid")
 .reduce((acc, i) => acc + i.net_payable_cents, 0);

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-black text-foreground tracking-tight">
 Faturas & Fechamentos de Frota
 </h1>
 <p className="text-xs text-muted-foreground">
 Controle de repasses quinzenais para motoristas autônomos e empresas de logística parceiras.
 </p>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="p-6 rounded-2xl bg-card border border-border/60 space-y-2">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
 Total Pendente de Repasse
 </span>
 <p className="text-2xl font-black text-amber-600 font-mono">
 {formatMoney(totalPendingCents)}
 </p>
 <span className="text-[11px] text-muted-foreground">
 Aguardando baixa financeira do ciclo atual
 </span>
 </div>

 <div className="p-6 rounded-2xl bg-card border border-border/60 space-y-2">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
 Total Liquidado (Últimos 30 dias)
 </span>
 <p className="text-2xl font-black text-emerald-600 font-mono">
 {formatMoney(totalPaidCents)}
 </p>
 <span className="text-[11px] text-muted-foreground">
 Repasses efetuados com comprovante PIX
 </span>
 </div>
 </div>

 {/* Tabela de Faturas */}
 <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
 <div className="p-5 border-b border-border/40 bg-muted/20 flex items-center justify-between">
 <h2 className="text-sm font-bold text-foreground">Demonstrativo de Repasses</h2>
 {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
 </div>

 {invoices.length === 0 && !isLoading ? (
 <div className="p-16 text-center space-y-4">
 <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground">
 <Inbox className="size-6" />
 </div>
 <div className="space-y-1 max-w-sm mx-auto">
 <p className="text-sm font-bold text-foreground">Nenhum repasse de frota registrado</p>
 <p className="text-xs text-muted-foreground leading-relaxed">
 As faturas e fechamentos quinzenais são gerados e apurados a partir dos despachos concluídos da sua frota de entregadores.
 </p>
 </div>
 <div className="pt-2">
            <Button
              asChild
              variant="outline"
              className="rounded-xl font-bold text-xs h-10 sm:h-11 px-4"
            >
              <Link to="/workspace/pedidos/frota">
                <Truck className="size-3.5 mr-1.5" />
                <span>Gerenciar Frota & Despachos</span>
              </Link>
            </Button>
 </div>
 </div>
 ) : (
 <div className="divide-y divide-border/50">
 {invoices.map((inv) => (
 <div
 key={inv.id}
 className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:bg-muted/20 transition-colors"
 >
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className="font-bold text-foreground text-sm">{inv.courier_name}</span>
 <Badge
 className={
 inv.status === "paid"
 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
 : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
 }
 >
 {inv.status === "paid" ? "Liquidado" : "Pendente"}
 </Badge>
 </div>
 <p className="text-[11px] text-muted-foreground font-mono">
 {inv.courier_phone || "Sem telefone"} • Ciclo: {inv.period} ({inv.total_rides} corridas/entregas)
 </p>
 </div>

 <div className="flex items-center gap-6">
 <div className="text-right">
 <span className="text-[10px] text-muted-foreground uppercase font-bold">
 Valor Líquido
 </span>
 <p className="font-mono font-black text-base text-foreground">
 {formatMoney(inv.net_payable_cents)}
 </p>
 </div>

 {inv.status === "pending" ? (
 <Button
 onClick={() => handleMarkAsPaid(inv.id)}
 disabled={settleMutation.isPending}
 className="h-10 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
 >
 {settleMutation.isPending ? (
 <Loader2 className="size-3.5 animate-spin" />
 ) : (
 <CheckCircle2 className="size-3.5" />
 )}
 <span>Dar Baixa PIX</span>
 </Button>
 ) : (
 <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
 <CheckCircle2 className="size-3.5" />
 <span>Pago {inv.paid_at ? `em ${formatDate(inv.paid_at)}` : ""}</span>
 </span>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}
