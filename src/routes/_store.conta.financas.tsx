/**
 * _store.conta.financas.tsx — Gestão Financeira Pessoal (Plataforma Waesy)
 * Controle de despesas, receitas, saldo, distribuição por categorias e comprovantes com foto.
 * Paradigma Apple HIG & Clean Design, alvos de 44px, fonte Inter e RLS estrito (auth.uid() = profile_id).
 */

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useTransition, useMemo } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Calendar,
  Receipt,
  Plus,
  Trash2,
  Image as ImageIcon,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  ArrowLeft,
  Utensils,
  Car,
  Home,
  HeartPulse,
  GraduationCap,
  Palmtree,
  ShoppingBag,
  Briefcase,
  TrendingUp,
  Landmark,
  ScanLine,
  Lock,
  Coins,
  Shield,
  Activity,
  ExternalLink,
} from "lucide-react";
import { getUserTokenWallet } from "@/services/tokens.functions";
import {
  getPersonalFinanceSummary,
  listPersonalFinanceEntries,
  listPersonalFinanceCategories,
  createPersonalFinanceEntry,
  deletePersonalFinanceEntry,
  analyzeReceiptWithAI,
  type PersonalFinanceSummaryDTO,
  type PersonalFinancialEntryDTO,
  type PersonalFinancialCategoryDTO,
  type OcrReceiptResult,
} from "@/services/personal-finance.functions";
import { ImageUpload } from "@/components/ui/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCents, cn } from "@/lib/utils";
import { toast } from "sonner";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";

export const Route = createFileRoute("/_store/conta/financas")({
  head: () => ({ meta: [{ title: "Gestão Financeira Pessoal | Waesy" }] }),
  loader: async () => {
    try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    try {
      const [summary, entries, categories, tokenWallet] = await Promise.all([
        getPersonalFinanceSummary({ data: { month: currentMonth, year: currentYear } }),
        listPersonalFinanceEntries({ data: { month: currentMonth, year: currentYear } }),
        listPersonalFinanceCategories(),
        getUserTokenWallet().catch(() => ({
          balance: 0,
          balance_pending_maturity: 0,
          security_level: "MILITARY_ZERO_TRUST",
          zero_transfer_policy_active: true,
          transactions: [],
        })),
      ]);

      return {
        initialSummary: summary,
        initialEntries: entries,
        categories,
        tokenWallet,
        currentMonth,
        currentYear,
      };
    } catch (err: any) {
      console.warn("[financas.route] Loader fallback:", err);
      return {
        initialSummary: {
          totalIncomeCents: 0,
          totalExpenseCents: 0,
          balanceCents: 0,
          entriesCount: 0,
          month: currentMonth,
          year: currentYear,
          byCategory: [],
          dailyTrend: [],
        } as PersonalFinanceSummaryDTO,
        initialEntries: [] as PersonalFinancialEntryDTO[],
        categories: [] as PersonalFinancialCategoryDTO[],
        tokenWallet: {
          balance: 0,
          balance_pending_maturity: 0,
          security_level: "MILITARY_ZERO_TRUST",
          zero_transfer_policy_active: true,
          transactions: [],
        },
        currentMonth,
        currentYear,
      };
    }
    } catch (err) {
      console.error("[loader:_store.conta.financas] Unhandled loader error:", err);
      return { initialSummary: null, initialEntries: null, categories: null, tokenWallet: null, currentMonth: null, currentYear: null };
    }
  },
  component: PersonalFinancePage,
});

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Helper para renderizar ícone dinâmico da categoria
function getCategoryIcon(iconName: string) {
  switch (iconName?.toLowerCase()) {
    case "utensils":
      return <Utensils className="h-4 w-4" />;
    case "car":
      return <Car className="h-4 w-4" />;
    case "home":
      return <Home className="h-4 w-4" />;
    case "heartpulse":
      return <HeartPulse className="h-4 w-4" />;
    case "graduationcap":
      return <GraduationCap className="h-4 w-4" />;
    case "palmtree":
      return <Palmtree className="h-4 w-4" />;
    case "shoppingbag":
      return <ShoppingBag className="h-4 w-4" />;
    case "briefcase":
      return <Briefcase className="h-4 w-4" />;
    case "trendingup":
      return <TrendingUp className="h-4 w-4" />;
    case "landmark":
      return <Landmark className="h-4 w-4" />;
    default:
      return <Receipt className="h-4 w-4" />;
  }
}

function PersonalFinancePage() {
  const router = useRouter();
  const { initialSummary, initialEntries, categories, tokenWallet, currentMonth, currentYear } = ((Route.useLoaderData?.() as any) || {});

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [summary, setSummary] = useState<PersonalFinanceSummaryDTO>(initialSummary);
  const [entries, setEntries] = useState<PersonalFinancialEntryDTO[]>(initialEntries);
  const [isLoadingPeriod, setIsLoadingPeriod] = useState(false);

  // Filtros
  const [activeTab, setActiveTab] = useState<"all" | "expense" | "income">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer / Modal de Criação de Lançamento
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [isSubmitting, startTransition] = useTransition();

  // Form State
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<
    "pix" | "credit_card" | "debit_card" | "cash" | "transfer" | "boleto" | "other"
  >("pix");
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Modal de Zoom do Recibo / Comprovante
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  // OCR State
  const [isAnalyzingOcr, setIsAnalyzingOcr] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrReceiptResult | null>(null);

  // Recalcula dados ao trocar de mês/ano
  const handlePeriodChange = async (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    setIsLoadingPeriod(true);

    try {
      const [newSummary, newEntries] = await Promise.all([
        getPersonalFinanceSummary({ data: { month: newMonth, year: newYear } }),
        listPersonalFinanceEntries({ data: { month: newMonth, year: newYear } }),
      ]);
      setSummary(newSummary);
      setEntries(newEntries);
    } catch (err: any) {
      toast.error("Erro ao carregar dados do período.");
    } finally {
      setIsLoadingPeriod(false);
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      handlePeriodChange(12, year - 1);
    } else {
      handlePeriodChange(month - 1, year);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      handlePeriodChange(1, year + 1);
    } else {
      handlePeriodChange(month + 1, year);
    }
  };

  // Submissão de novo lançamento
  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();

    // Sanitiza e valida valor
    const cleanAmount = amountStr.replace(/\./g, "").replace(",", ".");
    const parsedAmount = parseFloat(cleanAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }

    if (!description.trim()) {
      toast.error("Informe uma descrição para o lançamento.");
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);

    startTransition(async () => {
      try {
        await createPersonalFinanceEntry({
          data: {
            type: entryType,
            amountCents,
            description: description.trim(),
            categoryId: selectedCategoryId || null,
            entryDate,
            paymentMethod,
            receiptUrl: receiptUrl || null,
            notes: notes.trim() || null,
          },
        });

        toast.success(
          entryType === "expense"
            ? "Despesa registrada com sucesso!"
            : "Receita registrada com sucesso!"
        );

        // Limpa formulário
        setAmountStr("");
        setDescription("");
        setSelectedCategoryId("");
        setReceiptUrl("");
        setNotes("");
        setOcrResult(null);
        setIsNewEntryOpen(false);

        // Recarrega período
        handlePeriodChange(month, year);
      } catch (err: any) {
        toast.error(err.message || "Falha ao salvar lançamento.");
      }
    });
  };

  // Exclusão de lançamento
  const handleDeleteEntry = async (id: string) => {
    try {
      await deletePersonalFinanceEntry({ data: { id } });
      toast.success("Lançamento excluído.");
      handlePeriodChange(month, year);
    } catch (err: any) {
      toast.error("Erro ao excluir lançamento.");
    }
  };

  // Filtragem de lançamentos na interface
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      if (activeTab !== "all" && item.type !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = item.description.toLowerCase().includes(q);
        const catMatch = item.category?.name.toLowerCase().includes(q);
        if (!descMatch && !catMatch) return false;
      }
      return true;
    });
  }, [entries, activeTab, searchQuery]);

  // Agrupamento por dia
  const groupedByDay = useMemo(() => {
    const groups: Record<string, PersonalFinancialEntryDTO[]> = {};
    for (const item of filteredEntries) {
      if (!groups[item.entryDate]) groups[item.entryDate] = [];
      groups[item.entryDate].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredEntries]);

  // Categorias filtradas pelo tipo no drawer
  const availableCategories = useMemo(() => {
    return categories.filter(
      (c: any) => c.type === entryType || c.type === "both"
    );
  }, [categories, entryType]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Finanças
          </h1>
        </div>

        <Button
          size="sm"
          onClick={() => setIsNewEntryOpen(true)}
          className="rounded-xl h-8 px-3.5 text-xs font-semibold gap-1.5 bg-foreground text-background hover:bg-foreground/90 shrink-0 shadow-xs cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Novo Lançamento</span>
        </Button>
      </div>

        {/* Seletor de Período (Mês / Ano) */}
        <div className="flex items-center justify-between bg-card border border-border/60 rounded-2xl p-2 sm:p-3 shadow-xs">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isLoadingPeriod}
            className="h-10 w-10 inline-flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Mês Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 font-medium text-sm sm:text-base">
            <Calendar className="h-4 w-4 text-primary" />
            <span>
              {MONTH_NAMES[month - 1]} de {year}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={isLoadingPeriod}
            className="h-10 w-10 inline-flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Próximo Mês"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Cards de Métricas Principais (Apple HIG) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Saldo Líquido */}
          <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold">
                Saldo do Período
              </span>
              <Wallet className="h-4 w-4" />
            </div>
            <div
              className={cn(
                "text-2xl sm:text-3xl font-bold tracking-tight",
                summary.balanceCents > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : summary.balanceCents < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-foreground"
              )}
            >
              {formatCents(summary.balanceCents)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {summary.entriesCount} lançamento{summary.entriesCount !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Total de Receitas */}
          <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold">Receitas</span>
              <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ArrowDownLeft className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCents(summary.totalIncomeCents)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Entradas do mês</div>
          </div>

          {/* Total de Despesas */}
          <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold">Despesas</span>
              <div className="h-6 w-6 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {formatCents(summary.totalExpenseCents)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Saídas do mês</div>
          </div>
        </div>

        {/* Card de Governança Militar: Carteira de Tokens & Fidelidade */}
        <div className="bg-card border border-border/70 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold tracking-tight text-foreground">
                    Carteira de Tokens & Fidelidade
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Shield className="h-2.5 w-2.5" /> Segurança Militar
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ledger criptográfico pétreo e intransferível de utilidade regional
                </p>
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-semibold h-8 gap-1.5 self-start sm:self-auto border-border/80"
            >
              <Link to="/conta/tokens">
                <span>Ver Ledger & Extrato</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Saldo de Tokens Disponíveis
              </span>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
                {Number(tokenWallet?.balance || 0).toLocaleString()}{" "}
                <span className="text-xs font-normal text-muted-foreground">Tokens</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Para desconto em compras, produtos e serviços parceiros credenciados.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Tokens em Liberação (Ganhos Programados)
              </span>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                {Number(tokenWallet?.balance_pending_maturity || 0).toLocaleString()}{" "}
                <span className="text-xs font-normal text-muted-foreground">Tokens</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Bônus de indicação e recompensas em processo de liberação gradual.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/20 px-3 py-2 rounded-xl border border-border/30">
            <Lock className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              <strong>Proteção da Carteira:</strong> Seus tokens são vinculados com segurança jurídica ao seu CPF, garantindo rastreabilidade e proteção contra fraudes.
            </span>
          </div>
        </div>

        {/* Distribuição por Categoria (se houver despesas) */}
        {summary.byCategory.length > 0 && (
          <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Distribuição de Gastos
              </h2>
              <span className="text-xs text-muted-foreground">
                {summary.byCategory.length} categoria{summary.byCategory.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-2.5">
              {summary.byCategory.slice(0, 5).map((cat) => (
                <div key={cat.categoryId || cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cat.color || "#6366f1" }}
                      />
                      <span className="font-medium text-foreground">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{cat.percentage}%</span>
                      <span className="font-medium text-foreground">
                        {formatCents(cat.totalCents)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(3, cat.percentage))}%`,
                        backgroundColor: cat.color || "#6366f1",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barra de Filtros Rápidos & Busca */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="inline-flex bg-muted/60 p-1 rounded-xl border border-border/40 self-start overflow-x-auto no-scrollbar max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={cn(
                "h-9 px-3.5 rounded-lg text-xs font-medium transition-all",
                activeTab === "all"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todos ({entries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("expense")}
              className={cn(
                "h-9 px-3.5 rounded-lg text-xs font-medium transition-all",
                activeTab === "expense"
                  ? "bg-card text-rose-600 dark:text-rose-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Despesas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("income")}
              className={cn(
                "h-9 px-3.5 rounded-lg text-xs font-medium transition-all",
                activeTab === "income"
                  ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Receitas
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar lançamento..."
              className="h-10 pl-9 rounded-xl text-xs sm:text-sm bg-card border-border/60"
            />
          </div>
        </div>

        {/* Timeline de Lançamentos Agrupados */}
        <div className="space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="bg-card border border-border/60 rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-xs">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Receipt className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-base text-foreground">
                Nenhum lançamento neste período
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                Registre suas despesas, compras no mercado ou receitas para acompanhar seu saldo
                em tempo real.
              </p>
              <Button
                onClick={() => setIsNewEntryOpen(true)}
                variant="outline"
                className="h-11 px-5 rounded-xl border-border/80 hover:bg-muted font-medium"
              >
                Adicionar Lançamento
              </Button>
            </div>
          ) : (
            groupedByDay.map(([dateStr, dayEntries]) => {
              const [y, m, d] = dateStr.split("-");
              const formattedDate = `${d} de ${MONTH_NAMES[parseInt(m) - 1]}`;

              return (
                <div key={dateStr} className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    {formattedDate}
                  </div>

                  <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs divide-y divide-border/40">
                    {dayEntries.map((entry) => {
                      const isExpense = entry.type === "expense";
                      const catColor = entry.category?.color || (isExpense ? "#f43f5e" : "#10b981");

                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-muted/30 transition-colors"
                        >
                          {/* Esquerda: Ícone & Detalhes */}
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div
                              className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-white shadow-2xs"
                              style={{ backgroundColor: catColor }}
                            >
                              {getCategoryIcon(entry.category?.icon || "Receipt")}
                            </div>

                            <div className="min-w-0">
                              <div className="font-medium text-sm text-foreground truncate">
                                {entry.description}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>{entry.category?.name || (isExpense ? "Despesa" : "Receita")}</span>
                                <span>•</span>
                                <span className="capitalize">{entry.paymentMethod}</span>
                                {entry.receiptUrl && (
                                  <>
                                    <span>•</span>
                                    <button
                                      type="button"
                                      onClick={() => setViewingReceiptUrl(entry.receiptUrl)}
                                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                    >
                                      <ImageIcon className="h-3 w-3" />
                                      <span>Comprovante</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Direita: Valor & Ação de Excluir */}
                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={cn(
                                "text-sm sm:text-base font-semibold",
                                isExpense
                                  ? "text-foreground"
                                  : "text-emerald-600 dark:text-emerald-400"
                              )}
                            >
                              {isExpense ? "-" : "+"} {formatCents(entry.amountCents)}
                            </span>

                            {entry.isLocked ? (
                              <div
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground/40 cursor-not-allowed"
                                title={`Lançamento imutável — originado de ${entry.referenceType || "sistema"}`}
                              >
                                <Lock className="h-4 w-4" />
                              </div>
                            ) : (
                              <CrudActionsMenu
                                entityName="Lançamento"
                                onDelete={() => handleDeleteEntry(entry.id)}
                                deleteConfirmTitle={`Excluir lançamento "${entry.description}"?`}
                                deleteConfirmDescription={`Deseja realmente remover o lançamento de ${formatCents(entry.amountCents)}? O saldo mensal será recalculado.`}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

      {/* MODAL / DRAWER: NOVO LANÇAMENTO (3-Touch UX) */}
      {isNewEntryOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div
            className="bg-card border border-border/80 w-full sm:max-w-lg rounded-t-[28px] sm:rounded-2xl p-5 sm:p-6 shadow-xs max-h-[90vh] overflow-y-auto space-y-5"
            role="dialog"
            aria-modal="true"
          >
            {/* Header do Drawer */}
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h2 className="text-lg font-semibold tracking-tight">Novo Lançamento</h2>
              <button
                type="button"
                onClick={() => setIsNewEntryOpen(false)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-4">
              {/* Toggle Tipo: Despesa / Receita */}
              <div className="grid grid-cols-2 gap-2 bg-muted/60 p-1 rounded-xl border border-border/40">
                <button
                  type="button"
                  onClick={() => setEntryType("expense")}
                  className={cn(
                    "h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
                    entryType === "expense"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  <span>Despesa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType("income")}
                  className={cn(
                    "h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
                    entryType === "income"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ArrowDownLeft className="h-4 w-4" />
                  <span>Receita</span>
                </button>
              </div>

              {/* Valor Monetário */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Valor (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">
                    R$
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    required
                    autoFocus
                    className="h-12 pl-11 text-xl font-bold rounded-xl bg-card border-border/80"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Descrição
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Almoço de domingo, Mercado, Salário..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-card border-border/80"
                />
              </div>

              {/* Categoria */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Categoria
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border border-border/40 rounded-xl bg-muted/30">
                  {availableCategories.map((cat: any) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={cn(
                        "h-10 px-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all text-left truncate",
                        selectedCategoryId === cat.id
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "bg-card text-foreground hover:bg-muted border border-border/40"
                      )}
                    >
                      <div
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Data & Método de Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Data
                  </label>
                  <Input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    required
                    className="h-11 rounded-xl bg-card border-border/80"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Forma de Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full h-11 px-3 rounded-xl bg-card border border-border/80 text-sm font-medium text-foreground"
                  >
                    <option value="pix">Pix</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="debit_card">Cartão de Débito</option>
                    <option value="cash">Dinheiro em Espécie</option>
                    <option value="transfer">Transferência Bancária</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
              </div>

              {/* Comprovante / Foto do Recibo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Foto do Comprovante
                  </label>
                  {receiptUrl && (
                    <button
                      type="button"
                      disabled={isAnalyzingOcr}
                      onClick={async () => {
                        setIsAnalyzingOcr(true);
                        try {
                          const result = await analyzeReceiptWithAI({ data: { imageUrl: receiptUrl } });
                          setOcrResult(result);
                          if (result.amountCents) {
                            const r = result.amountCents / 100;
                            setAmountStr(r.toFixed(2).replace(".", ","));
                          }
                          if (result.description) setDescription(result.description);
                          if (result.entryDate) setEntryDate(result.entryDate);
                          toast.success(
                            `OCR concluído com confiança ${result.confidence === "high" ? "alta ✓" : result.confidence === "medium" ? "média" : "baixa — revise os dados"}`
                          );
                        } catch (err: any) {
                          toast.error(err.message || "Falha no OCR. Tente novamente.");
                        } finally {
                          setIsAnalyzingOcr(false);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAnalyzingOcr ? (
                        <><Activity className="h-3 w-3 animate-pulse" /> Analisando...</>
                      ) : (
                        <><ScanLine className="h-3 w-3" /> Analisar com IA</>
                      )}
                    </button>
                  )}
                </div>
                <ImageUpload
                  value={receiptUrl}
                  onChange={(url) => setReceiptUrl(url)}
                  onRemove={() => { setReceiptUrl(""); setOcrResult(null); }}
                  bucket="receipts"
                  variant="minimal"
                  helperText="Anexe a foto da nota fiscal ou recibo — a IA preenche os campos automaticamente"
                />
                {/* Resultado do OCR */}
                {ocrResult && (
                  <div className="mt-2 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <Activity className="h-3 w-3" />
                      OCR Concluído — {ocrResult.confidence === "high" ? "Alta confiança" : ocrResult.confidence === "medium" ? "Média confiança" : "Baixa confiança — revise"}
                    </div>
                    {ocrResult.establishmentName && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Estabelecimento:</span> {ocrResult.establishmentName}
                      </div>
                    )}
                    {ocrResult.cnpj && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">CNPJ:</span> {ocrResult.cnpj}
                      </div>
                    )}
                    {ocrResult.suggestedCategory && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Categoria sugerida:</span> {ocrResult.suggestedCategory}
                      </div>
                    )}
                    {ocrResult.rawText && (
                      <div className="text-xs text-muted-foreground/70 italic line-clamp-2">{ocrResult.rawText}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notas / Observações (Opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Detalhes adicionais..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-11 rounded-xl bg-card border-border/80"
                />
              </div>

              {/* Botões de Ação */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewEntryOpen(false)}
                  className="h-11 px-5 rounded-xl border-border/80"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:opacity-90"
                >
                  {isSubmitting ? "Salvando..." : "Salvar Lançamento"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ZOOM DO COMPROVANTE */}
      {viewingReceiptUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setViewingReceiptUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-card rounded-2xl overflow-hidden shadow-xs p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b border-border/40">
              <span className="font-semibold text-sm">Visualização do Comprovante</span>
              <button
                type="button"
                onClick={() => setViewingReceiptUrl(null)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center max-h-[80vh] overflow-auto">
              <img
                src={viewingReceiptUrl}
                alt="Comprovante de pagamento"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
