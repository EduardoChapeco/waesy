import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Copy,
  Check,
  Calendar,
  Building2,
  Zap,
  Tag,
  Briefcase,
  Layers,
  Receipt,
  Trash2,
  TrendingDown,
  DollarSign,
  Landmark,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/commerce/page-header";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { SheetPage } from "@/components/ui/sheet-page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listFinancialObligations,
  createFinancialObligation,
  markObligationAsPaid,
  deleteFinancialObligation,
  exportObligationsCsv,
  type FinancialObligation,
  type ObligationCategory,
  type ObligationStatus,
} from "@/services/financial-obligations.functions";
import { formatMoney } from "@/lib/money";
import { playCashRegisterSound, playWarningAlert } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/financeiro/contas-pagar")({
  head: () => ({ meta: [{ title: "Contas a Pagar & Despesas | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const obligations = await listFinancialObligations();
      return { obligations: Array.isArray(obligations) ? obligations : [] };
    } catch (err) {
      console.error("[loader:workspace.financeiro.contas-pagar] Unhandled error:", err);
      return { obligations: [] };
    }
  },
  component: ContasPagarPage,
});

const CATEGORY_LABELS: Record<ObligationCategory, { label: string; icon: any; color: string }> = {
  supplier: { label: "Fornecedor", icon: Briefcase, color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  rent: { label: "Aluguel & Imóvel", icon: Building2, color: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
  utilities: { label: "Água / Luz / Net", icon: Zap, color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  payroll: { label: "Folha / Equipe", icon: Layers, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  tax: { label: "Tributos & DAS", icon: Landmark, color: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
  marketing: { label: "Marketing / Ads", icon: Tag, color: "text-pink-600 bg-pink-500/10 border-pink-500/20" },
  software: { label: "Software / SaaS", icon: Receipt, color: "text-cyan-600 bg-cyan-500/10 border-cyan-500/20" },
  other: { label: "Outras Despesas", icon: DollarSign, color: "text-zinc-600 bg-zinc-500/10 border-zinc-500/20" },
};

function ContasPagarPage() {
  const router = useRouter();
  const loaderData = Route.useLoaderData() as { obligations: FinancialObligation[] };
  const [obligations, setObligations] = useState<FinancialObligation[]>(loaderData.obligations || []);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ObligationStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ObligationCategory>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sheet de Cadastro de Nova Conta
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [newAmountReal, setNewAmountReal] = useState("");
  const [newDueDate, setNewDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newCategory, setNewCategory] = useState<ObligationCategory>("supplier");
  const [newRecurrence, setNewRecurrence] = useState<"none" | "monthly" | "weekly" | "yearly">("none");
  const [newBarcode, setNewBarcode] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Sheet de Baixa / Pagamento
  const [payModal, setPayModal] = useState<{ isOpen: boolean; obligation: FinancialObligation | null }>({
    isOpen: false,
    obligation: null,
  });
  const [payMethod, setPayMethod] = useState("pix");
  const [payNotes, setPayNotes] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // ── KPIS FINANCEIROS ─────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let pendingCents = 0;
    let pendingCount = 0;
    let overdueCents = 0;
    let overdueCount = 0;
    let todayCents = 0;
    let todayCount = 0;
    let paidCents = 0;
    let paidCount = 0;

    obligations.forEach((ob) => {
      if (ob.status === "paid") {
        paidCents += ob.amount_cents;
        paidCount += 1;
      } else if (ob.status === "cancelled") {
        // Ignora canceladas
      } else {
        // Pendente ou Vencido
        pendingCents += ob.amount_cents;
        pendingCount += 1;

        if (ob.due_date < today) {
          overdueCents += ob.amount_cents;
          overdueCount += 1;
        } else if (ob.due_date === today) {
          todayCents += ob.amount_cents;
          todayCount += 1;
        }
      }
    });

    return {
      pendingCents,
      pendingCount,
      overdueCents,
      overdueCount,
      todayCents,
      todayCount,
      paidCents,
      paidCount,
      totalCount: obligations.length,
    };
  }, [obligations, today]);

  // ── FILTRAGEM DINÂMICA ───────────────────────────────────────────────────
  const filteredObligations = useMemo(() => {
    return obligations.filter((ob) => {
      // Filtro Status
      if (statusFilter !== "all" && ob.status !== statusFilter) return false;

      // Filtro Categoria
      if (categoryFilter !== "all" && ob.category !== categoryFilter) return false;

      // Busca por texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = ob.title.toLowerCase().includes(term);
        const matchSupplier = ob.supplier_name.toLowerCase().includes(term);
        const matchNotes = (ob.notes || "").toLowerCase().includes(term);
        const matchBarcode = (ob.barcode || "").includes(term);
        return matchTitle || matchSupplier || matchNotes || matchBarcode;
      }

      return true;
    });
  }, [obligations, statusFilter, categoryFilter, searchTerm]);

  // ── CÓPIA DE CÓDIGO DE BARRAS / PIX ──────────────────────────────────────
  const handleCopyBarcode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Linha digitável / Código Pix copiado para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  // ── EXPORTAÇÃO CSV ───────────────────────────────────────────────────────
  const handleExportCsv = async () => {
    try {
      const res = await exportObligationsCsv();
      if (!res.csv) {
        toast.info("Nenhuma conta para exportar.");
        return;
      }

      const blob = new Blob(["\uFEFF" + res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      playCashRegisterSound();
      toast.success("Relatório de contas a pagar exportado com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao exportar CSV.");
    }
  };

  // ── CADASTRO DE NOVA CONTA ───────────────────────────────────────────────
  const handleCreateObligation = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReal = newAmountReal.replace(",", ".");
    const valFloat = parseFloat(cleanReal);
    if (isNaN(valFloat) || valFloat <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }
    const amountCents = Math.round(valFloat * 100);

    if (!newTitle.trim()) {
      toast.error("Informe a descrição ou título da conta.");
      return;
    }
    if (!newSupplier.trim()) {
      toast.error("Informe o fornecedor ou favorecido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createFinancialObligation({
        data: {
          title: newTitle,
          supplier_name: newSupplier,
          amount_cents: amountCents,
          due_date: newDueDate,
          category: newCategory,
          recurrence: newRecurrence,
          barcode: newBarcode || undefined,
          notes: newNotes || undefined,
        },
      });

      setObligations((prev) => [created, ...prev]);
      setIsCreateOpen(false);
      resetForm();
      playCashRegisterSound();
      toast.success("Conta a pagar registrada com sucesso!");
      router.invalidate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar conta a pagar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewTitle("");
    setNewSupplier("");
    setNewAmountReal("");
    setNewDueDate(new Date().toISOString().slice(0, 10));
    setNewCategory("supplier");
    setNewRecurrence("none");
    setNewBarcode("");
    setNewNotes("");
  };

  // ── BAIXA / LIQUIDAÇÃO ───────────────────────────────────────────────────
  const handleConfirmPay = async () => {
    if (!payModal.obligation) return;
    setIsPaying(true);
    try {
      const updated = await markObligationAsPaid({
        data: {
          obligationId: payModal.obligation.id,
          paymentMethod: payMethod,
          paidAt: new Date().toISOString(),
          notes: payNotes || undefined,
        },
      });

      setObligations((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setPayModal({ isOpen: false, obligation: null });
      setPayNotes("");
      playCashRegisterSound();
      toast.success(`Conta "${updated.title}" liquidada com sucesso!`);
      router.invalidate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao liquidar conta.");
    } finally {
      setIsPaying(false);
    }
  };

  // ── EXCLUSÃO ─────────────────────────────────────────────────────────────
  const handleDelete = async (id: string, title: string) => {
    try {
      await deleteFinancialObligation({ data: { obligationId: id } });
      setObligations((prev) => prev.filter((item) => item.id !== id));
      playWarningAlert();
      toast.info(`Conta "${title}" removida.`);
      router.invalidate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover conta.");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Financeiro"
        title="Contas a Pagar"
        description="Controle despesas fixas, boletos de fornecedores, impostos e aluguéis com previsão de saída e conciliação financeira."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportCsv}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold h-9 gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Exportar CSV</span>
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              size="sm"
              className="rounded-xl text-xs font-bold h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
            >
              <Plus className="size-3.5" />
              <span>Nova Conta</span>
            </Button>
          </div>
        }
      />

      {/* ── BANNER DE ALERTA DE VENCIMENTO EM ATRASO ── */}
      {kpis.overdueCount > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-rose-600" />
            <span>
              <strong>Atenção:</strong> Você possui <strong>{kpis.overdueCount} conta(s) em atraso</strong> totalizando{" "}
              <strong>{formatMoney(kpis.overdueCents)}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter("overdue")}
            className="text-[11px] font-bold underline hover:opacity-80 cursor-pointer"
          >
            Filtrar Atrasadas
          </button>
        </div>
      )}

      {/* ── KPIS NO PARADIGMA CLEAN ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="size-3.5 text-blue-600" />
            Total a Pagar Previsto
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {formatMoney(kpis.pendingCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {kpis.pendingCount} títulos em aberto
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="size-3.5 text-amber-500" />
            Vence Hoje
          </span>
          <div className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
            {formatMoney(kpis.todayCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {kpis.todayCount > 0 ? `${kpis.todayCount} compromisso(s) para quitar hoje` : "Nenhum boleto para hoje"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-rose-600" />
            Em Atraso / Vencidas
          </span>
          <div className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400">
            {formatMoney(kpis.overdueCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {kpis.overdueCount > 0 ? `${kpis.overdueCount} título(s) vencido(s)` : "Em dia com os fornecedores"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Total Liquidado
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(kpis.paidCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {kpis.paidCount} pagamentos realizados
          </p>
        </div>
      </div>

      {/* ── BARRA DE CONTROLE, BUSCA & FILTROS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por fornecedor, título ou código..."
            className="pl-10 h-10 rounded-xl text-xs bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de Categoria */}
          <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val as any)}>
            <SelectTrigger className="rounded-xl h-9 text-xs w-[160px] bg-background">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="rounded-xl text-xs">
              <SelectItem value="all">Todas Categorias</SelectItem>
              <SelectItem value="supplier">Fornecedores</SelectItem>
              <SelectItem value="rent">Aluguel & Imóvel</SelectItem>
              <SelectItem value="utilities">Água/Luz/Internet</SelectItem>
              <SelectItem value="payroll">Folha / Equipe</SelectItem>
              <SelectItem value="tax">Tributos & DAS</SelectItem>
              <SelectItem value="marketing">Marketing / Ads</SelectItem>
              <SelectItem value="software">Software / SaaS</SelectItem>
              <SelectItem value="other">Outras</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro de Status */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === "all"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas ({obligations.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === "pending"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              A Vencer ({obligations.filter((o) => o.status === "pending").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("overdue")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === "overdue"
                  ? "bg-background text-foreground shadow-2xs text-rose-600"
                  : "text-rose-600/70 hover:text-rose-600"
              }`}
            >
              Atrasadas ({kpis.overdueCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("paid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === "paid"
                  ? "bg-background text-foreground shadow-2xs text-emerald-600"
                  : "text-emerald-600/70 hover:text-emerald-600"
              }`}
            >
              Pagas ({kpis.paidCount})
            </button>
          </div>
        </div>
      </div>

      {/* ── TABELA DE OBRIGAÇÕES A PAGAR ── */}
      {filteredObligations.length === 0 ? (
        <EmptyState
          title="Nenhuma conta a pagar encontrada"
          description="Você está em dia com os seus compromissos ou nenhum lançamento atende aos filtros atuais."
          action={
            <Button
              onClick={() => setIsCreateOpen(true)}
              size="sm"
              className="rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground"
            >
              <Plus className="size-3.5 mr-1" />
              Cadastrar Primeira Conta
            </Button>
          }
        />
      ) : (
        <>
          {/* ── VISUALIZAÇÃO MOBILE: CARDS VERTICAIS ERGONÔMICOS (block md:hidden) ── */}
          <div className="block md:hidden space-y-3">
            {filteredObligations.map((ob) => {
              const catInfo = CATEGORY_LABELS[ob.category] || CATEGORY_LABELS.other;
              const CatIcon = catInfo.icon;
              const isPaid = ob.status === "paid";
              const isOverdue = ob.status === "overdue";
              const isToday = ob.due_date === today && !isPaid;

              return (
                <div
                  key={ob.id}
                  className="rounded-2xl border border-border/70 bg-card p-4 space-y-3.5 shadow-2xs"
                >
                  {/* Topo do Card: Categoria, Recorrência e Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border shrink-0 ${catInfo.color}`}>
                        <CatIcon className="size-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        {catInfo.label}
                      </span>
                      {ob.recurrence !== "none" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                          {ob.recurrence === "monthly" ? "Mensal" : ob.recurrence === "weekly" ? "Semanal" : "Anual"}
                        </Badge>
                      )}
                    </div>

                    <div>
                      {isPaid ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[11px] font-bold px-2 py-0.5">
                          Liquidado
                        </Badge>
                      ) : isOverdue ? (
                        <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[11px] font-bold px-2 py-0.5 animate-pulse">
                          Vencido
                        </Badge>
                      ) : isToday ? (
                        <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[11px] font-bold px-2 py-0.5">
                          Vence Hoje
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] text-muted-foreground font-mono px-2 py-0.5">
                          No prazo
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Título da Obrigação */}
                  <div>
                    <h3 className="font-bold text-base text-foreground leading-snug">
                      {ob.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Building2 className="size-3 shrink-0" />
                      <span className="truncate">{ob.supplier_name || "Favorecido não informado"}</span>
                    </p>
                  </div>

                  {/* Vencimento e Valor */}
                  <div className="flex items-baseline justify-between pt-2 border-t border-border/30">
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-muted-foreground block">Data de Vencimento</span>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {ob.due_date.split("-").reverse().join("/")}
                      </span>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span className="text-[11px] text-muted-foreground block">Valor</span>
                      <span className="text-xl font-mono font-black text-foreground">
                        {formatMoney(ob.amount_cents)}
                      </span>
                    </div>
                  </div>

                  {/* Código de Barras / Linha Digitável */}
                  {ob.barcode && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleCopyBarcode(ob.id, ob.barcode!)}
                      className="h-10 w-full rounded-xl text-xs font-mono gap-1.5 border-dashed border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {copiedId === ob.id ? (
                        <>
                          <Check className="size-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Linha Digitável Copiada</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span className="truncate">Copiar Linha Digitável / Pix</span>
                        </>
                      )}
                    </Button>
                  )}

                  {/* Ações Rápidas com Touch Ergonomic (44px) */}
                  <div className="flex items-center gap-2 pt-1">
                    {!isPaid ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setPayModal({ isOpen: true, obligation: ob })}
                        className="h-11 flex-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer shadow-2xs"
                      >
                        <CheckCircle2 className="size-4" />
                        <span>Dar Baixa / Pagar</span>
                      </Button>
                    ) : (
                      <div className="h-11 flex-1 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center gap-1.5 text-emerald-600 text-xs font-semibold">
                        <CheckCircle2 className="size-4" />
                        <span>Pago em {ob.paid_at ? ob.paid_at.slice(0, 10).split("-").reverse().join("/") : "dia"}</span>
                      </div>
                    )}

                    <CrudActionsMenu
                      triggerVariant="outline"
                      triggerClassName="size-11 shrink-0 rounded-xl border-border/70 hover:bg-muted"
                      onDelete={() => handleDelete(ob.id, ob.title)}
                      deleteTitle={`Remover conta "${ob.title}"?`}
                      deleteDescription="A obrigação financeira será excluída do fluxo de caixa e não poderá ser recuperada."
                      customActions={[
                        ...(ob.barcode
                          ? [
                              {
                                label: "Copiar Linha Digitável / Pix",
                                icon: Copy,
                                onClick: () => handleCopyBarcode(ob.id, ob.barcode!),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── VISUALIZAÇÃO DESKTOP: TABELA TRADICIONAL (hidden md:block) ── */}
          <div className="hidden md:block rounded-2xl border border-border/70 bg-card overflow-hidden shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-xs font-bold">Título & Categoria</TableHead>
                  <TableHead className="text-xs font-bold">Fornecedor / Favorecido</TableHead>
                  <TableHead className="text-xs font-bold">Vencimento</TableHead>
                  <TableHead className="text-xs font-bold font-mono">Valor a Pagar</TableHead>
                  <TableHead className="text-xs font-bold">Linha Digitável / Pix</TableHead>
                  <TableHead className="text-xs font-bold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredObligations.map((ob) => {
                  const catInfo = CATEGORY_LABELS[ob.category] || CATEGORY_LABELS.other;
                  const CatIcon = catInfo.icon;
                  const isPaid = ob.status === "paid";
                  const isOverdue = ob.status === "overdue";
                  const isToday = ob.due_date === today && !isPaid;

                  return (
                    <TableRow key={ob.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-start gap-2.5">
                          <div className={`p-1.5 rounded-lg border shrink-0 ${catInfo.color}`}>
                            <CatIcon className="size-4" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                              {ob.title}
                              {ob.recurrence !== "none" && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono">
                                  {ob.recurrence === "monthly" ? "Mensal" : ob.recurrence === "weekly" ? "Semanal" : "Anual"}
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground block">
                              {catInfo.label}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-medium text-foreground">
                        <div className="truncate max-w-[180px]" title={ob.supplier_name}>
                          {ob.supplier_name}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="text-xs font-mono font-medium text-foreground">
                            {ob.due_date.split("-").reverse().join("/")}
                          </div>
                          {isPaid ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold">
                              Pago em {ob.paid_at ? ob.paid_at.slice(0, 10).split("-").reverse().join("/") : "dia"}
                            </Badge>
                          ) : isOverdue ? (
                            <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px] font-bold animate-pulse">
                              Vencido
                            </Badge>
                          ) : isToday ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold">
                              Vence Hoje
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                              No prazo
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {formatMoney(ob.amount_cents)}
                      </TableCell>

                      <TableCell>
                        {ob.barcode ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyBarcode(ob.id, ob.barcode!)}
                            className="h-7 px-2 text-[11px] font-mono gap-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
                          >
                            {copiedId === ob.id ? (
                              <>
                                <Check className="size-3 text-emerald-600" />
                                <span className="text-emerald-600 font-bold">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                <span>Copiar Linha</span>
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid ? (
                            <Button
                              size="sm"
                              onClick={() => setPayModal({ isOpen: true, obligation: ob })}
                              className="h-8 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="size-3.5" />
                              <span>Pagar</span>
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold">
                              Liquidado
                            </Badge>
                          )}
                          <CrudActionsMenu
                            onDelete={() => handleDelete(ob.id, ob.title)}
                            deleteTitle={`Remover conta "${ob.title}"?`}
                            deleteDescription="A obrigação financeira será excluída do fluxo de caixa e não poderá ser recuperada."
                            customActions={[
                              ...(ob.barcode
                                ? [
                                    {
                                      label: "Copiar Linha Digitável / Pix",
                                      icon: Copy,
                                      onClick: () => handleCopyBarcode(ob.id, ob.barcode!),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ── GAVETA DE CADASTRO DE NOVA CONTA (SHEETPAGE) ── */}
      <SheetPage
        open={isCreateOpen}
        onOpenChange={(open) => !isSubmitting && setIsCreateOpen(open)}
        title="Nova Conta a Pagar"
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateObligation}
              disabled={isSubmitting}
              className="h-10 px-5 rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1.5"
            >
              {isSubmitting ? "Salvando..." : "Salvar Obrigação"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateObligation} className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Descrição / Título da Conta *</Label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Aluguel do Galpão, Conta de Luz Celesc, Embalagens..."
              className="rounded-xl h-10 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Fornecedor / Favorecido *</Label>
              <Input
                value={newSupplier}
                onChange={(e) => setNewSupplier(e.target.value)}
                placeholder="Ex: Imobiliária Central, Celesc..."
                className="rounded-xl h-10 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Valor em Reais (R$) *</Label>
              <Input
                value={newAmountReal}
                onChange={(e) => setNewAmountReal(e.target.value)}
                placeholder="0,00"
                className="rounded-xl h-10 text-xs font-mono font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Data de Vencimento *</Label>
              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="rounded-xl h-10 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Categoria da Despesa</Label>
              <Select value={newCategory} onValueChange={(val) => setNewCategory(val as any)}>
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="supplier">Fornecedor de Insumos</SelectItem>
                  <SelectItem value="rent">Aluguel & Imóvel</SelectItem>
                  <SelectItem value="utilities">Água, Luz e Internet</SelectItem>
                  <SelectItem value="payroll">Folha / Colaboradores</SelectItem>
                  <SelectItem value="tax">Tributos & DAS</SelectItem>
                  <SelectItem value="marketing">Marketing & Tráfego</SelectItem>
                  <SelectItem value="software">Software & Plataformas</SelectItem>
                  <SelectItem value="other">Outras Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Recorrência Automática</Label>
            <Select value={newRecurrence} onValueChange={(val) => setNewRecurrence(val as any)}>
              <SelectTrigger className="rounded-xl h-10 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="none">Despesa Única / Não recorrente</SelectItem>
                <SelectItem value="monthly">Mensal (Todo mês na mesma data)</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Código de Barras / Linha Digitável / Chave Pix</Label>
            <Input
              value={newBarcode}
              onChange={(e) => setNewBarcode(e.target.value)}
              placeholder="Cole a linha digitável do boleto ou chave Pix para agilizar o pagamento..."
              className="rounded-xl h-10 text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Observações Internas (Opcional)</Label>
            <Input
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Ex: Parcela 2 de 4, desconto até o dia 10..."
              className="rounded-xl h-10 text-xs"
            />
          </div>
        </form>
      </SheetPage>

      {/* ── GAVETA DE BAIXA / LIQUIDAÇÃO DE PAGAMENTO ── */}
      <SheetPage
        open={payModal.isOpen}
        onOpenChange={(open) => !isPaying && setPayModal({ isOpen: open, obligation: null })}
        title={`Liquidar Conta • ${payModal.obligation?.title || ""}`}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setPayModal({ isOpen: false, obligation: null })}
              disabled={isPaying}
              className="h-10 px-4 rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPay}
              disabled={isPaying}
              className="h-10 px-5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
            >
              {isPaying ? "Liquidando..." : "Confirmar Pagamento"}
            </Button>
          </>
        }
      >
        <div className="space-y-5 py-4">
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Valor da Conta:</span>
              <span className="font-mono font-bold text-base text-foreground">
                {formatMoney(payModal.obligation?.amount_cents || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Favorecido:</span>
              <span className="font-medium text-foreground">
                {payModal.obligation?.supplier_name || "Favorecido"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Vencimento Original:</span>
              <span className="font-mono text-foreground">
                {payModal.obligation?.due_date.split("-").reverse().join("/")}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Forma de Pagamento Utilizada</Label>
            <Select value={payMethod} onValueChange={setPayMethod}>
              <SelectTrigger className="rounded-xl h-11 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="pix">Pix da Conta da Empresa</SelectItem>
                <SelectItem value="boleto">Boleto Bancário Compensado</SelectItem>
                <SelectItem value="ted">Transferência Bancária / TED</SelectItem>
                <SelectItem value="cash">Dinheiro do Caixa Físico</SelectItem>
                <SelectItem value="credit_card">Cartão de Crédito Corporativo</SelectItem>
                <SelectItem value="debit_card">Cartão de Débito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Observação da Liquidação (Opcional)</Label>
            <Input
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Ex: Pago com desconto de R$ 20, comprovante no e-mail..."
              className="rounded-xl h-10 text-xs"
            />
          </div>
        </div>
      </SheetPage>
    </div>
  );
}
