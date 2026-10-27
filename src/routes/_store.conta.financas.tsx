/**
 * _store.conta.financas.tsx — Gestão Financeira Canônica, Ledger e Extrato Unificado (Plataforma Waesy)
 *
 * Normativa: SPEC-FINANCAS-LEDGER-CARTEIRA-UNIFICADA, AGENTS.md B.8, B.14, B.22, B.25, B.26
 * 4 Pilares: [ Visão Geral ] [ Extrato ] [ Planejamento ] [ Conta ]
 * Separação dos Três Livros: Pessoal, Ledger Econômico Waesy e Dinheiro Movimentável (R$)
 * Design: Apple HIG & Clean Design, alvos táteis de 44px (h-11), rounded-lg, zero emojis, WCAG AA.
 */

import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition, useMemo } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Calendar,
  Receipt,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  Coins,
  Shield,
  Activity,
  ExternalLink,
  RefreshCw,
  Upload,
  Copy,
  FileText,
  ArrowLeftRight,
} from "lucide-react";

import { getUserTokenWallet } from "@/services/tokens.functions";
import {
  getPersonalFinanceSummary,
  listPersonalFinanceEntries,
  listPersonalFinanceCategories,
  createPersonalFinanceEntry,
  analyzeReceiptWithAI,
  importOfxStatement,
  type PersonalFinanceSummaryDTO,
  type PersonalFinancialEntryDTO,
  type PersonalFinancialCategoryDTO,
} from "@/services/personal-finance.functions";
import {
  getMyWalletBalance,
  transferP2P,
  depositPixToWallet,
  getReceiptDetails,
  type WalletBalanceDTO,
  type FinancialReceiptDTO,
} from "@/services/financial-ledger.functions";
import {
  listUnifiedFinancialFeed,
  type UnifiedFinancialEventDTO,
} from "@/services/financial-event-bus.service";

import { ImageUpload } from "@/components/ui/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCents, cn } from "@/lib/utils";
import { FinancialHeroCard } from "@/components/finance/FinancialHeroCard";
import { FinancialActionGrid } from "@/components/finance/FinancialActionGrid";
import { PixHubDrawer } from "@/components/finance/PixHubDrawer";
import { PaymentSuccessReceipt } from "@/components/finance/PaymentSuccessReceipt";
import { CreditCardInvoiceView } from "@/components/finance/CreditCardInvoiceView";
import { CardSettingsDrawer } from "@/components/finance/CardSettingsDrawer";
import { LoanSimulationSheet } from "@/components/finance/LoanSimulationSheet";
import { InstallmentTimelineDrawer } from "@/components/finance/InstallmentTimelineDrawer";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/conta/financas")({
  head: () => ({ meta: [{ title: "Finanças e Carteira | Waesy" }] }),
  loader: async () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    try {
      const [summary, entries, categories, tokenWallet, walletBalance, unifiedFeed] = await Promise.all([
        getPersonalFinanceSummary({ data: { month: currentMonth, year: currentYear } }).catch(() => ({
          totalIncomeCents: 0,
          totalExpenseCents: 0,
          balanceCents: 0,
          entriesCount: 0,
          month: currentMonth,
          year: currentYear,
          byCategory: [],
          dailyTrend: [],
        })),
        listPersonalFinanceEntries({ data: { month: currentMonth, year: currentYear } }).catch(() => []),
        listPersonalFinanceCategories().catch(() => []),
        getUserTokenWallet().catch(() => ({
          balance: 0,
          balance_pending_maturity: 0,
          security_level: "MILITARY_ZERO_TRUST",
          zero_transfer_policy_active: true,
          transactions: [],
        })),
        getMyWalletBalance().catch(() => ({
          availableCents: 0,
          heldCents: 0,
          currency: "BRL",
          isAccountActive: true,
          securityLevel: "ZERO_TRUST_CIVIL",
        })),
        listUnifiedFinancialFeed({ data: { month: currentMonth, year: currentYear, limit: 50 } }).catch(() => []),
      ]);

      return {
        initialSummary: summary as PersonalFinanceSummaryDTO,
        initialEntries: entries as PersonalFinancialEntryDTO[],
        categories: categories as PersonalFinancialCategoryDTO[],
        tokenWallet,
        walletBalance: walletBalance as WalletBalanceDTO,
        unifiedFeed: unifiedFeed as UnifiedFinancialEventDTO[],
        currentMonth,
        currentYear,
      };
    } catch (err) {
      console.error("[loader:_store.conta.financas] Falha no loader:", err);
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
        tokenWallet: { balance: 0, balance_pending_maturity: 0, security_level: "CIVIL", transactions: [] },
        walletBalance: { availableCents: 0, heldCents: 0, currency: "BRL", isAccountActive: false, securityLevel: "FALLBACK" },
        unifiedFeed: [] as UnifiedFinancialEventDTO[],
        currentMonth,
        currentYear,
      };
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

type PillarTab = "overview" | "feed" | "planning" | "account";

function PersonalFinancePage() {
  const {
    initialSummary,
    categories,
    tokenWallet,
    walletBalance,
    unifiedFeed,
    currentMonth,
    currentYear,
  } = (Route.useLoaderData?.() as any) || {};

  // Estado dos 4 Pilares
  const [activePillar, setActivePillar] = useState<PillarTab>("overview");

  // Período
  const [month, setMonth] = useState(currentMonth || new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear || new Date().getFullYear());
  const [summary, setSummary] = useState<PersonalFinanceSummaryDTO>(initialSummary);
  const [feed, setFeed] = useState<UnifiedFinancialEventDTO[]>(unifiedFeed || []);
  const [wallet, setWallet] = useState<WalletBalanceDTO>(walletBalance);
  const [isLoadingPeriod, setIsLoadingPeriod] = useState(false);

  // Filtros do Extrato
  const [feedFilterDomain, setFeedFilterDomain] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modais & Drawers
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isPixHubOpen, setIsPixHubOpen] = useState(false);
  const [isSuccessReceiptOpen, setIsSuccessReceiptOpen] = useState(false);
  const [isCardSettingsOpen, setIsCardSettingsOpen] = useState(false);
  const [isLoanSimulationOpen, setIsLoanSimulationOpen] = useState(false);
  const [isInstallmentTimelineOpen, setIsInstallmentTimelineOpen] = useState(false);
  const [lastPaymentSuccess, setLastPaymentSuccess] = useState<{
    amountCents: number;
    recipientName: string;
    transactionId: string;
  } | null>(null);
  const [isOfxModalOpen, setIsOfxModalOpen] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState<UnifiedFinancialEventDTO | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<FinancialReceiptDTO | null>(null);

  // Estados de Transição e Formulários
  const [isSubmitting, startTransition] = useTransition();

  // Novo Lançamento Form
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
  const [isAnalyzingOcr, setIsAnalyzingOcr] = useState(false);

  // Formulário P2P
  const [transferRecipientId, setTransferRecipientId] = useState("");
  const [transferAmountStr, setTransferAmountStr] = useState("");
  const [transferDesc, setTransferDesc] = useState("");

  // Formulário Depósito Pix
  const [depositAmountStr, setDepositAmountStr] = useState("50,00");

  // Formulário OFX
  const [ofxContentInput, setOfxContentInput] = useState("");
  const [isImportingOfx, setIsImportingOfx] = useState(false);

  // Recarrega período
  const handlePeriodChange = async (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    setIsLoadingPeriod(true);

    try {
      const [newSummary, newFeed, newWallet] = await Promise.all([
        getPersonalFinanceSummary({ data: { month: newMonth, year: newYear } }),
        listUnifiedFinancialFeed({ data: { month: newMonth, year: newYear, limit: 100 } }),
        getMyWalletBalance(),
      ]);
      setSummary(newSummary);
      setFeed(newFeed);
      setWallet(newWallet);
    } catch {
      toast.error("Erro ao sincronizar dados do período.");
    } finally {
      setIsLoadingPeriod(false);
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) handlePeriodChange(12, year - 1);
    else handlePeriodChange(month - 1, year);
  };

  const handleNextMonth = () => {
    if (month === 12) handlePeriodChange(1, year + 1);
    else handlePeriodChange(month + 1, year);
  };

  // Submissão de Lançamento Manual (Livro Pessoal)
  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
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

        toast.success(entryType === "expense" ? "Despesa registrada." : "Receita registrada.");
        setAmountStr("");
        setDescription("");
        setSelectedCategoryId("");
        setReceiptUrl("");
        setNotes("");
        setIsNewEntryOpen(false);
        handlePeriodChange(month, year);
      } catch (err: any) {
        toast.error(err.message || "Falha ao registrar lançamento.");
      }
    });
  };

  // Submissão de Transferência P2P (Ledger Movimentável)
  const handleExecuteP2P = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = transferAmountStr.replace(/\./g, "").replace(",", ".");
    const parsedAmount = parseFloat(cleanAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Informe um valor de transferência válido.");
      return;
    }
    if (!transferRecipientId.trim()) {
      toast.error("Informe o ID de perfil do destinatário.");
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);

    startTransition(async () => {
      try {
        const result = await transferP2P({
          data: {
            recipientProfileId: transferRecipientId.trim(),
            amountCents,
            description: transferDesc.trim() || "Transferência Waesy",
          },
        });

        toast.success("Transferência realizada com sucesso!");
        setActiveReceipt(result.receipt ?? null);
        setLastPaymentSuccess({
          amountCents,
          recipientName: transferRecipientId.trim(),
          transactionId: result.receipt?.transactionId || "TX-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
        });
        setIsSuccessReceiptOpen(true);
        setIsTransferOpen(false);
        setTransferAmountStr("");
        setTransferRecipientId("");
        setTransferDesc("");
        handlePeriodChange(month, year);
      } catch (err: any) {
        toast.error(err.message || "Falha na transferência.");
      }
    });
  };

  // Submissão de Depósito Pix (Ledger Movimentável)
  const handleExecuteDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = depositAmountStr.replace(/\./g, "").replace(",", ".");
    const parsedAmount = parseFloat(cleanAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Informe um valor válido para recarga.");
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);

    startTransition(async () => {
      try {
        const result = await depositPixToWallet({
          data: { amountCents },
        });

        if (result.status === "PENDING") {
          toast.success("Cobrança Pix gerada com sucesso! O saldo será liquidado após a confirmação do pagamento.");
        } else {
          toast.success("Saldo creditado na carteira!");
        }
        if (result.receipt) {
          setActiveReceipt(result.receipt);
        }
        setIsDepositOpen(false);
        handlePeriodChange(month, year);
      } catch (err: any) {
        toast.error(err.message || "Falha ao adicionar saldo.");
      }
    });
  };

  // Submissão de Importação OFX (Livro Pessoal)
  const handleImportOfx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ofxContentInput.trim()) {
      toast.error("Cole o conteúdo do arquivo OFX para importar.");
      return;
    }

    setIsImportingOfx(true);
    try {
      const res = await importOfxStatement({
        data: { ofxContent: ofxContentInput.trim(), institutionName: "Extrato Bancário" },
      });

      toast.success(
        `${res.importedCount} lançamentos importados (${res.skippedDuplicatesCount} duplicatas ignoradas).`
      );
      setIsOfxModalOpen(false);
      setOfxContentInput("");
      handlePeriodChange(month, year);
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar arquivo OFX.");
    } finally {
      setIsImportingOfx(false);
    }
  };

  // Abertura de comprovante por ID
  const handleOpenReceiptById = async (receiptId: string) => {
    try {
      const rec = await getReceiptDetails({ data: { idOrCode: receiptId } });
      if (rec) {
        setActiveReceipt(rec);
      } else {
        toast.error("Comprovante não encontrado.");
      }
    } catch {
      toast.error("Erro ao carregar comprovante.");
    }
  };

  // Filtragem do Feed Unificado
  const filteredFeed = useMemo(() => {
    return feed.filter((item) => {
      if (feedFilterDomain !== "ALL" && item.sourceDomain !== feedFilterDomain) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = item.description.toLowerCase().includes(q);
        const partyMatch = item.counterpartyName?.toLowerCase().includes(q);
        const catMatch = item.categoryName?.toLowerCase().includes(q);
        if (!descMatch && !partyMatch && !catMatch) return false;
      }
      return true;
    });
  }, [feed, feedFilterDomain, searchQuery]);

  // Categorias deduplicadas para o tipo ativo no modal
  const availableCategories = useMemo(() => {
    return categories.filter((c: any) => c.type === entryType || c.type === "both");
  }, [categories, entryType]);

  const headerRightAction = (
    <Button
      onClick={() => setIsNewEntryOpen(true)}
      className="rounded-lg h-11 min-h-11 px-3 text-xs font-semibold gap-2 bg-foreground text-background shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <Plus className="size-5" />
      <span>Lançar</span>
    </Button>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-24 px-3 sm:px-4 md:px-0">
      {/* ── 1. Top Bar Canônica ── */}
      <NativeMobileHeader
        title="Finanças"
        fallbackHref="/conta"
        mobileOnly
        rightActions={headerRightAction}
      />

      <div className="hidden sm:flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Finanças e Carteira
          </h1>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Shield className="size-5" />
            Zero-Trust
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsTransferOpen(true)}
            className="rounded-lg h-11 min-h-11 px-4 text-xs font-semibold gap-2 border-border/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <ArrowLeftRight className="size-5" />
            <span>Transferir</span>
          </Button>
          <Button
            onClick={() => setIsNewEntryOpen(true)}
            className="rounded-lg h-11 min-h-11 px-4 text-xs font-semibold gap-2 bg-foreground text-background hover:bg-foreground/90 shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Plus className="size-5" />
            <span>Novo Lançamento</span>
          </Button>
        </div>
      </div>

      {/* ── 2. Seletor dos 4 Pilares Canônicos ── */}
      <div className="flex items-center gap-2 p-1 rounded-lg bg-muted/60 border border-border/40">
        <button
          type="button"
          onClick={() => setActivePillar("overview")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activePillar === "overview"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Visão Geral
        </button>
        <button
          type="button"
          onClick={() => setActivePillar("feed")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activePillar === "feed"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Extrato ({feed.length})
        </button>
        <button
          type="button"
          onClick={() => setActivePillar("planning")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activePillar === "planning"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Planejamento
        </button>
        <button
          type="button"
          onClick={() => setActivePillar("account")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activePillar === "account"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Conta R$
        </button>
      </div>

      {/* ── 3. Seletor de Período Mensal ── */}
      <div className="flex items-center justify-between bg-card border border-border/60 rounded-lg p-2 sm:p-3 shadow-xs">
        <button
          type="button"
          onClick={handlePrevMonth}
          disabled={isLoadingPeriod}
          className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          aria-label="Mês Anterior"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="flex items-center gap-2 font-medium text-sm sm:text-base">
          <Calendar className="size-5 text-primary" />
          <span>
            {MONTH_NAMES[month - 1]} de {year}
          </span>
          {isLoadingPeriod && <RefreshCw className="size-5 animate-spin text-muted-foreground" />}
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          disabled={isLoadingPeriod}
          className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          aria-label="Próximo Mês"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PILAR 1: VISÃO GERAL (WAESY BANK & 99PAY PARITY) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activePillar === "overview" && (
        <div className="space-y-4 sm:space-y-6">
          {/* Hero Card de Saldo com Toggle de Privacidade & Yield 99Pay */}
          <FinancialHeroCard
            balanceCents={wallet?.availableCents || 0}
            yieldRateText="120% CDI ↑"
            cashbackText="1% de cashback"
            onDepositClick={() => setIsDepositOpen(true)}
            onPayClick={() => setIsTransferOpen(true)}
            onTransferClick={() => setIsPixHubOpen(true)}
            onExtractClick={() => setActivePillar("feed")}
          />

          {/* Grade Squircle de Serviços e Pagamentos */}
          <FinancialActionGrid
            onPixClick={() => setIsPixHubOpen(true)}
            onBoletoClick={() => toast.info("Leitor de Boleto / Linha Digitável")}
            onTransferClick={() => setIsTransferOpen(true)}
            onHistoryClick={() => setActivePillar("feed")}
            onChargeClick={() => setIsPixHubOpen(true)}
            onCardClick={() => setIsCardSettingsOpen(true)}
            onRechargeClick={() => toast.info("Recarga de Celular")}
            onLoansClick={() => setIsLoanSimulationOpen(true)}
          />

          {/* Métricas Principais de Receitas e Despesas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Total de Receitas (Livro Pessoal) */}
            <div className="bg-card border border-border/60 rounded-lg p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold">
                  Receitas Pessoais
                </span>
                <div className="size-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ArrowDownLeft className="size-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatCents(summary.totalIncomeCents)}
              </div>
              <div className="text-xs text-muted-foreground mt-2">Entradas do mês selecionado</div>
            </div>

            {/* Total de Despesas (Livro Pessoal) */}
            <div className="bg-card border border-border/60 rounded-lg p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold">
                  Despesas Pessoais
                </span>
                <div className="size-6 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <ArrowUpRight className="size-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                {formatCents(summary.totalExpenseCents)}
              </div>
              <div className="text-xs text-muted-foreground mt-2">Saídas do mês selecionado</div>
            </div>
          </div>

          {/* Card Secundário: Recompensas $WZ (Isolado de R$) */}
          <div className="bg-card border border-border/60 rounded-lg p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Coins className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold tracking-tight text-foreground">
                      Recompensas $WZ e Benefícios
                    </h2>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Utilidade Interna
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Saldo para descontos em produtos e serviços parceiros (unidade $WZ).
                  </p>
                </div>
              </div>

              <Button
                asChild
                variant="outline"
                className="rounded-lg h-11 min-h-11 px-4 text-xs font-semibold border-border/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <Link to="/conta/tokens">
                  <span>Ver Detalhes</span>
                  <ExternalLink className="size-5 ml-1 text-muted-foreground" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  $WZ Disponíveis
                </span>
                <div className="text-xl font-bold tracking-tight text-foreground font-mono">
                  {Number(tokenWallet?.balance || 0).toLocaleString()} $WZ
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  $WZ em Liberação Gradual
                </span>
                <div className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                  {Number(tokenWallet?.balance_pending_maturity || 0).toLocaleString()} $WZ
                </div>
              </div>
            </div>
          </div>

          {/* Últimas Movimentações no Ecossistema */}
          <div className="bg-card border border-border/60 rounded-lg p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Últimas Movimentações
              </h2>
              <button
                type="button"
                onClick={() => setActivePillar("feed")}
                className="h-11 min-h-11 px-3 inline-flex items-center text-xs text-primary font-semibold hover:underline cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg"
              >
                Ver Extrato Completo
              </button>
            </div>

            {feed.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                Nenhuma movimentação registrada neste período.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {feed.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedEventDetail(item)}
                    className="w-full text-left flex items-center justify-between py-3 hover:bg-muted/20 px-2 rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        {item.direction === "INCOMING" ? (
                          <ArrowDownLeft className="size-5" />
                        ) : (
                          <ArrowUpRight className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {item.description}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.sourceDomain}</span>
                          <span>•</span>
                          <span>{new Date(item.occurredAt).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          item.direction === "INCOMING"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        )}
                      >
                        {item.direction === "INCOMING" ? "+" : "-"} {formatCents(item.amountCents)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PILAR 2: EXTRATO UNIFICADO BANCÁRIO */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activePillar === "feed" && (
        <div className="space-y-4">
          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-lg border border-border/40">
              {[
                { label: "Todos", value: "ALL" },
                { label: "Carteira", value: "WALLET" },
                { label: "Pedidos", value: "ORDERS" },
                { label: "Mobilidade", value: "MOBILITY" },
                { label: "Ingressos", value: "TICKETS" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFeedFilterDomain(tab.value)}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                    feedFilterDomain === tab.value
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar no extrato..."
                className="h-11 rounded-lg pl-10 text-xs sm:text-sm bg-card border-border/60"
              />
            </div>
          </div>

          {/* Lista de Transações */}
          {filteredFeed.length === 0 ? (
            <div className="bg-card border border-border/60 rounded-lg p-8 sm:p-12 text-center space-y-3 shadow-xs">
              <div className="size-12 rounded-lg bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Receipt className="size-6" />
              </div>
              <h3 className="font-semibold text-base text-foreground">
                Nenhuma transação encontrada
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Não há registros com os filtros aplicados para este período.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border/60 rounded-lg divide-y divide-border/40 shadow-xs overflow-hidden">
              {filteredFeed.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedEventDetail(item)}
                  className="w-full text-left flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                      {item.direction === "INCOMING" ? (
                        <ArrowDownLeft className="size-5" />
                      ) : (
                        <ArrowUpRight className="size-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {item.description}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="font-medium text-foreground/80">{item.sourceDomain}</span>
                        <span>•</span>
                        <span>{new Date(item.occurredAt).toLocaleDateString("pt-BR")}</span>
                        {item.counterpartyName && (
                          <>
                            <span>•</span>
                            <span className="truncate">{item.counterpartyName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={cn(
                        "text-sm sm:text-base font-semibold font-mono",
                        item.direction === "INCOMING"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                      )}
                    >
                      {item.direction === "INCOMING" ? "+" : "-"} {formatCents(item.amountCents)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PILAR 3: PLANEJAMENTO & CATEGORIAS */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activePillar === "planning" && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Orçamento e Categorias
              </h2>
              <p className="text-xs text-muted-foreground">
                Acompanhe o consumo mensal por área e importe extratos OFX.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsOfxModalOpen(true)}
              className="rounded-lg h-11 min-h-11 px-4 text-xs font-semibold gap-2 border-border/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <Upload className="size-5" />
              <span>Importar OFX</span>
            </Button>
          </div>

          {/* Distribuição por Categoria */}
          <div className="bg-card border border-border/60 rounded-lg p-4 sm:p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Despesas por Categoria ({summary.byCategory.length})
            </h3>

            {summary.byCategory.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Nenhuma despesa categorizada para este mês.
              </p>
            ) : (
              <div className="space-y-3">
                {summary.byCategory.map((cat) => (
                  <div key={cat.categoryId || cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded-full shrink-0 bg-primary" />
                        <span className="font-semibold text-foreground">{cat.name}</span>
                        <span className="text-muted-foreground">({cat.count})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{cat.percentage}%</span>
                        <span className="font-semibold text-foreground">
                          {formatCents(cat.totalCents)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-opacity duration-300 bg-primary motion-reduce:transition-none"
                        style={{
                          width: `${Math.min(100, Math.max(3, cat.percentage))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PILAR 4: CONTA R$ MOVIMENTÁVEL */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activePillar === "account" && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-card border border-border/60 rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground block">
                  Carteira Digital Waesy
                </span>
                <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-mono mt-1">
                  {formatCents(wallet?.availableCents || 0)}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="size-5" />
                  Conta Ativa
                </span>
                <span className="text-xs text-muted-foreground">
                  Partidas Dobradas • Append-Only
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button
                onClick={() => setIsDepositOpen(true)}
                className="rounded-lg h-11 min-h-11 px-4 text-xs font-semibold gap-2 bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <Plus className="size-5" />
                <span>Adicionar Saldo (Pix)</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsTransferOpen(true)}
                className="rounded-lg h-11 min-h-11 px-4 text-xs font-semibold gap-2 border-border/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <ArrowLeftRight className="size-5" />
                <span>Transferir P2P Waesy</span>
              </Button>
            </div>
          </div>

          {/* ── Cartão de Crédito e Faturas Waesy Bank ── */}
          <div className="pt-2">
            <CreditCardInvoiceView
              onVirtualCardClick={() => setIsCardSettingsOpen(true)}
              onAdjustLimitClick={() => setIsCardSettingsOpen(true)}
              onPayInvoiceClick={(inv) => {
                toast.info(`Iniciando pagamento da fatura de ${inv.fullLabel}`);
                setIsPixHubOpen(true);
              }}
            />
          </div>

          <div className="bg-card border border-border/60 rounded-lg p-4 sm:p-5 shadow-xs space-y-2">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Garantias e Segurança da Conta
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O saldo da sua conta é mantido em custódia estrita com segregação patrimonial. Todas as
              transferências geram comprovantes criptográficos invioláveis com assinatura HMAC-SHA256.
            </p>
          </div>
        </div>
      )}

      {/* ── MODAL: DETALHES DO EVENTO / COMPROVANTE (BIDIRECIONAL) ── */}
      {selectedEventDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 motion-reduce:transition-none">
          <button
            type="button"
            aria-label="Fechar modal"
            onClick={() => setSelectedEventDetail(null)}
            className="fixed inset-0 bg-background/80 backdrop-blur-xs cursor-default focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          />
          <div
            className="relative z-10 bg-card border border-border/80 w-full sm:max-w-lg rounded-t-lg sm:rounded-lg p-5 sm:p-6 shadow-xs max-h-screen overflow-y-auto space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Detalhes do Lançamento
              </h3>
              <button
                type="button"
                onClick={() => setSelectedEventDetail(null)}
                className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-center py-2">
                <span
                  className={cn(
                    "text-3xl font-bold font-mono tracking-tight",
                    selectedEventDetail.direction === "INCOMING"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-foreground"
                  )}
                >
                  {selectedEventDetail.direction === "INCOMING" ? "+" : "-"}{" "}
                  {formatCents(selectedEventDetail.amountCents)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedEventDetail.description}
                </p>
              </div>

              <div className="bg-muted/40 rounded-lg p-3 space-y-2 text-xs border border-border/40">
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Domínio:</span>
                  <span className="font-semibold text-foreground">
                    {selectedEventDetail.sourceDomain}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Data e Hora:</span>
                  <span className="font-semibold text-foreground">
                    {new Date(selectedEventDetail.occurredAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                {selectedEventDetail.counterpartyName && (
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Contraparte:</span>
                    <span className="font-semibold text-foreground">
                      {selectedEventDetail.counterpartyName}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedEventDetail.status}
                  </span>
                </div>
              </div>

              {/* Ações Bidirecionais */}
              <div className="space-y-2 pt-2">
                {selectedEventDetail.referenceUrl && (
                  <Button
                    asChild
                    className="w-full rounded-lg h-11 min-h-11 text-xs font-semibold gap-2 bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <Link to={selectedEventDetail.referenceUrl as any}>
                      <span>Acessar Entidade de Origem</span>
                      <ExternalLink className="size-5" />
                    </Link>
                  </Button>
                )}

                {selectedEventDetail.receiptId && (
                  <Button
                    variant="outline"
                    onClick={() => handleOpenReceiptById(selectedEventDetail.receiptId!)}
                    className="w-full rounded-lg h-11 min-h-11 text-xs font-semibold gap-2 border-border/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <FileText className="size-5" />
                    <span>Ver Comprovante Oficial</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Área Pix Unificada 99Pay */}
      <PixHubDrawer
        open={isPixHubOpen}
        onOpenChange={setIsPixHubOpen}
        onSelectAction={(act) => {
          setIsPixHubOpen(false);
          if (act === "transfer") setIsTransferOpen(true);
          else if (act === "qrcode") toast.info("Scanner QR Code Pix");
          else if (act === "receive") toast.info("Minhas Chaves Pix para Recebimento");
          else if (act === "schedule") toast.info("Agendamento de Pix");
          else if (act === "copy_paste") toast.info("Pix Copia e Cola");
          else if (act === "card_pix") toast.info("Pix parcelado no cartão");
        }}
      />

      {/* Drawer: Configurações do Cartão Virtual */}
      <CardSettingsDrawer
        open={isCardSettingsOpen}
        onOpenChange={setIsCardSettingsOpen}
      />

      {/* Sheet: Simulação de Empréstimo */}
      <LoanSimulationSheet
        open={isLoanSimulationOpen}
        onOpenChange={setIsLoanSimulationOpen}
        onConfirmLoan={(details) => {
          toast.success(`Empréstimo de ${formatCents(details.amountCents)} contratado com sucesso!`);
          setIsInstallmentTimelineOpen(true);
        }}
      />

      {/* Drawer: Cronograma de Parcelas */}
      <InstallmentTimelineDrawer
        open={isInstallmentTimelineOpen}
        onOpenChange={setIsInstallmentTimelineOpen}
      />

      {/* Modal: Sucesso Transacional Animado */}
      {isSuccessReceiptOpen && lastPaymentSuccess && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <PaymentSuccessReceipt
              amountCents={lastPaymentSuccess.amountCents}
              recipientName={lastPaymentSuccess.recipientName}
              transactionId={lastPaymentSuccess.transactionId}
              onViewReceipt={() => {
                setIsSuccessReceiptOpen(false);
              }}
              onDone={() => setIsSuccessReceiptOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── MODAL: COMPROVANTE OFICIAL VERIFICÁVEL COM HMAC ── */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 motion-reduce:transition-none">
          <button
            type="button"
            aria-label="Fechar comprovante"
            onClick={() => setActiveReceipt(null)}
            className="fixed inset-0 bg-background/80 backdrop-blur-xs cursor-default focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          />
          <div
            className="relative z-10 bg-card border border-border/80 max-w-md w-full rounded-lg p-5 sm:p-6 shadow-xs space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Comprovante de Transação</h3>
                <span className="text-xs text-muted-foreground">{activeReceipt.emitterName}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="text-center py-2 border-b border-border/30">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Valor Transferido
              </span>
              <div className="text-3xl font-bold font-mono text-foreground mt-1">
                {formatCents(activeReceipt.amountCents)}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Código de Autenticação:</span>
                <span className="font-mono font-semibold text-foreground">
                  {activeReceipt.authenticationCode}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Pagador:</span>
                <span className="font-semibold text-foreground">{activeReceipt.payerName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Recebedor:</span>
                <span className="font-semibold text-foreground">{activeReceipt.payeeName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Data e Horário:</span>
                <span className="font-semibold text-foreground">
                  {new Date(activeReceipt.issuedAt).toLocaleString("pt-BR")}
                </span>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/40 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Shield className="size-5" />
                <span>Assinatura Digital HMAC-SHA256</span>
              </div>
              <div className="text-xs font-mono text-muted-foreground break-all">
                {activeReceipt.hmacSignature.slice(0, 32)}...
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(activeReceipt.authenticationCode);
                toast.success("Código copiado!");
              }}
              className="w-full rounded-lg h-11 min-h-11 text-xs font-semibold gap-2 border-border/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <Copy className="size-5" />
              <span>Copiar Código de Autenticação</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── MODAL: TRANSFERÊNCIA P2P ── */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 motion-reduce:transition-none">
          <button
            type="button"
            aria-label="Fechar transferência"
            onClick={() => setIsTransferOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-xs cursor-default focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          />
          <div
            className="relative z-10 bg-card border border-border/80 w-full sm:max-w-md rounded-t-lg sm:rounded-lg p-5 sm:p-6 shadow-xs space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Transferência P2P Waesy
              </h3>
              <button
                type="button"
                onClick={() => setIsTransferOpen(false)}
                className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteP2P} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ID do Destinatário (UUID)
                </label>
                <Input
                  type="text"
                  placeholder="ID de perfil do usuário..."
                  value={transferRecipientId}
                  onChange={(e) => setTransferRecipientId(e.target.value)}
                  required
                  className="h-11 rounded-lg bg-card border-border/80 text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Valor (R$)
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={transferAmountStr}
                  onChange={(e) => setTransferAmountStr(e.target.value)}
                  required
                  className="h-11 rounded-lg bg-card border-border/80 text-lg font-bold"
                />
                <span className="text-xs text-muted-foreground block">
                  Disponível em carteira: {formatCents(wallet?.availableCents || 0)}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Descrição / Motivo
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Divisão de almoço, pagamento..."
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  className="h-11 rounded-lg bg-card border-border/80 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTransferOpen(false)}
                  className="h-11 min-h-11 px-5 rounded-lg border-border/80 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 min-h-11 px-6 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {isSubmitting ? "Transferindo..." : "Confirmar Transferência"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DEPÓSITO PIX EM CARTEIRA ── */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 motion-reduce:transition-none">
          <button
            type="button"
            aria-label="Fechar depósito"
            onClick={() => setIsDepositOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-xs cursor-default focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          />
          <div
            className="relative z-10 bg-card border border-border/80 w-full sm:max-w-md rounded-t-lg sm:rounded-lg p-5 sm:p-6 shadow-xs space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Recarga de Saldo via Pix
              </h3>
              <button
                type="button"
                onClick={() => setIsDepositOpen(false)}
                className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteDeposit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Valor a Recarregar (R$)
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="50,00"
                  value={depositAmountStr}
                  onChange={(e) => setDepositAmountStr(e.target.value)}
                  required
                  className="h-11 rounded-lg bg-card border-border/80 text-lg font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDepositOpen(false)}
                  className="h-11 min-h-11 px-5 rounded-lg border-border/80 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 min-h-11 px-6 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {isSubmitting ? "Creditando..." : "Confirmar Recarga"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: IMPORTAÇÃO DE EXTRATO OFX ── */}
      {isOfxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 motion-reduce:transition-none">
          <button
            type="button"
            aria-label="Fechar importação"
            onClick={() => setIsOfxModalOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-xs cursor-default focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          />
          <div
            className="relative z-10 bg-card border border-border/80 w-full max-w-lg rounded-lg p-5 sm:p-6 shadow-xs space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Importar Extrato Bancário (OFX)
              </h3>
              <button
                type="button"
                onClick={() => setIsOfxModalOpen(false)}
                className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleImportOfx} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Conteúdo do Arquivo OFX
                </label>
                <textarea
                  rows={8}
                  placeholder="Cole aqui o conteúdo textual do seu arquivo .ofx baixado do banco..."
                  value={ofxContentInput}
                  onChange={(e) => setOfxContentInput(e.target.value)}
                  className="w-full p-3 rounded-lg bg-card border border-border/80 text-xs font-mono focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  required
                />
                <span className="text-xs text-muted-foreground block">
                  As transações são inseridas exclusivamente no seu Livro Financeiro Pessoal com
                  deduplicação automática por FITID.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOfxModalOpen(false)}
                  className="h-11 min-h-11 px-5 rounded-lg border-border/80 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isImportingOfx}
                  className="h-11 min-h-11 px-6 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {isImportingOfx ? "Importando..." : "Importar Transações"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NOVO LANÇAMENTO PESSOAL (COM OCR) ── */}
      {isNewEntryOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 motion-reduce:transition-none">
          <button
            type="button"
            aria-label="Fechar lançamento"
            onClick={() => setIsNewEntryOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-xs cursor-default focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          />
          <div
            className="relative z-10 bg-card border border-border/80 w-full sm:max-w-lg rounded-t-lg sm:rounded-lg p-5 sm:p-6 shadow-xs max-h-screen overflow-y-auto space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Novo Lançamento Pessoal
              </h3>
              <button
                type="button"
                onClick={() => setIsNewEntryOpen(false)}
                className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-4">
              {/* Toggle Despesa / Receita */}
              <div className="grid grid-cols-2 gap-2 bg-muted/60 p-1 rounded-lg border border-border/40">
                <button
                  type="button"
                  onClick={() => setEntryType("expense")}
                  className={cn(
                    "h-11 min-h-11 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                    entryType === "expense"
                      ? "bg-rose-600 text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ArrowUpRight className="size-5" />
                  <span>Despesa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType("income")}
                  className={cn(
                    "h-11 min-h-11 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                    entryType === "income"
                      ? "bg-emerald-600 text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ArrowDownLeft className="size-5" />
                  <span>Receita</span>
                </button>
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Valor (R$)
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  required
                  className="h-11 rounded-lg bg-card border-border/80 text-xl font-bold"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Descrição
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Almoço, Supermercado, Salário..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="h-11 rounded-lg bg-card border-border/80 text-xs"
                />
              </div>

              {/* Categoria */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Categoria
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border border-border/40 rounded-lg bg-muted/30">
                  {availableCategories.map((cat: any) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={cn(
                        "h-11 min-h-11 px-3 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors text-left truncate cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                        selectedCategoryId === cat.id
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "bg-card text-foreground hover:bg-muted border border-border/40"
                      )}
                    >
                      <div className="size-3 shrink-0 rounded-full bg-primary" />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Data & Forma de Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Data
                  </label>
                  <Input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    required
                    className="h-11 rounded-lg bg-card border-border/80 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full h-11 px-3 rounded-lg bg-card border border-border/80 text-xs font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <option value="pix">Pix</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="debit_card">Cartão de Débito</option>
                    <option value="cash">Dinheiro em Espécie</option>
                    <option value="transfer">Transferência</option>
                    <option value="boleto">Boleto</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
              </div>

              {/* Comprovante / OCR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Comprovante / Recibo
                  </label>
                  {receiptUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isAnalyzingOcr}
                      onClick={async () => {
                        setIsAnalyzingOcr(true);
                        try {
                          const result = await analyzeReceiptWithAI({
                            data: { imageUrl: receiptUrl },
                          });
                          if (result.amountCents) {
                            setAmountStr((result.amountCents / 100).toFixed(2).replace(".", ","));
                          }
                          if (result.description) {
                            const enrichedDesc = result.establishmentName && !result.description.includes(result.establishmentName)
                              ? `${result.description} — ${result.establishmentName}`
                              : result.description;
                            setDescription(enrichedDesc);
                          }
                          if (result.entryDate) setEntryDate(result.entryDate);
                          if (result.suggestedCategory && availableCategories.length > 0) {
                            const matchedCat = availableCategories.find(
                              (c: any) => String(c.name || "").toLowerCase() === String(result.suggestedCategory || "").toLowerCase()
                            );
                            if (matchedCat) setSelectedCategoryId(matchedCat.id);
                          }
                          toast.success("Comprovante e categoria preenchidos com IA!");
                        } catch (err: any) {
                          toast.error(err.message || "Falha no OCR.");
                        } finally {
                          setIsAnalyzingOcr(false);
                        }
                      }}
                      className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold text-primary hover:bg-primary/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      {isAnalyzingOcr ? (
                        <>
                          <Activity className="size-5 animate-spin" />
                          <span>Lendo...</span>
                        </>
                      ) : (
                        <span>Analisar com IA</span>
                      )}
                    </Button>
                  )}
                </div>
                <ImageUpload
                  value={receiptUrl}
                  onChange={(url) => setReceiptUrl(url)}
                  onRemove={() => setReceiptUrl("")}
                  bucket="receipts"
                  variant="minimal"
                  helperText="Anexe foto do comprovante para preenchimento por IA"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewEntryOpen(false)}
                  className="h-11 min-h-11 px-5 rounded-lg border-border/80 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 min-h-11 px-6 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {isSubmitting ? "Salvando..." : "Salvar Lançamento"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
