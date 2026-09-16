import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SheetPage } from "@/components/ui/sheet-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { EmptyState } from "@/components/state/states";
import {
  listEmployeesBalance,
  registerFinancialEvent,
  getEmployeeFinancialStatement,
} from "@/services/hr.functions";
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  FileSpreadsheet,
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileText,
  Loader2,
  Plus,
} from "lucide-react";
import { playCashRegisterSound, playWarningAlert } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/financeiro/funcionarios")({
  head: () => ({ meta: [{ title: "Folha & Vales da Equipe | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const data = await listEmployeesBalance();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("[loader:workspace.financeiro.funcionarios] Unhandled loader error:", err);
      return [];
    }
  },
  component: HrFinancePage,
});

function HrFinancePage() {
  const staffBalances = (Route.useLoaderData() as any[]) || [];
  const router = useRouter();

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Modal de Lançamento Manual
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [formData, setFormData] = useState({
    amount: "",
    type: "advance" as "advance" | "adjustment" | "commission" | "salary",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  // Gaveta de Extrato Detalhado do Colaborador
  const [statementEmpId, setStatementEmpId] = useState<string | null>(null);
  const [statementData, setStatementData] = useState<any | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // ── KPIS DE FOLHA ────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let totalToPayCents = 0;
    let totalAdvancesCents = 0;
    let totalAdjustmentsCents = 0;

    staffBalances.forEach((emp) => {
      if (emp.balanceCents > 0) {
        totalToPayCents += emp.balanceCents;
      }
      (emp.recentRecords || []).forEach((r: any) => {
        if (r.type === "advance") {
          totalAdvancesCents += Math.abs(r.amount_cents);
        } else if (r.type === "adjustment" || r.type === "commission") {
          totalAdjustmentsCents += Math.abs(r.amount_cents);
        }
      });
    });

    return {
      totalToPayCents,
      totalAdvancesCents,
      totalAdjustmentsCents,
      staffCount: staffBalances.length,
    };
  }, [staffBalances]);

  // ── FILTROS & BUSCA ──────────────────────────────────────────────────────
  const filteredStaff = useMemo(() => {
    return staffBalances.filter((emp) => {
      if (roleFilter !== "all" && emp.role !== roleFilter) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const name = (emp.name || "").toLowerCase();
        const role = (emp.role || "").toLowerCase();
        return name.includes(term) || role.includes(term);
      }

      return true;
    });
  }, [staffBalances, roleFilter, searchTerm]);

  // ── CARREGAR EXTRATO DO COLABORADOR ──────────────────────────────────────
  const handleOpenStatement = async (employeeId: string) => {
    setStatementEmpId(employeeId);
    setLoadingStatement(true);
    try {
      const res = await getEmployeeFinancialStatement({ data: { employeeId } });
      setStatementData(res);
    } catch {
      toast.error("Erro ao carregar extrato do colaborador.");
      setStatementEmpId(null);
    } finally {
      setLoadingStatement(false);
    }
  };

  // ── ABRIR MODAL DE LANÇAMENTO ────────────────────────────────────────────
  const handleOpenModal = (emp: any) => {
    setSelectedEmp(emp);
    setFormData({ amount: "", type: "advance", description: "" });
    setModalOpen(true);
  };

  // ── SUBMIT LANÇAMENTO ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const amountCents = Math.round(parseFloat(formData.amount.replace(",", ".")) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error("Insira um valor válido maior que zero.");
      return;
    }
    if (formData.description.length < 3) {
      toast.error("Insira uma descrição válida com pelo menos 3 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await registerFinancialEvent({
        data: {
          employeeId: selectedEmp.id,
          amountCents,
          type: formData.type,
          description: formData.description,
        },
      });

      if (formData.type === "adjustment" || formData.type === "commission" || formData.type === "salary") {
        playCashRegisterSound();
        toast.success(`Crédito de ${formatMoney(amountCents)} lançado com sucesso!`);
      } else {
        playWarningAlert();
        toast.info(`Vale/Adiantamento de ${formatMoney(amountCents)} registrado com sucesso!`);
      }

      setModalOpen(false);
      router.invalidate();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao registrar evento financeiro");
    } finally {
      setLoading(false);
    }
  };

  // ── EXPORTAR CSV DA FOLHA ────────────────────────────────────────────────
  const handleExportCsv = () => {
    if (filteredStaff.length === 0) {
      toast.info("Nenhum colaborador na folha para exportar.");
      return;
    }

    const headers = ["ID", "Colaborador", "Cargo", "Saldo a Receber (R$)", "Status"];
    const rows = filteredStaff.map((emp) => [
      emp.id,
      `"${emp.name}"`,
      emp.role,
      (emp.balanceCents / 100).toFixed(2),
      emp.balanceCents > 0 ? "A Pagar" : emp.balanceCents < 0 ? "Devedor (Vales)" : "Zerado",
    ].join(";"));

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `folha_pagamento_equipe_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Folha de pagamento exportada em CSV com sucesso!");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Financeiro"
        title="Folha de Pagamento, Vales & Comissões da Equipe"
        description="Acompanhe saldos líquidos da equipe, controle adiantamentos (vales) e emita o extrato individual para cada colaborador."
        actions={
          <Button
            onClick={handleExportCsv}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold h-9 gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            <span>Exportar Folha CSV</span>
          </Button>
        }
      />

      {/* ── KPIS CONSOLIDADOS DE FOLHA ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="size-3.5 text-primary" />
            Total Líquido a Pagar
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(kpis.totalToPayCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Saldos positivos a transferir
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ArrowDownRight className="size-3.5 text-rose-600" />
            Total Vales Concedidos (-)
          </span>
          <div className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400">
            -{formatMoney(kpis.totalAdvancesCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Adiantamentos e retiradas da folha
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpRight className="size-3.5 text-emerald-600" />
            Bônus & Ajustes (+)
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            +{formatMoney(kpis.totalAdjustmentsCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Gratificações e comissões avulsas
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="size-3.5 text-foreground" />
            Colaboradores na Folha
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {kpis.staffCount}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Membros ativos cadastrados
          </p>
        </div>
      </div>

      {/* ── BARRA DE CONTROLE & BUSCA ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou cargo..."
            className="pl-10 h-10 rounded-xl text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRoleFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              roleFilter === "all"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos ({staffBalances.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("seller")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              roleFilter === "seller"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Vendedores ({staffBalances.filter((s) => s.role === "seller").length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("manager")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              roleFilter === "manager"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Gerentes ({staffBalances.filter((s) => s.role === "manager").length})
          </button>
        </div>
      </div>

      {/* ── LISTAGEM DE COLABORADORES ── */}
      {filteredStaff.length === 0 ? (
        <EmptyState
          title="Nenhum colaborador encontrado"
          description="Nenhum colaborador corresponde aos filtros ou termos pesquisados."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredStaff.map((emp: any) => (
            <div
              key={emp.id}
              className="bg-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0 border border-primary/20">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{emp.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] font-bold capitalize">
                      {emp.role}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {emp.recentRecords?.length || 0} lançamento(s) recente(s)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-border/40">
                <div className="text-left md:text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Saldo Atual a Receber</p>
                  <p
                    className={`text-xl font-mono font-bold ${
                      emp.balanceCents > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : emp.balanceCents < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatMoney(emp.balanceCents)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenStatement(emp.id)}
                    className="rounded-xl text-xs font-bold h-9 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <FileText className="size-3.5" />
                    <span>Extrato</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleOpenModal(emp)}
                    className="rounded-xl text-xs font-bold h-9 gap-1.5 bg-primary text-primary-foreground cursor-pointer shadow-2xs"
                  >
                    <Plus className="size-3.5" />
                    <span>Lançar Vale / Bônus</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── GAVETA DE EXTRATO DETALHADO DO COLABORADOR ── */}
      <SheetPage
        open={!!statementEmpId}
        onOpenChange={(open) => !open && setStatementEmpId(null)}
        title="Extrato Financeiro do Colaborador"
        size="lg"
      >
        {loadingStatement ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <span className="text-xs font-mono">Carregando extrato completo...</span>
          </div>
        ) : statementData ? (
          <div className="space-y-6 py-4">
            {/* Header Colaborador */}
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-muted/40 border border-border/60">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0 border border-primary/20">
                {statementData.employee.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground">{statementData.employee.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px] font-bold capitalize">
                    {statementData.employee.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">{statementData.employee.email}</span>
                </div>
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-border/70 bg-card space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Créditos (+)</span>
                <div className="text-sm font-mono font-bold text-emerald-600">
                  +{formatMoney(statementData.summary.totalCreditsCents)}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-card space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Vales / Débitos (-)</span>
                <div className="text-sm font-mono font-bold text-rose-600">
                  -{formatMoney(statementData.summary.totalDebitsCents)}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-card space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Saldo Líquido</span>
                <div className={`text-sm font-mono font-bold ${
                  statementData.summary.netBalanceCents > 0
                    ? "text-emerald-600"
                    : statementData.summary.netBalanceCents < 0
                    ? "text-rose-600"
                    : "text-muted-foreground"
                }`}>
                  {formatMoney(statementData.summary.netBalanceCents)}
                </div>
              </div>
            </div>

            {/* Tabela de Lançamentos */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Histórico de Lançamentos ({statementData.records?.length || 0})
              </h5>

              <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="text-[11px] font-bold">Data/Hora</TableHead>
                      <TableHead className="text-[11px] font-bold">Tipo</TableHead>
                      <TableHead className="text-[11px] font-bold">Descrição / Motivo</TableHead>
                      <TableHead className="text-right text-[11px] font-bold font-mono">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(statementData.records || []).map((r: any) => (
                      <TableRow key={r.id} className="border-border/40 text-xs">
                        <TableCell className="font-mono text-muted-foreground text-[11px]">
                          {formatDateTime(r.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-bold ${
                            r.amount_cents > 0
                              ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                              : "text-rose-600 border-rose-500/30 bg-rose-500/10"
                          }`}>
                            {r.type === "advance"
                              ? "Vale / Adiantamento"
                              : r.type === "commission"
                              ? "Comissão"
                              : r.type === "salary"
                              ? "Salário Base"
                              : "Ajuste / Bônus"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {r.description}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold ${
                          r.amount_cents > 0 ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {r.amount_cents > 0 ? "+" : "-"}
                          {formatMoney(Math.abs(r.amount_cents))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(statementData.records || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                          Nenhum lançamento registrado para este colaborador.
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

      {/* ── MODAL DE NOVO LANÇAMENTO (VALE OU BÔNUS) ── */}
      <SheetPage
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Lançamento de Folha & Vales"
        description={`Registrando lançamento para ${selectedEmp?.name || "colaborador"}`}
        size="default"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={loading} className="rounded-xl text-xs font-bold">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
              {loading ? "Registrando..." : "Confirmar Lançamento"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Tipo de Lançamento</Label>
            <Select
              value={formData.type}
              onValueChange={(v: any) => setFormData((prev) => ({ ...prev, type: v }))}
            >
              <SelectTrigger className="h-10 rounded-xl text-xs">
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="advance">
                  <div className="flex items-center text-rose-600 font-medium text-xs">
                    <ArrowDownRight className="w-4 h-4 mr-2" /> Vale / Adiantamento (Débito da Folha)
                  </div>
                </SelectItem>
                <SelectItem value="adjustment">
                  <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                    <ArrowUpRight className="w-4 h-4 mr-2" /> Bônus / Gratificação (Crédito na Folha)
                  </div>
                </SelectItem>
                <SelectItem value="commission">
                  <div className="flex items-center text-primary font-medium text-xs">
                    <ArrowUpRight className="w-4 h-4 mr-2" /> Comissão Avulsa (Crédito)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Ex: 150.00"
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
              className="h-10 rounded-xl font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Descrição / Motivo</Label>
            <Input
              placeholder="Ex: Adiantamento para transporte, bônus meta..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="h-10 rounded-xl text-xs"
            />
          </div>
        </div>
      </SheetPage>
    </div>
  );
}
