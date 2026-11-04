import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Handshake,
  TrendingUp,
  DollarSign,
  Check,
  X,
  Plus,
  Clock,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  Store,
  Layers,
  Percent,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listEntityMembers,
  updateAssociationMembershipStatus,
  recordAssociationTransaction,
  getEntityMetrics,
} from "@/services/association.functions";
import { getIdentity } from "@/services/identity.functions";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/associacao")({
  head: () => ({ meta: [{ title: "Rede de Empresas Associadas | Workspace" }] }),
  loader: async () => {
    try {
      const identity = await getIdentity();
      const storeId = identity?.store_id;
      if (!storeId) return { storeId: null, initialMetrics: null, initialMembers: [] };

      const [metrics, members] = await Promise.all([
        getEntityMetrics({ data: { entityStoreId: storeId, months: 6 } }).catch(() => null),
        listEntityMembers({ data: { entityStoreId: storeId, status: "all" } }).catch(() => []),
      ]);

      return { storeId, initialMetrics: metrics, initialMembers: members || [] };
    } catch {
      return { storeId: null, initialMetrics: null, initialMembers: [] };
    }
  },
  component: WorkspaceAssociacaoPage,
});

export default function WorkspaceAssociacaoPage() {
  const router = useRouter();
  const { storeId, initialMetrics, initialMembers } = Route.useLoaderData();

  const [activeTab, setActiveTab] = useState<"membros" | "metricas">("membros");
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "pending">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Diálogo para Registro de Negócio Offline
  const [isRegisterTxOpen, setIsRegisterTxOpen] = useState(false);
  const [txBuyerName, setTxBuyerName] = useState("");
  const [txBuyerDoc, setTxBuyerDoc] = useState("");
  const [txGrossReais, setTxGrossReais] = useState("");
  const [txDiscountPct, setTxDiscountPct] = useState("10");
  const [txNotes, setTxNotes] = useState("");
  const [isSavingTx, setIsSavingTx] = useState(false);

  // Queries Reativas
  const { data: members = initialMembers, isLoading: isLoadingMembers, refetch: refetchMembers } = useQuery({
    queryKey: ["entity-members", storeId],
    queryFn: () => (storeId ? listEntityMembers({ data: { entityStoreId: storeId, status: "all" } }) : []),
    initialData: initialMembers,
    enabled: Boolean(storeId),
  });

  const { data: metrics = initialMetrics, isLoading: isLoadingMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ["entity-metrics", storeId],
    queryFn: () => (storeId ? getEntityMetrics({ data: { entityStoreId: storeId, months: 6 } }) : null),
    initialData: initialMetrics,
    enabled: Boolean(storeId),
  });

  // Ações de Membro
  const handleUpdateStatus = async (membershipId: string, status: "approved" | "rejected") => {
    try {
      await updateAssociationMembershipStatus({
        data: {
          membershipId,
          status,
        },
      });
      toast.success(status === "approved" ? "Empresa associada com sucesso!" : "Filiação recusada.");
      refetchMembers();
      refetchMetrics();
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar filiação.");
    }
  };

  // Salvar Negócio Offline
  const handleSaveOfflineTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;

    const grossFloat = parseFloat(txGrossReais.replace(",", "."));
    if (isNaN(grossFloat) || grossFloat <= 0) {
      toast.error("Informe um valor bruto válido.");
      return;
    }
    const discountFloat = parseFloat(txDiscountPct.replace(",", ".")) || 0;
    const grossCents = Math.round(grossFloat * 100);

    setIsSavingTx(true);
    try {
      await recordAssociationTransaction({
        data: {
          entityStoreId: storeId,
          sellerStoreId: storeId,
          buyerName: txBuyerName.trim() || undefined,
          buyerDocument: txBuyerDoc.trim() || undefined,
          grossAmountCents: grossCents,
          discountPercent: discountFloat,
          transactionType: "indirect_offline",
          notes: txNotes.trim() || undefined,
        },
      });
      toast.success("Negócio B2B offline registrado com sucesso no painel da entidade!");
      setIsRegisterTxOpen(false);
      setTxBuyerName("");
      setTxBuyerDoc("");
      setTxGrossReais("");
      setTxNotes("");
      refetchMetrics();
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar transação.");
    } finally {
      setIsSavingTx(false);
    }
  };

  const filteredMembers = members.filter((m: any) => {
    const matchesStatus = filterStatus === "all" || m.status === filterStatus;
    const name = m.store?.name?.toLowerCase() || "";
    const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* ── CABEÇALHO DO WORKSPACE ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Rede de Empresas Associadas
            </h1>
            <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
              Clube B2B
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gestão de filiações, tabela de descontos mútuos e metrificação de negócios gerados pela entidade.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="default"
            onClick={() => setIsRegisterTxOpen(true)}
            className="h-11 min-h-11 px-4 rounded-lg font-semibold text-xs gap-2 cursor-pointer w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="size-4 shrink-0" />
            <span>Registrar Negócio B2B</span>
          </Button>
        </div>
      </div>

      {/* ── 4 KPI CARDS DE DESEMPENHO DA ASSOCIAÇÃO ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 rounded-lg border-border/60 bg-card space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Empresas Associadas</span>
            <Users className="size-4 text-primary" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-foreground">
            {metrics?.activeMembersCount || 0}
          </p>
          <p className="text-2xs text-muted-foreground">
            {metrics?.pendingMembersCount || 0} solicitações pendentes
          </p>
        </Card>

        <Card className="p-4 rounded-lg border-border/60 bg-card space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Negócios Gerados</span>
            <DollarSign className="size-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-foreground">
            {formatMoney((metrics?.totalGrossCents || 0) / 100)}
          </p>
          <p className="text-2xs text-muted-foreground">Volume transacionado na rede</p>
        </Card>

        <Card className="p-4 rounded-lg border-border/60 bg-card space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Economia em Descontos</span>
            <Percent className="size-4 text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-foreground">
            {formatMoney((metrics?.totalDiscountCents || 0) / 100)}
          </p>
          <p className="text-2xs text-muted-foreground">Benefício direto aos associados</p>
        </Card>

        <Card className="p-4 rounded-lg border-border/60 bg-card space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Transações B2B</span>
            <Handshake className="size-4 text-warning" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-foreground">
            {metrics?.totalTransactionsCount || 0}
          </p>
          <p className="text-2xs text-muted-foreground">
            {metrics?.directCount || 0} checkout / {metrics?.offlineCount || 0} offline
          </p>
        </Card>
      </div>

      {/* ── NAVEGAÇÃO DE ABAS CANÔNICA (Piso 44px) ── */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("membros")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            activeTab === "membros"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Building2 className="size-4" />
          <span>Empresas & Solicitações ({members.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("metricas")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            activeTab === "metricas"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <TrendingUp className="size-4" />
          <span>Métricas de Negócios ({metrics?.recentTransactions?.length || 0})</span>
        </button>
      </div>

      {/* ── CONTEÚDO DA ABA 1: MEMBROS & FILIAÇÕES ── */}
      {activeTab === "membros" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar empresa por nome..."
                className="h-11 pl-9 rounded-lg text-xs bg-card"
              />
            </div>

            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40 w-full sm:w-auto">
              {(["all", "approved", "pending"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={cn(
                    "h-11 min-h-11 px-4 rounded-lg text-xs font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-1 sm:flex-initial",
                    filterStatus === st
                      ? "bg-background text-foreground font-bold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {st === "all" ? "Todos" : st === "approved" ? "Aprovados" : "Pendentes"}
                </button>
              ))}
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <Card className="p-8 text-center rounded-lg border-border/60 bg-card space-y-2">
              <Building2 className="size-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">Nenhuma empresa associada encontrada.</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Convide empresas parceiras ou aguarde solicitações de filiação para compor a rede de benefícios mútuos.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredMembers.map((m: any) => (
                <Card
                  key={m.membershipId}
                  className="p-4 rounded-lg border-border/60 bg-card flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="size-14 rounded-xl bg-muted/50 border border-border/50 shrink-0 overflow-hidden flex items-center justify-center">
                      {m.store?.logoUrl ? (
                        <img
                          src={m.store.logoUrl}
                          alt={m.store.name}
                          className="size-full object-cover select-none"
                        />
                      ) : (
                        <Store className="size-6 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-foreground truncate">
                          {m.store?.name || "Empresa Parceira"}
                        </h3>
                        <Badge
                          variant={m.status === "approved" ? "default" : "outline"}
                          className={cn(
                            "text-2xs capitalize shrink-0 font-mono",
                            m.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "border-warning/30 text-warning-strong dark:text-warning"
                          )}
                        >
                          {m.status === "approved" ? "Ativa" : "Pendente"}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground truncate">
                        {m.store?.city ? `${m.store.city} - ${m.store.state}` : "Local não informado"}
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="text-2xs font-bold border-primary/30 text-primary">
                          {m.discountPercent}% OFF B2B
                        </Badge>
                        {m.customBenefitDescription && (
                          <span className="text-2xs text-muted-foreground truncate">
                            {m.customBenefitDescription}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                    {m.store?.slug && (
                      <Button asChild variant="ghost" className="h-11 min-h-11 px-4 rounded-lg text-xs gap-1 cursor-pointer">
                        <Link to="/loja/$slug" params={{ slug: m.store.slug }}>
                          <span>Ver Vitrine</span>
                          <ExternalLink className="size-3" />
                        </Link>
                      </Button>
                    )}

                    {m.status === "pending" && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleUpdateStatus(m.membershipId, "rejected")}
                          className="h-11 min-h-11 px-4 rounded-lg text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          Recusar
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleUpdateStatus(m.membershipId, "approved")}
                          className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
                        >
                          <Check className="size-4" strokeWidth={2} />
                          <span>Aprovar</span>
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CONTEÚDO DA ABA 2: MÉTRICAS DE NEGÓCIOS & HISTÓRICO ── */}
      {activeTab === "metricas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              Últimas Transações B2B Computadas
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              Janela: últimos 6 meses
            </span>
          </div>

          {!metrics?.recentTransactions || metrics.recentTransactions.length === 0 ? (
            <Card className="p-8 text-center rounded-lg border-border/60 bg-card space-y-2">
              <TrendingUp className="size-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">Nenhuma transação B2B registrada ainda.</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Quando empresas associadas comprarem entre si pela plataforma ou registrarem acordos offline, os números aparecerão aqui.
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto table-container rounded-lg border border-border/60 bg-card">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/50">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Vendedor</th>
                    <th className="p-3">Comprador</th>
                    <th className="p-3">Canal</th>
                    <th className="p-3 text-right">Valor Bruto</th>
                    <th className="p-3 text-right">Desconto B2B</th>
                    <th className="p-3 text-right">Valor Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {metrics.recentTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                        {tx.sellerName}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {tx.buyerName}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-2xs font-mono",
                            tx.type === "direct"
                              ? "border-emerald-500/30 text-emerald-500"
                              : "border-blue-500/30 text-blue-500"
                          )}
                        >
                          {tx.type === "direct" ? "Checkout" : "Offline"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono font-medium text-foreground whitespace-nowrap">
                        {formatMoney(tx.grossCents / 100)}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        - {formatMoney(tx.discountCents / 100)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                        {formatMoney(tx.netCents / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── DIÁLOGO PARA REGISTRAR TRANSAÇÃO OFFLINE ── */}
      <Dialog open={isRegisterTxOpen} onOpenChange={setIsRegisterTxOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Registrar Negócio B2B Offline</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Insira os dados do negócio intermediado entre empresas associadas da entidade para computar as métricas de faturamento gerado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveOfflineTx} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Empresa / Cliente Parceiro *</Label>
              <Input
                value={txBuyerName}
                onChange={(e) => setTxBuyerName(e.target.value)}
                placeholder="Ex: Auto Posto Modelo Ltda"
                className="h-11 rounded-lg text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">CNPJ / CPF do Comprador</Label>
                <Input
                  value={txBuyerDoc}
                  onChange={(e) => setTxBuyerDoc(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="h-11 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">% de Desconto Aplicado *</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={txDiscountPct}
                  onChange={(e) => setTxDiscountPct(e.target.value)}
                  className="h-11 rounded-lg text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Valor Bruto do Negócio (R$) *</Label>
              <Input
                value={txGrossReais}
                onChange={(e) => setTxGrossReais(e.target.value)}
                placeholder="Ex: 3500.00"
                className="h-11 rounded-lg text-xs font-mono text-base sm:text-xs"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Observações / NF / Referência</Label>
              <Textarea
                value={txNotes}
                onChange={(e) => setTxNotes(e.target.value)}
                placeholder="Ex: Negócio fechado na rodada empresarial — NF 45802"
                className="rounded-lg text-xs min-h-20"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRegisterTxOpen(false)}
                className="h-11 rounded-lg text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="secondary"
                disabled={isSavingTx}
                className="h-11 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {isSavingTx ? "Salvando..." : "Salvar Transação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
