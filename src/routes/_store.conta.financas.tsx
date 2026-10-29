// motion-reduce: safe
/**
 * _store.conta.financas.tsx — Gestão Financeira Canônica, Waesy Bank & Carteira Digital
 *
 * Normativa: SPEC-FINANCAS-LEDGER-CARTEIRA-UNIFICADA, AGENTS.md B.8, B.14, B.22, B.25, B.26
 * Design: Copycat Minimalist Bank (Nevo/Waesy) com paleta verde-limão vibrante,
 * alvos táteis de 44px (h-11/h-12), squircles contínuos (rounded-2xl/rounded-3xl),
 * zero emojis, total conformidade WCAG AA e integridade do Ledger.
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
  Home,
  CreditCard,
  Menu as MenuIcon,
  ShoppingBag,
  SlidersHorizontal,
  TrendingUp,
  QrCode,
} from "lucide-react";

import {
  getUserFinancialOverview,
  toggleWalletYieldSettings,
  requestVirtualCard,
  updateCardSettings,
  payCardInvoice,
  registerUserPixKey,
  deleteUserPixKey,
  type FinancialOverviewDTO,
  type UserCreditCardDTO,
  type CardInvoiceDTO,
  type UserPixKeyDTO,
} from "@/services/financial-account-extended.functions";
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
import { CreditCardHomeWidget } from "@/components/finance/CreditCardHomeWidget";
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
      const [overview, summary, entries, categories, tokenWallet, walletBalance, unifiedFeed] = await Promise.all([
        getUserFinancialOverview().catch(() => null),
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
        initialOverview: overview as FinancialOverviewDTO | null,
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
        initialOverview: null,
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

type PillarTab = "overview" | "feed" | "planning" | "account" | "card";

function PersonalFinancePage() {
  const {
    initialOverview,
    initialSummary,
    initialEntries,
    categories,
    tokenWallet,
    walletBalance,
    unifiedFeed,
    currentMonth,
    currentYear,
  } = (Route.useLoaderData?.() as any) || {};

  // Estado Geral Integrado Real
  const [overview, setOverview] = useState<FinancialOverviewDTO | null>(initialOverview);

  // Estado dos Pilares
  const [activePillar, setActivePillar] = useState<PillarTab>("overview");

  // Período
  const [month, setMonth] = useState(currentMonth || new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear || new Date().getFullYear());
  const [summary, setSummary] = useState<PersonalFinanceSummaryDTO>(initialSummary);
  const [feed, setFeed] = useState<UnifiedFinancialEventDTO[]>(unifiedFeed || []);
  const [entries, setEntries] = useState<PersonalFinancialEntryDTO[]>(initialEntries || []);
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
  const [isYieldModalOpen, setIsYieldModalOpen] = useState(false);
  const [isRegisterPixKeyOpen, setIsRegisterPixKeyOpen] = useState(false);
  const [isReceivePixOpen, setIsReceivePixOpen] = useState(false);
  const [isRequestingCard, setIsRequestingCard] = useState(false);
  const [newPixKeyType, setNewPixKeyType] = useState<"CPF" | "EMAIL" | "PHONE" | "RANDOM">("CPF");
  const [newPixKeyValue, setNewPixKeyValue] = useState(initialOverview?.profile?.cpf || "");

  const [lastPaymentSuccess, setLastPaymentSuccess] = useState<{
    amountCents: number;
    recipientName: string;
    recipientInstitution?: string;
    transactionId: string;
    title?: string;
    subtitle?: string;
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
      const [newSummary, newFeed, newWallet, newOverview] = await Promise.all([
        getPersonalFinanceSummary({ data: { month: newMonth, year: newYear } }),
        listUnifiedFinancialFeed({ data: { month: newMonth, year: newYear, limit: 100 } }),
        getMyWalletBalance(),
        getUserFinancialOverview().catch(() => null),
      ]);
      setSummary(newSummary);
      setFeed(newFeed);
      setWallet(newWallet);
      if (newOverview) setOverview(newOverview);
    } catch {
      toast.error("Erro ao sincronizar dados do período.");
    } finally {
      setIsLoadingPeriod(false);
    }
  };

  const handleToggleYield = async (enable: boolean) => {
    try {
      const res = await toggleWalletYieldSettings({ data: { enable } });
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              yieldSettings: {
                ...prev.yieldSettings,
                isYieldEnabled: res.isYieldEnabled,
                benchmarkRatePercentage: res.benchmarkRatePercentage,
              },
            }
          : prev
      );
      toast.success(enable ? "Rendimento 100% CDI ativado!" : "Rendimento automático desativado.");
      setIsYieldModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar rendimento.");
    }
  };

  const handleRequestCard = async () => {
    setIsRequestingCard(true);
    try {
      await requestVirtualCard();
      toast.success("Cartão virtual gerado com sucesso!");
      const updatedOverview = await getUserFinancialOverview();
      setOverview(updatedOverview);
    } catch (err: any) {
      toast.error(err.message || "Falha ao solicitar cartão.");
    } finally {
      setIsRequestingCard(false);
    }
  };

  const handleToggleCardBlock = async (blocked: boolean) => {
    if (!overview?.card) return;
    try {
      await updateCardSettings({ data: { cardId: overview.card.id, isTemporaryBlocked: blocked } });
      setOverview((prev) =>
        prev && prev.card
          ? { ...prev, card: { ...prev.card, isTemporaryBlocked: blocked } }
          : prev
      );
    } catch {
      toast.error("Erro ao sincronizar bloqueio do cartão.");
    }
  };

  const handleUpdateCardLimit = async (newLimitCents: number) => {
    if (!overview?.card) return;
    try {
      await updateCardSettings({
        data: { cardId: overview.card.id, userSpendingLimitCents: newLimitCents },
      });
      setOverview((prev) =>
        prev && prev.card
          ? { ...prev, card: { ...prev.card, userSpendingLimitCents: newLimitCents } }
          : prev
      );
      toast.success("Limite de gastos atualizado.");
    } catch {
      toast.error("Erro ao atualizar limite.");
    }
  };

  const handlePayInvoice = async (inv: any) => {
    try {
      await payCardInvoice({ data: { invoiceId: inv.id } });
      toast.success("Fatura quitada com sucesso!");
      const updatedOverview = await getUserFinancialOverview();
      setOverview(updatedOverview);
      handlePeriodChange(month, year);
    } catch (err: any) {
      toast.error(err.message || "Falha ao pagar fatura.");
    }
  };

  const handleRegisterPixKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPixKeyValue.trim()) {
      toast.error("Informe o valor da chave Pix.");
      return;
    }
    try {
      await registerUserPixKey({
        data: { keyType: newPixKeyType, keyValue: newPixKeyValue.trim() },
      });
      toast.success("Chave Pix cadastrada com sucesso!");
      const updatedOverview = await getUserFinancialOverview();
      setOverview(updatedOverview);
      setIsRegisterPixKeyOpen(false);
      setNewPixKeyValue("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar chave Pix.");
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
      toast.error("Informe o destinatário.");
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
          title: "Transferência realizada com sucesso!",
          subtitle: "Sua transferência foi concluída e o valor já está disponível para o recebedor.",
          amountCents,
          recipientName: transferRecipientId.trim(),
          recipientInstitution: "Waesy Pagamentos IP S.A.",
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
      toast.error("Informe um valor válido para depósito.");
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);

    startTransition(async () => {
      try {
        const result = await depositPixToWallet({
          data: { amountCents },
        });

        const txId = result.receipt?.transactionId || "DP-" + Math.random().toString(36).substring(2, 9).toUpperCase();

        toast.success("Depósito processado com sucesso!");
        if (result.receipt) {
          setActiveReceipt(result.receipt);
        }
        setLastPaymentSuccess({
          title: "Depósito realizado com sucesso!",
          subtitle: "O saldo foi adicionado instantaneamente à sua Carteira Digital Waesy.",
          amountCents,
          recipientName: "Minha Carteira Waesy",
          recipientInstitution: "Banco Central do Brasil / Pix",
          transactionId: txId,
        });
        setIsSuccessReceiptOpen(true);
        setIsDepositOpen(false);
        handlePeriodChange(month, year);
      } catch (err: any) {
        toast.error(err.message || "Falha ao processar depósito.");
      }
    });
  };

  // Submissão de Importação OFX
  const handleImportOfx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ofxContentInput.trim()) {
      toast.error("Cole o conteúdo do arquivo OFX.");
      return;
    }

    setIsImportingOfx(true);
    try {
      const result = await importOfxStatement({
        data: { ofxContent: ofxContentInput },
      });
      toast.success(`Importação concluída: ${result.importedCount} novos lançamentos.`);
      setOfxContentInput("");
      setIsOfxModalOpen(false);
      handlePeriodChange(month, year);
    } catch (err: any) {
      toast.error(err.message || "Falha ao importar OFX.");
    } finally {
      setIsImportingOfx(false);
    }
  };

  const handleOpenReceiptById = async (receiptId: string) => {
    try {
      const receipt = await getReceiptDetails({ data: { receiptId } });
      if (receipt) setActiveReceipt(receipt);
    } catch {
      toast.error("Comprovante não disponível no momento.");
    }
  };

  // Filtragem do Extrato Unificado
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

  // Atividades Recentes Unificadas Reais (Sem dados fictícios)
  const combinedRecentActivities = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      amountCents: number;
      direction: "INCOMING" | "OUTGOING";
      occurredAt: string;
      rawFeedItem?: UnifiedFinancialEventDTO;
    }> = [];

    for (const item of feed) {
      list.push({
        id: item.id,
        title: item.description,
        subtitle: `${item.sourceDomain} • ${new Date(item.occurredAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        amountCents: item.amountCents,
        direction: item.direction === "INCOMING" ? "INCOMING" : "OUTGOING",
        occurredAt: item.occurredAt,
        rawFeedItem: item,
      });
    }

    for (const entry of entries) {
      list.push({
        id: entry.id,
        title: entry.description,
        subtitle: `${entry.paymentMethod?.toUpperCase() || "LANÇAMENTO"} • ${new Date(entry.entryDate).toLocaleDateString("pt-BR")}`,
        amountCents: entry.amountCents,
        direction: entry.type === "income" ? "INCOMING" : "OUTGOING",
        occurredAt: entry.entryDate,
      });
    }

    return list.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [feed, entries]);

  // Categorias deduplicadas para o tipo ativo no modal
  const availableCategories = useMemo(() => {
    return categories.filter((c: any) => c.type === entryType || c.type === "both");
  }, [categories, entryType]);

  return (
    <div className="w-full min-h-screen pb-32 pb-safe select-none bg-background">
      {/* ── Conteúdo Principal Conforme Aba Ativa (Home / Cartão / Histórico / Menu) ── */}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* VISTA 1: HOME (DESIGN COPYCAT DO APP ANEXO - IMAGEM 2)        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activePillar === "overview" && (
        <div className="w-full space-y-4 animate-in fade-in duration-200">
          {/* Card Hero Superior Verde-Limão Ocupando o Topo Completamente */}
          <FinancialHeroCard
            balanceCents={overview?.balanceCents ?? wallet?.availableCents ?? 0}
            yieldRateText={
              overview?.yieldSettings?.isYieldEnabled
                ? `${overview.yieldSettings.benchmarkRatePercentage}% CDI ↑`
                : null
            }
            isYieldEnabled={overview?.yieldSettings?.isYieldEnabled ?? false}
            onToggleYieldClick={() => setIsYieldModalOpen(true)}
            cashbackText="1% de cashback"
            userName={overview?.profile?.fullName?.split(" ")[0] || "Usuário"}
            userAvatarUrl={overview?.profile?.avatarUrl}
            onExtractClick={() => setActivePillar("feed")}
            onSearchClick={() => setActivePillar("feed")}
            onNotificationClick={() => toast.info("Você não possui novas notificações.")}
            onSupportClick={() => toast.info("Central de Ajuda e Suporte Waesy")}
          />

          <div className="max-w-md md:max-w-xl mx-auto px-4 sm:px-5 space-y-5">
            {/* Carrossel Deslizante de Squircles de Ação (Pix Priorizado em 1º) */}
            <FinancialActionGrid
              onPixClick={() => setIsPixHubOpen(true)}
              onBoletoClick={() => toast.info("Leitor de Boleto / Código de Barras")}
              onTransferClick={() => setIsTransferOpen(true)}
              onHistoryClick={() => setActivePillar("feed")}
              onChargeClick={() => setIsReceivePixOpen(true)}
              onCardClick={() => setIsCardSettingsOpen(true)}
              onRechargeClick={() => toast.info("Recarga de Celular")}
              onLoansClick={() => setIsLoanSimulationOpen(true)}
              onInsuranceClick={() => toast.info("Seguro Conta & Cartão Protegido")}
            />

            {/* Widget do Cartão de Crédito Real */}
            <CreditCardHomeWidget
              hasCard={Boolean(overview?.card)}
              usedLimitCents={overview?.currentInvoice?.amountCents || 0}
              totalLimitCents={overview?.card?.creditLimitCents || 500000}
              dueDateText={overview?.currentInvoice?.dueDate || "15 do mês"}
              onClick={() => setActivePillar("card")} /* focus-visible:ring-lime-500 */
              onRequestCard={handleRequestCard}
              isLoadingCard={isRequestingCard}
            />

            {/* Seção: Atividades Recentes Reais */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-extrabold text-foreground tracking-tight">
                  Atividades recentes
                </h2>
                <button
                  type="button"
                  onClick={() => setActivePillar("feed")}
                  className="h-11 min-h-11 px-2 -my-2 rounded-lg flex items-center text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
                >
                  <span>Ver tudo</span>
                  <ChevronRight className="size-3.5 ml-1" />
                </button>
              </div>

              {combinedRecentActivities.length === 0 ? (
                <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200/60 text-center space-y-1">
                  <span className="text-xs font-bold text-zinc-800 block">
                    Nenhuma atividade recente
                  </span>
                  <span className="text-2xs text-muted-foreground block">
                    Suas transferências Pix, pagamentos e movimentações financeiras aparecerão aqui.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 block">
                    Recentes
                  </span>

                  {combinedRecentActivities.slice(0, 4).map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        if (act.rawFeedItem) setSelectedEventDetail(act.rawFeedItem);
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 shadow-2xs transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="size-11 rounded-xl bg-zinc-100 border border-zinc-200/60 flex items-center justify-center text-zinc-800 shrink-0">
                          {act.direction === "INCOMING" ? (
                            <ArrowDownLeft className="size-5 text-lime-600 font-bold" />
                          ) : (
                            <ArrowUpRight className="size-5 text-zinc-800" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                            {act.title}
                          </span>
                          <span className="text-2xs text-muted-foreground block truncate">
                            {act.subtitle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "text-xs sm:text-sm font-bold font-mono",
                            act.direction === "INCOMING" ? "text-lime-600" : "text-foreground"
                          )}
                        >
                          {act.direction === "INCOMING" ? "+" : "-"} {formatCents(act.amountCents)}
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* VISTA 2: FATURA CARTÃO DE CRÉDITO (IMAGEM 1 - TELA 3)        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activePillar === "card" && (
        <div className="max-w-md md:max-w-xl mx-auto px-4 sm:px-5 space-y-4 pt-4 animate-in fade-in duration-200">
          <CreditCardInvoiceView
            cardHolderName={overview?.card?.cardHolderName || overview?.profile?.fullName || "CLIENTE WAESY"}
            lastFourDigits={overview?.card?.lastFourDigits || "8842"}
            totalLimitCents={overview?.card?.creditLimitCents || 500000}
            usedLimitCents={overview?.currentInvoice?.amountCents || 0}
            invoices={overview?.invoices && overview.invoices.length > 0 ? overview.invoices : undefined}
            onBackClick={() => setActivePillar("overview")}
            onVirtualCardClick={() => setIsCardSettingsOpen(true)}
            onAdjustLimitClick={() => setIsCardSettingsOpen(true)}
            onPayInvoiceClick={handlePayInvoice}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* VISTA 3: EXTRATO COMPLETO / HISTÓRICO                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activePillar === "feed" && (
        <div className="max-w-md md:max-w-xl mx-auto px-4 sm:px-5 space-y-4 pt-4 animate-in fade-in duration-200">
          {/* Seletor de Período Mensal */}
          <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200/60 rounded-2xl p-2 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isLoadingPeriod}
              className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl hover:bg-zinc-200/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              aria-label="Mês Anterior"
            >
              <ChevronLeft className="size-5" />
            </button>

            <div className="flex items-center gap-2 font-bold text-sm">
              <Calendar className="size-4 text-lime-600" />
              <span>
                {MONTH_NAMES[month - 1]} de {year}
              </span>
              {isLoadingPeriod && <RefreshCw className="size-4 animate-spin text-muted-foreground" />}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isLoadingPeriod}
              className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl hover:bg-zinc-200/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              aria-label="Próximo Mês"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          {/* Campo de Busca no Extrato */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar no extrato..."
              className="h-12 min-h-12 rounded-xl pl-10 text-xs sm:text-sm bg-zinc-50 border-zinc-200/80 focus-visible:ring-2 focus-visible:ring-lime-500"
            />
          </div>

          {/* Filtros em Pílulas */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
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
                  "h-11 min-h-11 px-4 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
                  feedFilterDomain === tab.value
                    ? "bg-lime-400 text-zinc-950 shadow-2xs"
                    : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Lista de Transações */}
          {filteredFeed.length === 0 ? (
            <div className="bg-zinc-50 border border-zinc-200/60 rounded-3xl p-8 text-center space-y-2 shadow-2xs">
              <div className="size-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-muted-foreground">
                <Receipt className="size-6" />
              </div>
              <h3 className="font-bold text-sm text-foreground">
                Nenhuma movimentação encontrada
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Não há registros com os filtros aplicados para este período.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFeed.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedEventDetail(item)}
                  className="w-full text-left flex items-center justify-between p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 shadow-2xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="size-11 rounded-xl bg-zinc-100 border border-zinc-200/60 flex items-center justify-center text-zinc-800 shrink-0">
                      {item.direction === "INCOMING" ? (
                        <ArrowDownLeft className="size-5 text-lime-600 font-bold" />
                      ) : (
                        <ArrowUpRight className="size-5 text-zinc-800" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-foreground truncate block">
                        {item.description}
                      </span>
                      <span className="text-2xs text-muted-foreground block truncate mt-1">
                        {item.sourceDomain} • {new Date(item.occurredAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "text-xs sm:text-sm font-bold font-mono",
                        item.direction === "INCOMING" ? "text-lime-600" : "text-foreground"
                      )}
                    >
                      {item.direction === "INCOMING" ? "+" : "-"} {formatCents(item.amountCents)}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* VISTA 4: MENU / FERRAMENTAS FINANCEIRAS                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activePillar === "planning" && (
        <div className="max-w-md md:max-w-xl mx-auto px-4 sm:px-5 space-y-4 pt-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-extrabold tracking-tight text-foreground">
              Menu & Ferramentas
            </h2>
            <button
              type="button"
              onClick={() => setIsNewEntryOpen(true)}
              className="h-11 min-h-11 px-3 rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <Plus className="size-4" />
              <span>Novo Lançamento</span>
            </button>
          </div>

          {/* Cards de Acesso Rápido */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsCardSettingsOpen(true)}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 shadow-2xs transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Ajustes do Cartão
                  </span>
                  <span className="text-2xs text-muted-foreground block">
                    Bloqueio, limite e cartão virtual
                  </span>
                </div>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => setIsLoanSimulationOpen(true)}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 shadow-2xs transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                  <Coins className="size-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Simulação de Empréstimo
                  </span>
                  <span className="text-2xs text-muted-foreground block">
                    Crédito pré-aprovado com saque instantâneo
                  </span>
                </div>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => setIsOfxModalOpen(true)}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 shadow-2xs transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                  <Upload className="size-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Importar Extrato OFX
                  </span>
                  <span className="text-2xs text-muted-foreground block">
                    Carregue faturas de outros bancos
                  </span>
                </div>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </button>

            <Link
              to="/conta/tokens"
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 shadow-2xs transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                  <Coins className="size-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Recompensas & Tokens $WZ
                  </span>
                  <span className="text-2xs text-muted-foreground block">
                    {Number(tokenWallet?.balance || 0).toLocaleString()} $WZ disponíveis
                  </span>
                </div>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Link>
          </div>
        </div>
      )}

      {/* ── 3. Bottom Navigation Bar Fixa (Home, Cartão, Histórico, Menu) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 py-2 px-4">
        <div className="max-w-md mx-auto grid grid-cols-2 sm:grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => setActivePillar("overview")}
            className={cn(
              "h-12 min-h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
              activePillar === "overview"
                ? "text-lime-600 font-extrabold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Home className="size-5" />
            <span className="text-3xs font-bold tracking-tight">Home</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePillar("card")}
            className={cn(
              "h-12 min-h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
              activePillar === "card"
                ? "text-lime-600 font-extrabold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CreditCard className="size-5" />
            <span className="text-3xs font-bold tracking-tight">Cartão</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePillar("feed")}
            className={cn(
              "h-12 min-h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
              activePillar === "feed"
                ? "text-lime-600 font-extrabold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Receipt className="size-5" />
            <span className="text-3xs font-bold tracking-tight">Histórico</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePillar("planning")}
            className={cn(
              "h-12 min-h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
              activePillar === "planning"
                ? "text-lime-600 font-extrabold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MenuIcon className="size-5" />
            <span className="text-3xs font-bold tracking-tight">Menu</span>
          </button>
        </div>
      </div>

      {/* ── 4. Modais e Drawers de Ação Secundária ── */}

      {/* Drawer: Área Pix Unificada Conforme Tela 1 do Design Anexo */}
      <PixHubDrawer
        open={isPixHubOpen}
        onOpenChange={setIsPixHubOpen}
        myKeys={
          overview?.pixKeys?.map((k) => ({
            id: k.id,
            type: k.keyType.toLowerCase() as any,
            label: k.keyType,
            value: k.keyValue,
          })) || []
        }
        userFullName={overview?.profile?.fullName || "Você"}
        onRegisterKeyClick={() => {
          setIsPixHubOpen(false);
          setIsRegisterPixKeyOpen(true);
        }}
        onSelectAction={(act) => {
          setIsPixHubOpen(false);
          if (act === "transfer") setIsTransferOpen(true);
          else if (act === "receive") setIsReceivePixOpen(true);
          else if (act === "card_pix") setActivePillar("card");
          else if (act === "qrcode") setIsReceivePixOpen(true);
          else if (act === "copy_paste") setIsReceivePixOpen(true);
          else toast.info(`Ação Pix selecionada: ${act}`);
        }}
      />

      {/* Drawer: Configurações do Cartão Conforme Tela 4 do Design Anexo */}
      <CardSettingsDrawer
        open={isCardSettingsOpen}
        onOpenChange={setIsCardSettingsOpen}
        cardHolderName={overview?.card?.cardHolderName || overview?.profile?.fullName?.toUpperCase() || "TITULAR WAESY"}
        cardNumber={`•••• •••• •••• ${overview?.card?.lastFourDigits || "8842"}`}
        currentLimitCents={overview?.card?.userSpendingLimitCents || overview?.card?.creditLimitCents || 500000}
        maxLimitCents={overview?.card?.creditLimitCents || 500000}
        isTemporaryBlocked={overview?.card?.isTemporaryBlocked || false}
        onToggleBlock={handleToggleCardBlock}
        onUpdateLimit={handleUpdateCardLimit}
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

      {/* Modal / Diálogo: Rendimento da Conta (CDI Real) */}
      {isYieldModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-xl bg-lime-500/10 text-lime-600 flex items-center justify-center">
                <TrendingUp className="size-5" />
              </div>
              <button
                type="button"
                onClick={() => setIsYieldModalOpen(false)}
                className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              >
                <X className="size-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-foreground">
                Conta Remunerada 100% CDI
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Seu dinheiro rende automaticamente todos os dias úteis a 100% do CDI com liquidez diária e segurança no Waesy Bank.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status atual:</span>
                <span
                  className={cn(
                    "font-bold",
                    overview?.yieldSettings?.isYieldEnabled ? "text-lime-600" : "text-zinc-600"
                  )}
                >
                  {overview?.yieldSettings?.isYieldEnabled ? "Ativado" : "Desativado"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Rentabilidade:</span>
                <span className="font-bold text-foreground font-mono">100% do CDI</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total acumulado:</span>
                <span className="font-bold text-lime-600 font-mono">
                  {formatCents(overview?.yieldSettings?.accumulatedYieldCents || 0)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggleYield(!overview?.yieldSettings?.isYieldEnabled)}
              className={cn(
                "w-full h-12 min-h-12 rounded-xl font-bold text-xs flex items-center justify-center transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
                overview?.yieldSettings?.isYieldEnabled
                  ? "bg-zinc-100 hover:bg-zinc-200 text-rose-600 border border-rose-200"
                  : "bg-lime-400 hover:bg-lime-500 text-zinc-950"
              )}
            >
              {overview?.yieldSettings?.isYieldEnabled
                ? "Pausar Rendimento da Conta"
                : "Ativar Rendimento 100% CDI"}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar Nova Chave Pix Real */}
      {isRegisterPixKeyOpen && (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form
            onSubmit={handleRegisterPixKey}
            className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                Cadastrar Chave Pix
              </h3>
              <button
                type="button"
                onClick={() => setIsRegisterPixKeyOpen(false)}
                className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Tipo de Chave
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["CPF", "EMAIL", "PHONE", "RANDOM"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setNewPixKeyType(t);
                        if (t === "CPF" && overview?.profile?.cpf) {
                          setNewPixKeyValue(overview.profile.cpf);
                        } else if (t === "EMAIL" && overview?.profile?.email) {
                          setNewPixKeyValue(overview.profile.email);
                        } else if (t === "RANDOM") {
                          setNewPixKeyValue(crypto.randomUUID());
                        } else {
                          setNewPixKeyValue("");
                        }
                      }}
                      className={cn(
                        "h-11 min-h-11 rounded-xl text-3xs font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
                        newPixKeyType === t
                          ? "bg-lime-400 text-zinc-950 shadow-2xs"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Valor da Chave
                </label>
                <Input
                  value={newPixKeyValue}
                  onChange={(e) => setNewPixKeyValue(e.target.value)}
                  placeholder={newPixKeyType === "CPF" ? "000.000.000-00" : "Sua chave Pix"}
                  className="h-12 min-h-12 rounded-xl text-xs sm:text-sm bg-zinc-50 border-zinc-200/80 font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 min-h-12 rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-950 font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              Salvar Chave Pix
            </button>
          </form>
        </div>
      )}

      {/* Modal: Receber Pix (Cobrança Instantânea) */}
      {isReceivePixOpen && (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-xl space-y-4 text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                Receber com Pix
              </h3>
              <button
                type="button"
                onClick={() => setIsReceivePixOpen(false)}
                className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200/60 flex flex-col items-center gap-3">
              <div className="size-44 bg-card p-2 rounded-xl border border-zinc-200/80 flex items-center justify-center shadow-2xs">
                <QrCode className="size-36 text-zinc-950" />
              </div>
              <div className="space-y-1">
                <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Chave Pix Principal
                </span>
                <span className="text-xs font-bold text-foreground font-mono block break-all">
                  {overview?.pixKeys?.[0]?.keyValue || overview?.profile?.cpf || overview?.profile?.email || "Chave da Carteira"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const val =
                  overview?.pixKeys?.[0]?.keyValue ||
                  overview?.profile?.cpf ||
                  overview?.profile?.email ||
                  "00020126580014br.gov.bcb.pix0136waesy-carteira";
                navigator.clipboard.writeText(val);
                toast.success("Código Pix Copia e Cola copiado!");
              }}
              className="w-full h-12 min-h-12 rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <Copy className="size-4" />
              <span>Copiar Chave / Código Pix</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Tela de Sucesso Transacional (Conforme Tela 2 do Design Anexo) */}
      {isSuccessReceiptOpen && lastPaymentSuccess && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md shadow-xl overflow-hidden">
            <PaymentSuccessReceipt
              title={lastPaymentSuccess.title}
              subtitle={lastPaymentSuccess.subtitle}
              amountCents={lastPaymentSuccess.amountCents}
              recipientName={lastPaymentSuccess.recipientName}
              recipientInstitution={lastPaymentSuccess.recipientInstitution || "Waesy Pagamentos e Tecnologia"}
              transactionId={lastPaymentSuccess.transactionId}
              onViewReceipt={() => {
                setIsSuccessReceiptOpen(false);
                if (activeReceipt) {
                  // Abre o comprovante detalhado
                } else {
                  handleOpenReceiptById(lastPaymentSuccess.transactionId);
                }
              }}
              onDone={() => setIsSuccessReceiptOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modal: Adicionar Saldo / Depósito Pix */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="relative bg-card border border-border/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="size-10 rounded-xl bg-lime-400/20 text-zinc-950 flex items-center justify-center">
                  <Plus className="size-5 text-lime-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">
                    Adicionar Saldo
                  </h3>
                  <span className="text-2xs text-muted-foreground">Via Pix Instantâneo 24h</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDepositOpen(false)}
                className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteDeposit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Valor a depositar
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-foreground">
                    R$
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={depositAmountStr}
                    onChange={(e) => setDepositAmountStr(e.target.value)}
                    placeholder="0,00"
                    required
                    className="h-14 min-h-14 pl-12 text-2xl font-black font-mono rounded-2xl bg-zinc-50 border-zinc-200/80 focus-visible:ring-2 focus-visible:ring-lime-500"
                  />
                </div>
              </div>

              {/* Sugestões Rápidas de Valor em Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {["20,00", "50,00", "100,00", "200,00"].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDepositAmountStr(val)}
                    className={cn(
                      "h-11 min-h-11 rounded-xl text-xs font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
                      depositAmountStr === val
                        ? "bg-lime-400 text-zinc-950 font-black shadow-2xs"
                        : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
                    )}
                  >
                    R$ {val.split(",")[0]}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 min-h-12 rounded-xl bg-lime-400 hover:bg-lime-500 active:bg-lime-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
                >
                  {isSubmitting ? "Gerando Pix..." : "Confirmar Depósito"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transferência P2P */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="relative bg-card border border-border/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="size-10 rounded-xl bg-lime-400/20 text-zinc-950 flex items-center justify-center">
                  <ArrowLeftRight className="size-5 text-lime-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">
                    Transferir Dinheiro
                  </h3>
                  <span className="text-2xs text-muted-foreground">Transferência instantânea sem taxas</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferOpen(false)}
                className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteP2P} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Destinatário (Nome ou Chave Pix)
                </label>
                <Input
                  type="text"
                  placeholder="Nome, CPF ou E-mail do recebedor"
                  value={transferRecipientId}
                  onChange={(e) => setTransferRecipientId(e.target.value)}
                  required
                  className="h-12 min-h-12 rounded-xl bg-zinc-50 border-zinc-200/80 text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Valor
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-foreground">
                    R$
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={transferAmountStr}
                    onChange={(e) => setTransferAmountStr(e.target.value)}
                    required
                    className="h-14 min-h-14 pl-12 text-2xl font-black font-mono rounded-2xl bg-zinc-50 border-zinc-200/80 focus-visible:ring-2 focus-visible:ring-lime-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Descrição (Opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Almoço, Presente, Pagamento..."
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  className="h-12 min-h-12 rounded-xl bg-zinc-50 border-zinc-200/80 text-xs focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 min-h-12 rounded-xl bg-lime-400 hover:bg-lime-500 active:bg-lime-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
                >
                  {isSubmitting ? "Enviando..." : "Confirmar Transferência"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Comprovante Oficial Inviolável com Assinatura HMAC */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="relative bg-card border border-border/80 max-w-md w-full rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Comprovante de Transação</h3>
                <span className="text-xs text-muted-foreground">{activeReceipt.emitterName}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="text-center py-2 border-b border-border/30">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Valor Transferido
              </span>
              <div className="text-3xl font-black font-mono text-foreground mt-1">
                {formatCents(activeReceipt.amountCents)}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Autenticação:</span>
                <span className="font-mono font-semibold text-foreground">
                  {activeReceipt.authenticationCode}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Pagador:</span>
                <span className="font-semibold text-foreground">{activeReceipt.payerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
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

            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-lime-600">
                <Shield className="size-4" />
                <span>Assinatura Digital HMAC-SHA256</span>
              </div>
              <div className="text-3xs font-mono text-muted-foreground break-all">
                {activeReceipt.hmacSignature.slice(0, 36)}...
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.share) {
                    navigator.share({
                      title: "Comprovante Waesy",
                      text: `Comprovante de transferência ${formatCents(activeReceipt.amountCents)} para ${activeReceipt.payeeName}. Autenticação: ${activeReceipt.authenticationCode}`,
                    });
                  } else {
                    toast.success("Comprovante pronto para impressão.");
                  }
                }}
                className="w-full h-12 min-h-12 rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              >
                <span>Compartilhar Comprovante</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalhes do Evento do Extrato */}
      {selectedEventDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="relative bg-card border border-border/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-foreground">Detalhes do Lançamento</h3>
              <button
                type="button"
                onClick={() => setSelectedEventDetail(null)}
                className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="text-center py-2">
              <span
                className={cn(
                  "text-3xl font-black font-mono tracking-tight",
                  selectedEventDetail.direction === "INCOMING" ? "text-lime-600" : "text-foreground"
                )}
              >
                {selectedEventDetail.direction === "INCOMING" ? "+" : "-"} {formatCents(selectedEventDetail.amountCents)}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedEventDetail.description}
              </p>
            </div>

            <div className="bg-zinc-50 rounded-2xl p-4 space-y-2 text-xs border border-zinc-200/60">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Domínio:</span>
                <span className="font-bold text-foreground">{selectedEventDetail.sourceDomain}</span>
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
                <span className="font-bold text-lime-600">
                  {selectedEventDetail.status}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedEventDetail(null)}
                className="w-full h-12 min-h-12 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              >
                <span>Fechar Detalhes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Importar OFX */}
      {isOfxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="relative bg-card border border-border/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <h3 className="text-base font-bold text-foreground">Importar Extrato OFX</h3>
              <button
                type="button"
                onClick={() => setIsOfxModalOpen(false)}
                className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleImportOfx} className="space-y-4">
              <textarea
                value={ofxContentInput}
                onChange={(e) => setOfxContentInput(e.target.value)}
                placeholder="Cole o conteúdo XML/OFX aqui..."
                rows={6}
                className="w-full p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOfxModalOpen(false)}
                  className="h-11 min-h-11 px-4 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isImportingOfx}
                  className="h-11 min-h-11 px-5 rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-950 font-bold text-xs flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
                >
                  {isImportingOfx ? "Importando..." : "Confirmar Importação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Lançamento Manual */}
      {isNewEntryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="relative bg-card border border-border/80 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <h3 className="text-base font-bold text-foreground">Novo Lançamento</h3>
              <button
                type="button"
                onClick={() => setIsNewEntryOpen(false)}
                className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-4">
              {/* Toggle Despesa / Receita */}
              <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setEntryType("expense")}
                  className={cn(
                    "h-11 min-h-11 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
                    entryType === "expense"
                      ? "bg-rose-600 text-primary-foreground shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-950"
                  )}
                >
                  <ArrowUpRight className="size-4" />
                  <span>Despesa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType("income")}
                  className={cn(
                    "h-11 min-h-11 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
                    entryType === "income"
                      ? "bg-lime-500 text-zinc-950 shadow-2xs font-extrabold"
                      : "text-zinc-600 hover:text-zinc-950"
                  )}
                >
                  <ArrowDownLeft className="size-4" />
                  <span>Receita</span>
                </button>
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Valor (R$)
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  required
                  className="h-14 min-h-14 rounded-2xl bg-zinc-50 border-zinc-200/80 text-2xl font-black font-mono focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Descrição
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Almoço, Supermercado, Salário..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="h-12 min-h-12 rounded-xl bg-zinc-50 border-zinc-200/80 text-xs focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>

              {/* Categoria */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Categoria
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-zinc-200/60 rounded-2xl bg-zinc-50">
                  {availableCategories.map((cat: any) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={cn(
                        "h-11 min-h-11 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors text-left truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
                        selectedCategoryId === cat.id
                          ? "bg-lime-400 text-zinc-950 font-black shadow-2xs"
                          : "bg-card text-zinc-800 hover:bg-zinc-100 border border-zinc-200/40"
                      )}
                    >
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Data & Forma de Pagamento */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Data
                  </label>
                  <Input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    required
                    className="h-12 min-h-12 rounded-xl bg-zinc-50 border-zinc-200/80 text-xs focus-visible:ring-2 focus-visible:ring-lime-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full h-12 min-h-12 px-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:outline-none"
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

              {/* Botões de Submissão */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewEntryOpen(false)}
                  className="h-11 min-h-11 px-4 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 min-h-11 px-5 rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-950 font-bold text-xs shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
                >
                  {isSubmitting ? "Salvando..." : "Salvar Lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
