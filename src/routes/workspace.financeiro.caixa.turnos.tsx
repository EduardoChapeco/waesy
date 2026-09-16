import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { formatDateTime } from "@/lib/datetime";
import {
  History,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  User,
  Banknote,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SheetPage } from "@/components/ui/sheet-page";
import { EmptyState } from "@/components/state/states";
import {
  listRegisterHistory,
  getRegisterShiftDetails,
} from "@/services/cash.functions";
import type { CashRegisterHistoryItem, CashRegisterStatus } from "@/lib/cash";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/financeiro/caixa/turnos")({
  head: () => ({ meta: [{ title: "Auditoria de Turnos de Caixa | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const data = await listRegisterHistory();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("[loader:workspace.financeiro.caixa.turnos] Unhandled error:", err);
      return [];
    }
  },
  component: ShiftsPage,
});

function ShiftsPage() {
  const initialShifts = (Route.useLoaderData() as CashRegisterHistoryItem[]) || [];
  const [shifts] = useState<CashRegisterHistoryItem[]>(initialShifts);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed" | "discrepancy">("all");

  // Auditoria do Turno (Drawer State)
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [shiftDetails, setShiftDetails] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // ── KPIS CONSOLIDADOS ────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let totalIncomeCents = 0;
    let totalExpenseCents = 0;
    let totalDiscrepancyCents = 0;
    let discrepancyCount = 0;

    shifts.forEach((s) => {
      totalIncomeCents += s.incomeCents || 0;
      totalExpenseCents += s.expenseCents || 0;

      const expected = s.initial_balance_cents + s.incomeCents - s.expenseCents;
      if (s.final_balance_cents !== null) {
        const diff = s.final_balance_cents - expected;
        totalDiscrepancyCents += diff;
        if (diff !== 0) discrepancyCount += 1;
      }
    });

    return {
      totalShifts: shifts.length,
      totalIncomeCents,
      totalExpenseCents,
      totalDiscrepancyCents,
      discrepancyCount,
    };
  }, [shifts]);

  // ── FILTROS & BUSCA ──────────────────────────────────────────────────────
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const operator = (s.opened_by_profile?.full_name || "").toLowerCase();
        const notes = (s.notes || "").toLowerCase();
        const id = s.id.toLowerCase();
        return operator.includes(term) || notes.includes(term) || id.includes(term);
      }

      return true;
    });
  }, [shifts, statusFilter, searchTerm]);

  // ── ABRIR AUDITORIA DE TURNO ─────────────────────────────────────────────
  const handleOpenAudit = async (shiftId: string) => {
    setSelectedShiftId(shiftId);
    setIsLoadingDetails(true);
    try {
      const details = await getRegisterShiftDetails({ data: { registerId: shiftId } });
      setShiftDetails(details);
    } catch {
      toast.error("Erro ao carregar detalhes do turno.");
      setSelectedShiftId(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // ── EXPORTAR CSV CONTÁBIL ────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredShifts.length === 0) {
      toast.info("Nenhum turno para exportar.");
      return;
    }

    const headers = [
      "ID Turno",
      "Abertura",
      "Operador Abertura",
      "Fechamento",
      "Fundo Inicial (R$)",
      "Entradas (R$)",
      "Saidas (R$)",
      "Saldo Esperado (R$)",
      "Saldo Apurado (R$)",
      "Diferenca (R$)",
      "Status",
    ];

    const rows = filteredShifts.map((s) => {
      const expected = s.initial_balance_cents + s.incomeCents - s.expenseCents;
      const diff = s.final_balance_cents !== null ? s.final_balance_cents - expected : 0;

      return [
        s.id,
        s.opened_at,
        `"${s.opened_by_profile?.full_name || "Desconhecido"}"`,
        s.closed_at || "Aberto",
        (s.initial_balance_cents / 100).toFixed(2),
        (s.incomeCents / 100).toFixed(2),
        (s.expenseCents / 100).toFixed(2),
        (expected / 100).toFixed(2),
        s.final_balance_cents !== null ? (s.final_balance_cents / 100).toFixed(2) : "-",
        s.final_balance_cents !== null ? (diff / 100).toFixed(2) : "-",
        s.status,
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `relatorio-turnos-caixa-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Relatório de turnos exportado em CSV com sucesso!");
  };

  const getStatusBadge = (status: CashRegisterStatus) => {
    switch (status) {
      case "open":
        return <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold">Aberto</Badge>;
      case "closed":
        return <Badge variant="secondary" className="text-[10px] font-bold">Fechado</Badge>;
      case "discrepancy":
        return <Badge variant="outline" className="text-rose-600 border-rose-500/30 bg-rose-500/10 text-[10px] font-bold">Com Quebra</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        <Link to="/workspace/financeiro/caixa" className="hover:underline font-semibold">
          Voltar ao Painel do Caixa
        </Link>
      </div>

      <PageHeader
        eyebrow="Financeiro"
        title="Histórico de Turnos & Fechamentos"
        description="Auditoria fiscal de caixas, conciliação cega de gaveta, quebras e conferência de suprimentos e sangrias."
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

      {/* ── KPIS FINANCEIROS DE TURNOS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <History className="size-3.5 text-foreground" />
            Turnos Registrados
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {kpis.totalShifts}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Histórico completo da loja
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ArrowDownLeft className="size-3.5 text-emerald-600" />
            Total Entradas (+)
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            +{formatMoney(kpis.totalIncomeCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Vendas e suprimentos apurados
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpRight className="size-3.5 text-rose-600" />
            Total Saídas (-)
          </span>
          <div className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400">
            -{formatMoney(kpis.totalExpenseCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Sangrias e retiradas de gaveta
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className={`size-3.5 ${kpis.totalDiscrepancyCents === 0 ? "text-muted-foreground" : "text-amber-500"}`} />
            Divergência Líquida
          </span>
          <div className={`text-2xl font-mono font-bold ${
            kpis.totalDiscrepancyCents === 0
              ? "text-muted-foreground"
              : kpis.totalDiscrepancyCents > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}>
            {kpis.totalDiscrepancyCents > 0 ? "+" : ""}
            {formatMoney(kpis.totalDiscrepancyCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {kpis.discrepancyCount} turno(s) com diferença
          </p>
        </div>
      </div>

      {/* ── BARRA DE CONTROLE, FILTROS & BUSCA ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por operador ou notas..."
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
            Todos ({shifts.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("open")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "open"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Abertos ({shifts.filter((s) => s.status === "open").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("closed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "closed"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Fechados ({shifts.filter((s) => s.status === "closed").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("discrepancy")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "discrepancy"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Com Diferença ({shifts.filter((s) => s.status === "discrepancy").length})
          </button>
        </div>
      </div>

      {/* ── TABELA DE AUDITORIA DE TURNOS ── */}
      {filteredShifts.length === 0 ? (
        <EmptyState
          title="Nenhum turno localizado"
          description="Nenhum registro de turno atende aos critérios de busca selecionados."
        />
      ) : (
        <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-xs font-bold">Abertura</TableHead>
                  <TableHead className="text-xs font-bold">Operador</TableHead>
                  <TableHead className="text-xs font-bold">Fechamento</TableHead>
                  <TableHead className="text-right text-xs font-bold font-mono">Fundo Inicial</TableHead>
                  <TableHead className="text-right text-xs font-bold font-mono">Entradas (+)</TableHead>
                  <TableHead className="text-right text-xs font-bold font-mono">Saídas (-)</TableHead>
                  <TableHead className="text-right text-xs font-bold font-mono">Esperado</TableHead>
                  <TableHead className="text-right text-xs font-bold font-mono">Apurado</TableHead>
                  <TableHead className="text-right text-xs font-bold font-mono">Diferença</TableHead>
                  <TableHead className="text-center text-xs font-bold">Status</TableHead>
                  <TableHead className="text-right text-xs font-bold">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShifts.map((s: CashRegisterHistoryItem) => {
                  const expectedValue = s.initial_balance_cents + s.incomeCents - s.expenseCents;
                  const discrepancyValue =
                    s.final_balance_cents !== null ? s.final_balance_cents - expectedValue : 0;

                  return (
                    <TableRow
                      key={s.id}
                      className="border-border/40 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleOpenAudit(s.id)}
                    >
                      <TableCell className="text-xs font-mono">
                        {formatDateTime(s.opened_at)}
                      </TableCell>
                      <TableCell
                        className="font-medium text-xs max-w-[130px] truncate"
                        title={s.opened_by_profile?.full_name || "Operador"}
                      >
                        {s.opened_by_profile?.full_name || "Operador"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {s.closed_at ? formatDateTime(s.closed_at) : <span className="text-emerald-600 font-bold">Em Aberto</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {formatMoney(s.initial_balance_cents)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-mono text-xs font-semibold">
                        +{formatMoney(s.incomeCents)}
                      </TableCell>
                      <TableCell className="text-right text-rose-600 font-mono text-xs font-semibold">
                        -{formatMoney(s.expenseCents)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium">
                        {formatMoney(expectedValue)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">
                        {s.final_balance_cents !== null ? formatMoney(s.final_balance_cents) : "-"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs font-bold ${
                          discrepancyValue === 0
                            ? "text-muted-foreground"
                            : discrepancyValue > 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {s.final_balance_cents !== null
                          ? `${discrepancyValue > 0 ? "+" : ""}${formatMoney(discrepancyValue)}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(s.status)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenAudit(s.id)}
                          className="h-8 px-2.5 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                        >
                          <Eye className="size-3.5" />
                          <span>Auditar</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── GAVETA DE AUDITORIA DE TURNO (SHEETPAGE) ── */}
      <SheetPage
        open={!!selectedShiftId}
        onOpenChange={(open) => !open && setSelectedShiftId(null)}
        title="Auditoria & Conciliação de Turno"
        size="lg"
      >
        {isLoadingDetails ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <span className="text-xs font-mono">Carregando movimentações do turno...</span>
          </div>
        ) : shiftDetails ? (
          <div className="space-y-6 py-4">
            {/* Cabeçalho do Turno */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Operador Abertura</span>
                <span className="font-bold text-foreground">
                  {shiftDetails.opened_by_profile?.full_name || "Desconhecido"}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground block mt-0.5">
                  {formatDateTime(shiftDetails.opened_at)}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Operador Fechamento</span>
                <span className="font-bold text-foreground">
                  {shiftDetails.closed_by_profile?.full_name || (shiftDetails.closed_at ? "Mesmo Operador" : "Em Aberto")}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground block mt-0.5">
                  {shiftDetails.closed_at ? formatDateTime(shiftDetails.closed_at) : "Aguardando Fechamento"}
                </span>
              </div>
            </div>

            {/* Balanço Financeiro do Turno */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-border/70 bg-card space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Fundo Inicial</span>
                <div className="text-sm font-mono font-bold text-foreground">
                  {formatMoney(shiftDetails.initial_balance_cents)}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-card space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Entradas (+)</span>
                <div className="text-sm font-mono font-bold text-emerald-600">
                  +{formatMoney(shiftDetails.incomeCents || 0)}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-card space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Saídas (-)</span>
                <div className="text-sm font-mono font-bold text-rose-600">
                  -{formatMoney(shiftDetails.expenseCents || 0)}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-card space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Saldo Esperado</span>
                <div className="text-sm font-mono font-bold text-foreground">
                  {formatMoney(shiftDetails.initial_balance_cents + (shiftDetails.incomeCents || 0) - (shiftDetails.expenseCents || 0))}
                </div>
              </div>
            </div>

            {/* Conferência Cega e Quebra */}
            {shiftDetails.final_balance_cents !== null && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Valor Apurado no Fechamento Cego:</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    {formatMoney(shiftDetails.final_balance_cents)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2">
                  <span className="font-bold text-muted-foreground">Quebra / Diferença de Caixa:</span>
                  <span className={`font-mono font-bold text-sm ${
                    shiftDetails.final_balance_cents - (shiftDetails.initial_balance_cents + (shiftDetails.incomeCents || 0) - (shiftDetails.expenseCents || 0)) === 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}>
                    {formatMoney(shiftDetails.final_balance_cents - (shiftDetails.initial_balance_cents + (shiftDetails.incomeCents || 0) - (shiftDetails.expenseCents || 0)))}
                  </span>
                </div>
              </div>
            )}

            {/* Movimentações do Turno */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Movimentações do Turno ({shiftDetails.entries?.length || 0})
                </h4>
              </div>

              <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="text-[11px] font-bold">Horário</TableHead>
                      <TableHead className="text-[11px] font-bold">Tipo</TableHead>
                      <TableHead className="text-[11px] font-bold">Descrição / Canal</TableHead>
                      <TableHead className="text-right text-[11px] font-bold font-mono">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(shiftDetails.entries || []).map((entry: any) => (
                      <TableRow key={entry.id} className="border-border/40 text-xs">
                        <TableCell className="font-mono text-muted-foreground text-[11px]">
                          {formatDateTime(entry.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-bold ${
                            entry.entry_type === "sale" || entry.entry_type === "supply"
                              ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                              : "text-rose-600 border-rose-500/30 bg-rose-500/10"
                          }`}>
                            {entry.entry_type === "sale"
                              ? "Venda"
                              : entry.entry_type === "supply"
                              ? "Suprimento (+)"
                              : entry.entry_type === "bleed"
                              ? "Sangria (-)"
                              : "Despesa (-)"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground truncate max-w-[150px]">
                          {entry.notes || (entry.channel ? `Canal: ${entry.channel}` : "Lançamento")}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold ${
                          entry.entry_type === "sale" || entry.entry_type === "supply"
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}>
                          {entry.entry_type === "sale" || entry.entry_type === "supply" ? "+" : "-"}
                          {formatMoney(entry.amount_cents)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(shiftDetails.entries || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                          Nenhuma movimentação avulsa registrada no turno.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : null}
      </SheetPage>
    </div>
  );
}
