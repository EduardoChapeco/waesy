import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  DollarSign,
  CheckCircle,
  Users,
  Percent,
  Edit2,
  Search,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  CheckCircle2,
  Wallet,
  ArrowDownLeft,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  listCommissions,
  payCommission,
  payAllPendingCommissionsForSeller,
  listSellers,
  updateSellerCommissionRate,
} from "@/services/commission.functions";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { playCashRegisterSound } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/financeiro/comissoes")({
  head: () => ({ meta: [{ title: "Gestão de Comissões | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [commissions, sellers] = await Promise.all([listCommissions(), listSellers()]);
      return {
        commissions: Array.isArray(commissions) ? commissions : [],
        sellers: Array.isArray(sellers) ? sellers : [],
      };
    } catch (err) {
      console.error("[loader:workspace.financeiro.comissoes] Unhandled loader error:", err);
      return { commissions: [], sellers: [] };
    }
  },
  component: CommissionsPage,
});

function CommissionsPage() {
  const data = (Route.useLoaderData?.() as any) || {};
  const [commissions, setCommissions] = useState<any[]>(data.commissions || []);
  const [sellers, setSellers] = useState<any[]>(data.sellers || []);
  const router = useRouter();

  // Filtros do Extrato
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "refunds">("all");

  // Ações
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payingSellerId, setPayingSellerId] = useState<string | null>(null);
  const [editingSellerId, setEditingSellerId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<string>("");

  // ── KPIS FINANCEIROS DE COMISSÕES ────────────────────────────────────────
  const kpis = useMemo(() => {
    let totalPaidCents = 0;
    let totalPendingCents = 0;
    let totalPaidCount = 0;

    commissions.forEach((c) => {
      if (c.status === "paid") {
        totalPaidCents += c.amountCents || 0;
        totalPaidCount += 1;
      } else if (c.status === "pending") {
        totalPendingCents += c.amountCents || 0;
      }
    });

    const avgCommissionCents = totalPaidCount > 0 ? Math.round(totalPaidCents / totalPaidCount) : 0;

    return {
      totalPaidCents,
      totalPendingCents,
      activeSellers: sellers.length,
      avgCommissionCents,
      totalCount: commissions.length,
    };
  }, [commissions, sellers]);

  // Saldo pendente agrupado por vendedor
  const sellerPendingMap = useMemo(() => {
    const map = new Map<string, { totalPendingCents: number; count: number }>();
    commissions.forEach((c) => {
      if (c.status === "pending") {
        // Encontra o vendedor pelo nome ou id
        const matchedSeller = sellers.find((s) => s.full_name === c.sellerName);
        const key = matchedSeller ? matchedSeller.id : c.sellerName;
        const current = map.get(key) || { totalPendingCents: 0, count: 0 };
        map.set(key, {
          totalPendingCents: current.totalPendingCents + (c.amountCents || 0),
          count: current.count + 1,
        });
      }
    });
    return map;
  }, [commissions, sellers]);

  // ── FILTRO & BUSCA DO EXTRATO ────────────────────────────────────────────
  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      // Filtro Status
      if (statusFilter === "pending" && c.status !== "pending") return false;
      if (statusFilter === "paid" && c.status !== "paid") return false;
      if (statusFilter === "refunds" && c.amountCents >= 0) return false;

      // Busca texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const seller = (c.sellerName || "").toLowerCase();
        const token = (c.orderToken || "").toLowerCase();
        const id = (c.id || "").toLowerCase();
        return seller.includes(term) || token.includes(term) || id.includes(term);
      }

      return true;
    });
  }, [commissions, statusFilter, searchTerm]);

  // ── AÇÕES DE LIQUIDAÇÃO ──────────────────────────────────────────────────
  const handlePay = async (id: string, sellerName?: string) => {
    setPayingId(id);
    try {
      await payCommission({ data: { commissionId: id } });
      playCashRegisterSound();
      toast.success(`Comissão de ${sellerName || "venda"} liquidada com sucesso!`);
      setCommissions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "paid", paidAt: new Date().toISOString() } : c)),
      );
      router.invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao pagar comissão");
    } finally {
      setPayingId(null);
    }
  };

  const handlePayAllForSeller = async (sellerId: string, sellerName: string) => {
    setPayingSellerId(sellerId);
    try {
      const res = await payAllPendingCommissionsForSeller({ data: { sellerId } });
      playCashRegisterSound();
      toast.success(`Folha de comissões quitada! ${res.count} lançamentos liquidados (${formatMoney(res.totalSettledCents)}).`);
      setCommissions((prev) =>
        prev.map((c) => (c.sellerName === sellerName && c.status === "pending" ? { ...c, status: "paid" } : c)),
      );
      router.invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao quitar folha do vendedor");
    } finally {
      setPayingSellerId(null);
    }
  };

  const handleSaveRate = async (sellerId: string) => {
    try {
      const rate = parseFloat(editingRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        toast.error("Taxa inválida. Use um valor entre 0 e 100.");
        return;
      }
      await updateSellerCommissionRate({ data: { sellerId, rate } });
      toast.success("Taxa de comissão atualizada com sucesso!");
      setSellers((prev) =>
        prev.map((s) => (s.id === sellerId ? { ...s, commission_rate: rate } : s)),
      );
      setEditingSellerId(null);
      router.invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar taxa");
    }
  };

  // ── EXPORTAÇÃO CSV ───────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredCommissions.length === 0) {
      toast.info("Nenhuma comissão para exportar.");
      return;
    }

    const headers = [
      "ID",
      "Vendedor",
      "Pedido",
      "Valor do Pedido (R$)",
      "Comissao (R$)",
      "Status",
      "Data de Criacao",
      "Data de Pagamento",
    ];

    const rows = filteredCommissions.map((c) => [
      c.id,
      `"${c.sellerName}"`,
      c.orderToken || "-",
      (c.orderTotal / 100).toFixed(2),
      (c.amountCents / 100).toFixed(2),
      c.status,
      c.createdAt || "-",
      c.paidAt || "-",
    ].join(";"));

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `extrato-comissoes-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Extrato de comissões exportado em CSV com sucesso!");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Financeiro"
        title="Comissões de Vendas & Parceiros"
        description="Acompanhe repasses por pedido, defina regras percentuais e realize quitações individuais ou em lote."
        actions={
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold h-9 gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            <span>Exportar CSV</span>
          </Button>
        }
      />

      {/* ── KPIS FINANCEIROS DE COMISSÕES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Total Pago em Comissões
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(kpis.totalPaidCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Repasses liquidados à equipe
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="size-3.5 text-amber-500" />
            Pendente a Quitar
          </span>
          <div className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
            {formatMoney(kpis.totalPendingCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Aguardando liberação financeira
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-primary" />
            Média por Pedido
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {formatMoney(kpis.avgCommissionCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Comissão média calculada
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="size-3.5 text-foreground" />
            Vendedores Ativos
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {kpis.activeSellers}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Membros da equipe comercial
          </p>
        </div>
      </div>

      {/* ── ABAS CANÔNICAS ── */}
      <Tabs defaultValue="extrato" className="w-full space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-2xl border border-border/60">
          <TabsTrigger value="extrato" className="rounded-xl text-xs font-bold gap-2">
            <DollarSign className="size-4" />
            <span>Extrato de Comissões ({commissions.length})</span>
          </TabsTrigger>
          <TabsTrigger value="equipe" className="rounded-xl text-xs font-bold gap-2">
            <Users className="size-4" />
            <span>Equipe, Regras & Quitação em Lote ({sellers.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ── ABA 1: EXTRATO ── */}
        <TabsContent value="extrato" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por vendedor ou pedido..."
                className="pl-10 h-10 rounded-xl text-xs bg-background"
              />
            </div>

            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todas ({commissions.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === "pending"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pendentes ({commissions.filter((c) => c.status === "pending").length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("paid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === "paid"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pagas ({commissions.filter((c) => c.status === "paid").length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("refunds")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === "refunds"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Estornos ({commissions.filter((c) => c.amountCents < 0).length})
              </button>
            </div>
          </div>

          {filteredCommissions.length === 0 ? (
            <EmptyState
              title="Nenhuma comissão encontrada"
              description="Nenhum lançamento corresponde aos filtros ou termos pesquisados."
            />
          ) : (
            <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="text-xs font-bold">Vendedor(a)</TableHead>
                    <TableHead className="text-xs font-bold font-mono">Pedido</TableHead>
                    <TableHead className="text-xs font-bold font-mono">Valor Venda</TableHead>
                    <TableHead className="text-xs font-bold font-mono">Comissão</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                    <TableHead className="text-right text-xs font-bold">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions.map((c: any) => (
                    <TableRow key={c.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs font-medium text-foreground">
                        {c.sellerName}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        #{c.orderToken || c.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatMoney(c.orderTotal)}
                      </TableCell>
                      <TableCell
                        className={`font-mono text-xs font-bold ${
                          c.amountCents < 0 ? "text-rose-600" : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {formatMoney(c.amountCents)}
                        {c.amountCents < 0 && (
                          <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                            (Estorno)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.status === "paid" ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold">
                            Paga
                          </Badge>
                        ) : c.status === "cancelled" ? (
                          <Badge variant="outline" className="text-rose-600 border-rose-500/30 bg-rose-500/10 text-[10px] font-bold">
                            Cancelada
                          </Badge>
                        ) : c.amountCents < 0 ? (
                          <Badge variant="outline" className="text-rose-600 border-rose-500/30 bg-rose-500/10 text-[10px] font-bold">
                            Estorno Pendente
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 text-[10px] font-bold">
                            A Pagar
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={payingId === c.id}
                            onClick={() => handlePay(c.id, c.sellerName)}
                            className="h-8 rounded-xl text-xs font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                          >
                            <CheckCircle className="size-3.5 mr-1" />
                            {payingId === c.id ? "Quitando..." : "Pagar"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── ABA 2: EQUIPE, REGRAS & QUITAÇÃO EM LOTE ── */}
        <TabsContent value="equipe" className="space-y-4">
          <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-xs font-bold">Profissional / Vendedor</TableHead>
                  <TableHead className="text-xs font-bold">Cargo</TableHead>
                  <TableHead className="text-xs font-bold font-mono">Taxa Padrão (%)</TableHead>
                  <TableHead className="text-xs font-bold font-mono">Saldo Pendente</TableHead>
                  <TableHead className="text-right text-xs font-bold">Ações de Folha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum profissional ou vendedor cadastrado na equipe.
                    </TableCell>
                  </TableRow>
                ) : (
                  sellers.map((seller: any) => {
                    const pendingInfo = sellerPendingMap.get(seller.id) || sellerPendingMap.get(seller.full_name) || {
                      totalPendingCents: 0,
                      count: 0,
                    };
                    const isEditing = editingSellerId === seller.id;

                    return (
                      <TableRow key={seller.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium text-xs">
                          <div className="font-bold text-foreground">{seller.full_name || "Sem nome"}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{seller.email || "Sem e-mail"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-bold capitalize">
                            {seller.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 max-w-[120px]">
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="100"
                                value={editingRate}
                                onChange={(e) => setEditingRate(e.target.value)}
                                className="h-8 rounded-lg text-xs font-mono"
                                autoFocus
                              />
                              <span className="text-xs font-bold text-muted-foreground">%</span>
                            </div>
                          ) : (
                            <div className="font-mono font-bold text-xs flex items-center gap-1 text-foreground">
                              {seller.commission_rate ?? 5}%
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {pendingInfo.totalPendingCents > 0 ? (
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              {formatMoney(pendingInfo.totalPendingCents)} ({pendingInfo.count} vendas)
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Em dia</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingSellerId(null)}
                                  className="h-8 rounded-xl text-xs font-bold"
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveRate(seller.id)}
                                  className="h-8 rounded-xl text-xs font-bold bg-primary text-primary-foreground"
                                >
                                  Salvar
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingRate((seller.commission_rate ?? 5).toString());
                                    setEditingSellerId(seller.id);
                                  }}
                                  className="h-8 rounded-xl text-xs font-bold gap-1 text-muted-foreground hover:text-foreground"
                                >
                                  <Edit2 className="size-3.5" />
                                  <span>Regra</span>
                                </Button>

                                {pendingInfo.totalPendingCents > 0 && (
                                  <Button
                                    size="sm"
                                    disabled={payingSellerId === seller.id}
                                    onClick={() => handlePayAllForSeller(seller.id, seller.full_name)}
                                    className="h-8 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-2xs"
                                  >
                                    <CheckCircle2 className="size-3.5" />
                                    <span>
                                      {payingSellerId === seller.id ? "Quitando..." : "Quitar Folha"}
                                    </span>
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
