import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
 Users,
 Search,
 CheckCircle2,
 Clock,
 Banknote,
 MoreVertical,
 Loader2,
 TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
 getAffiliatePerformance,
 getCommissionSummary,
 payAffiliateCommission,
} from "@/services/affiliates.functions";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/financeiro/afiliados")({
 head: () => ({ meta: [{ title: "Comissões de Afiliados | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const [performance, summary] = await Promise.all([
 getAffiliatePerformance({ data: {} }),
 getCommissionSummary(),
 ]);
 return { initialPerformance: performance, initialSummary: summary };
   } catch (err) {
     console.error("[loader:workspace.financeiro.afiliados] Unhandled error:", err);
     return { initialPerformance: null, initialSummary: null };
   }
 },
 component: AfiliadosFinanceiroPage,
});

function AfiliadosFinanceiroPage() {
 const { initialPerformance, initialSummary } = ((Route.useLoaderData?.() as any) || {});
 const queryClient = useQueryClient();
 const [search, setSearch] = useState("");

 const payoutMutation = useMutation({
 mutationFn: payAffiliateCommission,
 onSuccess: (data) => {
 toast.success(
 `Repasse concluído! ${data.paidCount} comissões liquidadas (${formatMoney(data.totalPaidCents)}).`,
 );
 queryClient.invalidateQueries({ queryKey: ["affiliates-summary"] });
 queryClient.invalidateQueries({ queryKey: ["affiliates-performance"] });
 },
 onError: (err: any) => {
 toast.error(err?.message || "Erro ao processar repasse.");
 },
 });

 const { data: summary, isLoading: isSummaryLoading } = useQuery({
 queryKey: ["affiliates-summary"],
 queryFn: () => getCommissionSummary(),
 initialData: initialSummary,
 staleTime: 60_000,
 });

 const { data: performance, isLoading: isPerformanceLoading } = useQuery({
 queryKey: ["affiliates-performance"],
 queryFn: () => getAffiliatePerformance({ data: {} }),
 initialData: initialPerformance,
 staleTime: 60_000,
 });

  // Client-side search (since list is usually small per tenant)
  const filteredPerformance = (performance as any[])?.filter((p: any) =>
    p.sellerName.toLowerCase().includes(search.toLowerCase()),
  ) || [];

  return (
    <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-base font-bold text-foreground">Comissões de Parceiros & Equipe</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Desempenho e repasses consolidados de vendedores e afiliados.
          </p>
        </div>
      </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="p-5 rounded-lg bg-background">
 <div className="flex items-center gap-2 mb-2">
 <Clock className="size-4 text-warning" />
 <h2 className="text-sm font-medium text-muted-foreground">Comissões Pendentes</h2>
 </div>
 {isSummaryLoading ? (
 <div className="h-8 bg-muted animate-pulse rounded-xl w-32 mt-1" />
 ) : (
 <p className="text-2xl font-bold text-foreground">
 {formatMoney(summary?.totalPendingCents ?? 0)}
 </p>
 )}
 </div>
 <div className="p-5 rounded-lg bg-background">
 <div className="flex items-center gap-2 mb-2">
 <CheckCircle2 className="size-4 text-success" />
 <h2 className="text-sm font-medium text-muted-foreground">Comissões Pagas</h2>
 </div>
 {isSummaryLoading ? (
 <div className="h-8 bg-muted animate-pulse rounded-xl w-32 mt-1" />
 ) : (
 <p className="text-2xl font-bold text-foreground">
 {formatMoney(summary?.totalPaidCents ?? 0)}
 </p>
 )}
 </div>
 <div className="p-5 rounded-lg bg-background">
 <div className="flex items-center gap-2 mb-2">
 <Users className="size-4 text-primary" />
 <h2 className="text-sm font-medium text-muted-foreground">Parceiros Ativos</h2>
 </div>
 {isSummaryLoading ? (
 <div className="h-8 bg-muted animate-pulse rounded-xl w-16 mt-1" />
 ) : (
 <p className="text-2xl font-bold text-foreground">{summary?.sellerCount ?? 0}</p>
 )}
 </div>
 </div>

 {/* Toolbar */}
 <div className="flex items-center gap-3">
 <div className="relative flex-1 max-w-sm">
 <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <input
 type="search"
 placeholder="Buscar por parceiro..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2 text-sm bg-background rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
 />
 </div>
 <Button variant="outline" size="sm">
 Exportar CSV
 </Button>
 </div>

 {/* Table */}
 {isPerformanceLoading && (
 <div className="flex justify-center py-16">
 <Loader2 className="size-6 animate-spin text-muted-foreground" />
 </div>
 )}

 {!isPerformanceLoading && filteredPerformance?.length === 0 && (
 <div className="flex flex-col items-center justify-center py-16 text-center border-0 rounded-lg bg-muted/10">
 <Users className="size-10 text-muted-foreground/30 mb-3" />
 <p className="text-sm font-medium text-foreground">Nenhum parceiro encontrado.</p>
 <p className="text-sm text-muted-foreground mt-1">
 As comissões aparecerão aqui quando as vendas forem aprovadas.
 </p>
 </div>
 )}

 {!isPerformanceLoading && filteredPerformance && filteredPerformance.length > 0 && (
 <div className=" rounded-lg overflow-hidden bg-background">
 <table className="w-full text-sm text-left">
 <thead className="bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider">
 <tr>
 <th className="px-4 py-3 font-medium">Parceiro</th>
 <th className="px-4 py-3 font-medium text-right">Pedidos</th>
 <th className="px-4 py-3 font-medium text-right">Faturamento Gerado</th>
 <th className="px-4 py-3 font-medium text-right">Comissão Total</th>
 <th className="px-4 py-3 font-medium text-right">Pendente</th>
 <th className="px-4 py-3 font-medium w-10"></th>
 </tr>
 </thead>
              <tbody className="divide-y divide-border">
                {filteredPerformance.map((p: any) => (
 <tr key={p.sellerId} className="hover:bg-muted/20 transition-colors group">
 <td className="px-4 py-3">
 <p className="font-medium text-foreground flex items-center gap-2">
 {p.sellerName}
 {p.commissionRate > 0 && (
 <Badge variant="outline" className="text-[10px] h-5">
 {p.commissionRate}%
 </Badge>
 )}
 </p>
 </td>
 <td className="px-4 py-3 text-right">
 <span className="inline-flex items-center gap-1">
 {p.totalOrders} <TrendingUp className="size-3 text-muted-foreground" />
 </span>
 </td>
 <td className="px-4 py-3 text-right font-medium">
 {formatMoney(p.totalRevenueCents)}
 </td>
 <td className="px-4 py-3 text-right font-medium text-primary">
 {formatMoney(p.totalCommissionCents)}
 </td>
 <td className="px-4 py-3 text-right">
 {p.pendingCommissionCents > 0 ? (
 <span className="text-warning font-medium">
 {formatMoney(p.pendingCommissionCents)}
 </span>
 ) : (
 <span className="text-muted-foreground">R$ 0,00</span>
 )}
 </td>
 <td className="px-4 py-3 text-right">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button
 variant="ghost"
 size="icon"
 className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
 >
 <MoreVertical className="size-4 text-muted-foreground" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-48">
 <DropdownMenuItem
 disabled={p.pendingCommissionCents === 0 || payoutMutation.isPending}
 onClick={() => payoutMutation.mutate({ data: { sellerId: p.sellerId } })}
 >
 {payoutMutation.isPending ? (
 <Loader2 className="size-4 mr-2 animate-spin" />
 ) : (
 <Banknote className="size-4 mr-2" />
 )}
 Gerar Fatura (Payout)
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 );
}
