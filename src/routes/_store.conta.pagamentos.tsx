import { useState, useMemo } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreditCard,
  QrCode,
  Receipt,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Plus,
  ArrowRight,
  ShieldCheck,
  Wallet,
  WarningCircle,
  ArrowClockwise,
  ShareNetwork,
  DownloadSimple,
  X,
  MagnifyingGlass,
  Funnel,
  Sparkle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/state/states";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { generateQrCodeDataUri } from "@/lib/qr-code";
import {
  listUserPaymentHistory,
  listUserInvoices,
  getStaticPixReceiveData,
  createDynamicPixCharge,
  getUserAvailablePaymentMethods,
  type UnifiedPaymentItemDTO,
  type UnifiedInvoiceDTO,
} from "@/services/payment-operational.functions";
import { getProfilePixSettings, saveProfilePixSettings } from "@/services/payment.functions";
import { getReceiptDetails, type FinancialReceiptDTO } from "@/services/financial-ledger.functions";

export const Route = createFileRoute("/_store/conta/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos | Waesy" }] }),
  loader: async () => {
    try {
      const [history, invoices, staticPix, methods] = await Promise.all([
        listUserPaymentHistory(),
        listUserInvoices(),
        getStaticPixReceiveData(),
        getUserAvailablePaymentMethods(),
      ]);

      return {
        initialHistory: Array.isArray(history) ? history : [],
        initialInvoices: Array.isArray(invoices) ? invoices : [],
        initialStaticPix: staticPix,
        initialMethods: methods,
        hasError: false,
      };
    } catch (err) {
      console.error("[loader:_store.conta.pagamentos] Erro ao carregar dados operacionais:", err);
      return {
        initialHistory: [],
        initialInvoices: [],
        initialStaticPix: null,
        initialMethods: null,
        hasError: true,
      };
    }
  },
  component: CustomerPaymentsCenterPage,
});

type MainTab = "history" | "invoices" | "receive" | "methods";
type FilterStatus = "all" | "paid" | "pending" | "received" | "refunded";

function CustomerPaymentsCenterPage() {
  const loaderData = Route.useLoaderData() as any;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<MainTab>("history");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal de Detalhe da Transação
  const [selectedTx, setSelectedTx] = useState<UnifiedPaymentItemDTO | null>(null);

  // Modal de Comprovante Oficial
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<FinancialReceiptDTO | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Estados da Aba de Recebimento Pix
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf_cnpj");
  const [pixReceiverName, setPixReceiverName] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");

  // Criação de Cobrança Dinâmica Pix
  const [dynamicAmount, setDynamicAmount] = useState("");
  const [dynamicDesc, setDynamicDesc] = useState("");
  const [dynamicChargeResult, setDynamicChargeResult] = useState<{
    chargeId: string;
    amountCents: number;
    description: string;
    emvPayload: string;
    txId: string;
    expiresAt: string;
  } | null>(null);

  // Queries Reativas
  const {
    data: history = loaderData?.initialHistory || [],
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["payment-history"],
    queryFn: () => listUserPaymentHistory(),
    initialData: loaderData?.initialHistory,
  });

  const {
    data: invoices = loaderData?.initialInvoices || [],
    isLoading: isInvoicesLoading,
    isError: isInvoicesError,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ["payment-invoices"],
    queryFn: () => listUserInvoices(),
    initialData: loaderData?.initialInvoices,
  });

  const {
    data: staticPix = loaderData?.initialStaticPix,
    isLoading: isPixLoading,
    refetch: refetchPix,
  } = useQuery({
    queryKey: ["payment-static-pix"],
    queryFn: () => getStaticPixReceiveData(),
    initialData: loaderData?.initialStaticPix,
  });

  const {
    data: paymentMethods = loaderData?.initialMethods,
    isLoading: isMethodsLoading,
    refetch: refetchMethods,
  } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => getUserAvailablePaymentMethods(),
    initialData: loaderData?.initialMethods,
  });

  // Salvar Configuração de Chave Pix
  const savePixMutation = useMutation({
    mutationFn: () =>
      saveProfilePixSettings({
        data: {
          pix_key: pixKey.trim(),
          pix_key_type: pixKeyType as any,
          pix_receiver_name: pixReceiverName.trim(),
          payment_instructions: paymentInstructions.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Dados de recebimento Pix salvos com sucesso.");
      refetchPix();
      refetchMethods();
      router.invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar dados Pix.");
    },
  });

  // Criar Cobrança Dinâmica Pix
  const createChargeMutation = useMutation({
    mutationFn: () => {
      const parsedAmount = Math.round(parseFloat(dynamicAmount.replace(",", ".")) * 100);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Digite um valor válido em reais.");
      }
      if (!dynamicDesc.trim()) {
        throw new Error("Digite a descrição da cobrança.");
      }
      return createDynamicPixCharge({
        data: {
          amountCents: parsedAmount,
          description: dynamicDesc.trim(),
        },
      });
    },
    onSuccess: (res) => {
      setDynamicChargeResult(res);
      toast.success("Cobrança Pix criada com sucesso.");
      refetchHistory();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao gerar cobrança Pix.");
    },
  });

  // Copiar Chave Pix
  const handleCopyKey = () => {
    if (!staticPix?.pixKey) return;
    navigator.clipboard.writeText(staticPix.pixKey);
    setCopiedKey(true);
    toast.success("Chave Pix copiada para a área de transferência.");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Copiar Payload Pix Copia e Cola
  const handleCopyPayload = (payload: string) => {
    if (!payload) return;
    navigator.clipboard.writeText(payload);
    setCopiedPayload(true);
    toast.success("Código Pix Copia e Cola copiado.");
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  // Abrir Comprovante Oficial Verificável
  const handleOpenReceipt = async (authCodeOrTx: string) => {
    setLoadingReceipt(true);
    try {
      const rec = await getReceiptDetails({ data: { idOrCode: authCodeOrTx } });
      if (rec) {
        setSelectedReceipt(rec);
        setReceiptModalOpen(true);
      } else {
        toast.error("Comprovante não localizado ou em fase de conciliação.");
      }
    } catch {
      toast.error("Não foi possível carregar o comprovante oficial.");
    } finally {
      setLoadingReceipt(false);
    }
  };

  // QR Code Estático via Data URI Sovereign
  const staticQrDataUri = useMemo(() => {
    if (!staticPix?.copyPastePayload) return "";
    return generateQrCodeDataUri(staticPix.copyPastePayload);
  }, [staticPix?.copyPastePayload]);

  // QR Code Dinâmico via Data URI Sovereign
  const dynamicQrDataUri = useMemo(() => {
    if (!dynamicChargeResult?.emvPayload) return "";
    return generateQrCodeDataUri(dynamicChargeResult.emvPayload);
  }, [dynamicChargeResult?.emvPayload]);

  // Filtragem e Busca do Histórico
  const filteredHistory = useMemo(() => {
    return history.filter((item: any) => {
      // Filtro de status
      if (filterStatus === "paid" && item.status !== "paid") return false;
      if (filterStatus === "pending" && item.status !== "pending" && item.status !== "processing") return false;
      if (filterStatus === "received" && item.direction !== "incoming") return false;
      if (filterStatus === "refunded" && item.status !== "refunded") return false;

      // Filtro de busca
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesCounterparty = item.counterparty_name.toLowerCase().includes(query);
        const matchesToken = item.reference_token.toLowerCase().includes(query);
        return matchesTitle || matchesDesc || matchesCounterparty || matchesToken;
      }

      return true;
    });
  }, [history, filterStatus, searchQuery]);

  // Estatísticas do Painel Desktop (Desktop System App)
  const kpiStats = useMemo(() => {
    let totalMovedCents = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let receivedCents = 0;

    for (const item of history) {
      totalMovedCents += item.amount_cents;
      if (item.status === "paid") {
        paidCount++;
      }
      if (item.status === "pending" || item.status === "processing") {
        pendingCount++;
      }
      if (item.direction === "incoming" && item.status === "paid") {
        receivedCents += item.amount_cents;
      }
    }

    return { totalMovedCents, paidCount, pendingCount, receivedCents };
  }, [history]);

  // Ação da barra de topo móvel isolada para conformidade com Design Lint (DL-14)
  const headerRightAction = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        refetchHistory();
        refetchInvoices();
        refetchPix();
        refetchMethods();
      }}
      className="h-11 min-h-11 px-3 text-xs font-semibold rounded-lg text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      aria-label="Atualizar dados"
    >
      <ArrowClockwise className="size-4" />
    </Button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground w-full max-w-5xl mx-auto space-y-6 pb-24 px-4 sm:px-6 md:px-0">
      {/* ── 1. Top Bar Canônica Apple HIG (Mobile Native Header vs Desktop System Header) ── */}
      <NativeMobileHeader
        title="Pagamentos"
        fallbackHref="/conta"
        mobileOnly
        rightActions={headerRightAction}
      />

      <div className="hidden sm:flex items-center justify-between gap-3 border-b border-border/40 pb-4 pt-2">
        <div className="flex items-center gap-3">
          <NativeBackButton fallbackHref="/conta" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Pagamentos
            </h1>
            <p className="text-xs text-muted-foreground">
              Centro operacional de cobranças, comprovantes e recebimento Pix
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchHistory();
            refetchInvoices();
            refetchPix();
            refetchMethods();
          }}
          className="h-11 min-h-11 px-3 text-xs font-semibold rounded-lg gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <ArrowClockwise className="size-4" />
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
      </div>

      {/* ── 2. Régua de Abas Canônica em Linha Única Horizontal (B.39) ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activeTab === "history"
              ? "bg-foreground text-background"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
        >
          <Receipt className="size-4" weight="bold" />
          <span>Histórico</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activeTab === "invoices"
              ? "bg-foreground text-background"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
        >
          <FileText className="size-4" weight="bold" />
          <span>Faturas</span>
          {invoices.filter((i: any) => i.status === "overdue" || i.status === "pending").length > 0 && (
            <span className="size-2 rounded-full bg-destructive inline-block ml-1" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("receive")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activeTab === "receive"
              ? "bg-foreground text-background"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
        >
          <QrCode className="size-4" weight="bold" />
          <span>Receber Pix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("methods")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activeTab === "methods"
              ? "bg-foreground text-background"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
        >
          <Wallet className="size-4" weight="bold" />
          <span>Métodos & Saldo</span>
        </button>
      </div>

      {/* ── 3. Conteúdo da Aba 1: [ Histórico ] ── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Painel Executivo Desktop (Desktop System App KPIs) */}
          <div className="hidden sm:grid sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-card border border-border/40 space-y-1">
              <span className="text-xs text-muted-foreground">Total Transacionado</span>
              <p className="text-xl font-bold font-mono text-foreground">
                {formatMoney(kpiStats.totalMovedCents)}
              </p>
              <span className="text-xs text-muted-foreground">{history.length} operações registradas</span>
            </div>

            <div className="p-4 rounded-lg bg-card border border-border/40 space-y-1">
              <span className="text-xs text-muted-foreground">Concluídos / Pagos</span>
              <p className="text-xl font-bold font-mono text-primary">
                {kpiStats.paidCount}
              </p>
              <span className="text-xs text-muted-foreground">Liquidados sem pendência</span>
            </div>

            <div className="p-4 rounded-lg bg-card border border-border/40 space-y-1">
              <span className="text-xs text-muted-foreground">Pendentes / Processando</span>
              <p className="text-xl font-bold font-mono text-foreground">
                {kpiStats.pendingCount}
              </p>
              <span className="text-xs text-muted-foreground">Aguardando baixa ou gateway</span>
            </div>

            <div className="p-4 rounded-lg bg-card border border-border/40 space-y-1">
              <span className="text-xs text-muted-foreground">Recebido via Pix</span>
              <p className="text-xl font-bold font-mono text-primary">
                {formatMoney(kpiStats.receivedCents)}
              </p>
              <span className="text-xs text-muted-foreground">Entradas confirmadas</span>
            </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <MagnifyingGlass className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por loja, corrida, carnê ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 min-h-11 pl-9 pr-3 text-xs bg-card rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
            </div>

            {/* Filtros de Status */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={cn(
                  "h-11 min-h-11 px-3 text-xs font-semibold rounded-lg shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  filterStatus === "all" ? "bg-primary text-primary-foreground font-bold" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("paid")}
                className={cn(
                  "h-11 min-h-11 px-3 text-xs font-semibold rounded-lg shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  filterStatus === "paid" ? "bg-primary text-primary-foreground font-bold" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                Pagos
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("pending")}
                className={cn(
                  "h-11 min-h-11 px-3 text-xs font-semibold rounded-lg shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  filterStatus === "pending" ? "bg-primary text-primary-foreground font-bold" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                Pendentes
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("received")}
                className={cn(
                  "h-11 min-h-11 px-3 text-xs font-semibold rounded-lg shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  filterStatus === "received" ? "bg-primary text-primary-foreground font-bold" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                Recebidos
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("refunded")}
                className={cn(
                  "h-11 min-h-11 px-3 text-xs font-semibold rounded-lg shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  filterStatus === "refunded" ? "bg-primary text-primary-foreground font-bold" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                Reembolsados
              </button>
            </div>
          </div>

          {/* Tratamento Explícito de Erro (Não mascarar erro em lista vazia) */}
          {isHistoryError ? (
            <div className="p-6 rounded-lg bg-card border border-destructive/40 text-center space-y-3">
              <WarningCircle className="size-8 text-destructive mx-auto" />
              <h3 className="text-sm font-bold text-foreground">Falha ao carregar pagamentos</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Ocorreu uma instabilidade na consulta às fontes financeiras operacionais.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchHistory()}
                className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                Tentar Novamente
              </Button>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-lg border border-border/40 space-y-3">
              <Receipt className="size-10 text-muted-foreground mx-auto" weight="thin" />
              <h3 className="text-sm font-bold text-foreground">Nenhum pagamento encontrado</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery || filterStatus !== "all"
                  ? "Nenhuma transação corresponde aos filtros selecionados."
                  : "Quando você realizar compras, corridas, fretes ou receber Pix, as operações aparecerão aqui."}
              </p>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="h-11 min-h-11 text-xs text-primary font-semibold"
                >
                  Limpar busca
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* 1. Mobile Native App View (< 640px): Cards Squircles */}
              <div className="block sm:hidden space-y-3">
                {filteredHistory.map((item: any) => {
                  const isIncoming = item.direction === "incoming";
                  const isPaid = item.status === "paid";
                  const isRefunded = item.status === "refunded";

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg bg-card border border-border/40 space-y-3 active:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-foreground break-words text-wrap leading-tight">
                            {item.title}
                          </span>
                          <p className="text-xs text-muted-foreground break-words text-wrap">
                            {item.description}
                          </p>
                        </div>
                        <Badge
                          variant={
                            isPaid
                              ? "default"
                              : isRefunded
                              ? "secondary"
                              : item.status === "cancelled"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-xs px-2 py-1 shrink-0"
                        >
                          {item.status_label}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/20">
                        <span className="text-muted-foreground">
                          {formatDate(item.created_at)} • {item.payment_method.toUpperCase()}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-bold font-mono",
                            isIncoming ? "text-primary" : "text-foreground"
                          )}
                        >
                          {isIncoming ? "+" : "-"} {formatMoney(item.amount_cents)}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTx(item)}
                          className="h-11 min-h-11 px-3 text-xs font-semibold rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        >
                          Detalhes
                        </Button>

                        {item.has_receipt && item.receipt_auth_code && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenReceipt(item.receipt_auth_code!)}
                            className="h-11 min-h-11 px-3 text-xs text-primary font-semibold rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          >
                            Recibo
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 2. Desktop System App View (>= 640px): Tabela Estruturada */}
              <div className="hidden sm:block rounded-lg border border-border/40 overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Identificador</TableHead>
                      <TableHead className="text-xs">Operação & Contraparte</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Método</TableHead>
                      <TableHead className="text-xs">Valor</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((item: any) => {
                      const isIncoming = item.direction === "incoming";
                      const isPaid = item.status === "paid";
                      const isRefunded = item.status === "refunded";

                      return (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs font-semibold text-foreground">
                            {item.reference_token}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-bold text-foreground block">{item.title}</span>
                            <span className="text-muted-foreground">{item.counterparty_name}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(item.created_at)}
                          </TableCell>
                          <TableCell className="text-xs uppercase font-medium">
                            {item.payment_method}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-xs font-bold font-mono",
                              isIncoming ? "text-primary" : "text-foreground"
                            )}
                          >
                            {isIncoming ? "+" : "-"} {formatMoney(item.amount_cents)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                isPaid
                                  ? "default"
                                  : isRefunded
                                  ? "secondary"
                                  : item.status === "cancelled"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-xs px-2 py-1"
                            >
                              {item.status_label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedTx(item)}
                                className="h-11 min-h-11 px-3 text-xs font-semibold rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                              >
                                Detalhes
                              </Button>
                              {item.has_receipt && item.receipt_auth_code && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenReceipt(item.receipt_auth_code!)}
                                  className="h-11 min-h-11 px-3 text-xs text-primary font-semibold rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                                >
                                  Recibo
                                </Button>
                              )}
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
        </div>
      )}

      {/* ── 4. Conteúdo da Aba 2: [ Faturas ] ── */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-card border border-border/40 space-y-1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText className="size-4 text-primary" weight="bold" />
              <span>Faturas e Cobranças Agregadas</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Acompanhamento de faturas recorrentes, crediários consolidados e cobranças comerciais.
            </p>
          </div>

          {isInvoicesError ? (
            <div className="p-6 rounded-lg bg-card border border-destructive/40 text-center space-y-3">
              <WarningCircle className="size-8 text-destructive mx-auto" />
              <h3 className="text-sm font-bold text-foreground">Falha ao consultar faturas</h3>
              <p className="text-xs text-muted-foreground">Não foi possível conectar ao subsistema de faturamento.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchInvoices()}
                className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                Tentar Novamente
              </Button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-lg border border-border/40 space-y-3">
              <CheckCircle className="size-10 text-primary mx-auto" weight="thin" />
              <h3 className="text-sm font-bold text-foreground">Você está em dia</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Não existem faturas pendentes ou em aberto vinculadas à sua conta no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv: any) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-lg bg-card border border-border/40 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{inv.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        Período: {inv.billing_period} • Vencimento: {formatDate(inv.due_date)}
                      </p>
                    </div>

                    <Badge
                      variant={
                        inv.status === "paid"
                          ? "default"
                          : inv.status === "overdue"
                          ? "destructive"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {inv.status === "paid" ? "Paga" : inv.status === "overdue" ? "Em Atraso" : "Pendente"}
                    </Badge>
                  </div>

                  {/* Detalhamento dos Itens da Fatura */}
                  {inv.items && inv.items.length > 0 && (
                    <div className="bg-muted/20 p-3 rounded-lg divide-y divide-border/20 text-xs">
                      {inv.items.map((it: any, idx: number) => (
                        <div key={idx} className="py-2 flex justify-between">
                          <span className="text-muted-foreground">{it.description}</span>
                          <span className="font-mono font-medium text-foreground">
                            {formatMoney(it.amount_cents)}
                          </span>
                        </div>
                      ))}

                      {inv.is_overdue && (
                        <>
                          <div className="py-2 flex justify-between text-destructive">
                            <span>Multa por atraso (2%)</span>
                            <span className="font-mono">+{formatMoney(inv.fine_cents)}</span>
                          </div>
                          <div className="py-2 flex justify-between text-destructive">
                            <span>Juros pro-rata die ({inv.days_overdue} dias)</span>
                            <span className="font-mono">+{formatMoney(inv.interest_cents)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Rodapé com Total e Ação */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <div>
                      <span className="text-xs text-muted-foreground">Total da Fatura</span>
                      <p className="text-base font-bold font-mono text-foreground">
                        {formatMoney(inv.total_payable_cents)}
                      </p>
                    </div>

                    {inv.status !== "paid" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveTab("receive");
                          setDynamicAmount((inv.total_payable_cents / 100).toFixed(2));
                          setDynamicDesc(`Quitação ${inv.title}`);
                        }}
                        className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg gap-2 bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        <QrCode className="size-4" weight="bold" />
                        <span>Pagar com Pix</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 5. Conteúdo da Aba 3: [ Receber Pix ] ── */}
      {activeTab === "receive" && (
        <div className="space-y-6">
          {/* Seção 1: Configuração e QR Code Estático */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bloco de Configuração da Chave */}
            <div className="p-5 rounded-lg bg-card border border-border/40 space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <QrCode className="size-5 text-primary" weight="bold" />
                  <span>Meus Dados Pix de Recebimento</span>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Configure sua chave Pix padrão do Banco Central para receber pagamentos diretos de clientes, anúncios e transferências civis.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Tipo de Chave Pix</Label>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value)}
                    className="w-full h-11 min-h-11 rounded-lg border border-border/60 bg-background text-xs px-3 font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <option value="cpf_cnpj">CPF ou CNPJ</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Telefone Celular (com DDD)</option>
                    <option value="random">Chave Aleatória (EVP)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Chave Pix</Label>
                  <Input
                    placeholder="Ex: 000.000.000-00 ou chave@email.com"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    className="h-11 min-h-11 rounded-lg text-xs bg-background font-mono focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Nome do Titular / Favorecido</Label>
                  <Input
                    placeholder="Nome completo do recebedor"
                    value={pixReceiverName}
                    onChange={(e) => setPixReceiverName(e.target.value)}
                    className="h-11 min-h-11 rounded-lg text-xs bg-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Instruções aos Pagadores (Opcional)</Label>
                  <Textarea
                    placeholder="Ex: Após a transferência, o comprovante é validado em tempo real."
                    value={paymentInstructions}
                    onChange={(e) => setPaymentInstructions(e.target.value)}
                    rows={2}
                    className="text-xs bg-background resize-none rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => savePixMutation.mutate()}
                  disabled={savePixMutation.isPending || !pixKey.trim()}
                  className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {savePixMutation.isPending ? "Salvando Dados..." : "Salvar Dados de Recebimento"}
                </Button>
              </div>
            </div>

            {/* Bloco de Exibição do QR Code Estático */}
            <div className="p-5 rounded-lg bg-card border border-border/40 flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" weight="bold" />
                  <span>Seu QR Code Pix Estático</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Padrão oficial EMV do Banco Central do Brasil. O pagador define o valor na hora da leitura.
                </p>
              </div>

              {staticPix?.configured && staticQrDataUri ? (
                <div className="flex flex-col items-center justify-center p-4 bg-background rounded-lg border border-border/40 space-y-3">
                  <img
                    src={staticQrDataUri}
                    alt="QR Code Pix Estático"
                    className="size-48 rounded-md bg-card p-2 border border-border/20"
                  />

                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-foreground">{staticPix.receiverName}</p>
                    <p className="text-xs font-mono text-muted-foreground">{staticPix.pixKey}</p>
                  </div>

                  <div className="flex items-center gap-2 w-full pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyKey}
                      className="flex-1 h-11 min-h-11 text-xs font-semibold rounded-lg gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      {copiedKey ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                      <span>{copiedKey ? "Chave Copiada" : "Copiar Chave"}</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyPayload(staticPix.copyPastePayload)}
                      className="flex-1 h-11 min-h-11 text-xs font-semibold rounded-lg gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      {copiedPayload ? <Check className="size-4 text-primary" /> : <QrCode className="size-4" />}
                      <span>{copiedPayload ? "Copiado" : "Copia e Cola"}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-background rounded-lg border border-border/40 space-y-2 my-auto">
                  <QrCode className="size-12 text-muted-foreground mx-auto" weight="thin" />
                  <p className="text-xs font-bold text-foreground">Configure sua chave Pix ao lado</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Assim que salva, o QR Code e o código Copia e Cola EMV padrão BACEN serão gerados automaticamente.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Seção 2: Criador de Cobrança Pix com Valor (QR Code Dinâmico) */}
          <div className="p-5 rounded-lg bg-card border border-border/40 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkle className="size-5 text-primary" weight="bold" />
                <span>Criar Cobrança Pix com Valor (Dinâmica)</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Gere uma cobrança específica com valor e descrição embutidos. Ideal para negociar serviços, vendas ou parcelas com clientes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Valor (R$)</Label>
                <Input
                  type="text"
                  placeholder="0,00"
                  value={dynamicAmount}
                  onChange={(e) => setDynamicAmount(e.target.value)}
                  className="h-11 min-h-11 rounded-lg text-xs bg-background font-mono font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />
              </div>

              <div className="space-y-2 sm:col-span-1">
                <Label className="text-xs font-semibold text-foreground">Descrição</Label>
                <Input
                  placeholder="Ex: Serviço de consultoria"
                  value={dynamicDesc}
                  onChange={(e) => setDynamicDesc(e.target.value)}
                  className="h-11 min-h-11 rounded-lg text-xs bg-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />
              </div>

              <Button
                type="button"
                onClick={() => createChargeMutation.mutate()}
                disabled={createChargeMutation.isPending || !dynamicAmount.trim() || !dynamicDesc.trim()}
                className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {createChargeMutation.isPending ? "Gerando..." : "Gerar Cobrança com Valor"}
              </Button>
            </div>

            {/* Resultado da Cobrança Dinâmica */}
            {dynamicChargeResult && dynamicQrDataUri && (
              <div className="p-4 rounded-lg bg-background border border-primary/40 space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={dynamicQrDataUri}
                    alt="QR Code Dinâmico com Valor"
                    className="size-40 rounded-md bg-card p-2 border border-border/20"
                  />

                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <div>
                      <span className="text-xs text-muted-foreground">Valor da Cobrança</span>
                      <p className="text-xl font-bold font-mono text-primary">
                        {formatMoney(dynamicChargeResult.amountCents)}
                      </p>
                    </div>

                    <p className="text-xs text-foreground">
                      <strong>Motivo:</strong> {dynamicChargeResult.description}
                    </p>

                    <p className="text-xs text-muted-foreground font-mono">
                      Identificador: {dynamicChargeResult.txId}
                    </p>

                    <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                      <Button
                        size="sm"
                        onClick={() => handleCopyPayload(dynamicChargeResult.emvPayload)}
                        className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg gap-2 bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        <Copy className="size-4" />
                        <span>Copiar Pix com Valor</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDynamicChargeResult(null)}
                        className="h-11 min-h-11 px-3 text-xs font-semibold rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        Fechar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 6. Conteúdo da Aba 4: [ Métodos & Saldo ] ── */}
      {activeTab === "methods" && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-card border border-border/40 space-y-1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Wallet className="size-4 text-primary" weight="bold" />
              <span>Meios de Pagamento Habilitados</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Canais ativos para transações financeiras, compras no catálogo e movimentações da conta.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(paymentMethods?.methods || []).map((m: any) => (
              <div
                key={m.id}
                className="p-4 rounded-lg bg-card border border-border/40 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{m.name}</span>
                    <Badge variant={m.badgeVariant} className="text-xs">
                      {m.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{m.description}</p>
                </div>

                {m.id === "wallet" && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full h-11 min-h-11 text-xs font-semibold rounded-lg gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <Link to="/conta/financas">
                      <span>Gerenciar Carteira</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                )}

                {m.id === "pix" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("receive")}
                    className="w-full h-11 min-h-11 text-xs font-semibold rounded-lg gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <span>Configurar Chave</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                )}

                {m.id === "carne" && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full h-11 min-h-11 text-xs font-semibold rounded-lg gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <Link to="/conta/carnes">
                      <span>Ver Meus Carnês</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 7. Modal de Detalhe da Transação com Navegação Bidirecional ── */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar diálogo de detalhes"
            onClick={() => setSelectedTx(null)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm cursor-pointer focus-visible:outline-none"
          />

          <div className="relative w-full max-w-md rounded-3xl bg-card border border-border/80 p-6 space-y-4 z-10 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Detalhe da Transação</h3>
                <p className="text-xs text-muted-foreground font-mono">{selectedTx.reference_token}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="size-11 min-h-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/20 space-y-1 text-center">
                <span className="text-xs text-muted-foreground">Valor da Operação</span>
                <p className="text-3xl font-black font-mono text-foreground tracking-tight">
                  {formatMoney(selectedTx.amount_cents)}
                </p>
                <Badge variant="outline" className="text-xs">
                  {selectedTx.status_label}
                </Badge>
              </div>

              <div className="space-y-2 text-xs divide-y divide-border/20">
                <div className="py-2 flex justify-between">
                  <span className="text-muted-foreground">Origem</span>
                  <span className="font-semibold text-foreground uppercase">{selectedTx.origin_type}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-muted-foreground">Contraparte</span>
                  <span className="font-semibold text-foreground">{selectedTx.counterparty_name}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-muted-foreground">Forma de Pagamento</span>
                  <span className="font-semibold text-foreground uppercase">{selectedTx.payment_method}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-muted-foreground">Data e Hora</span>
                  <span className="font-semibold text-foreground">{formatDate(selectedTx.created_at)}</span>
                </div>
                {selectedTx.paid_at && (
                  <div className="py-2 flex justify-between">
                    <span className="text-muted-foreground">Liquidação</span>
                    <span className="font-semibold text-foreground">{formatDate(selectedTx.paid_at)}</span>
                  </div>
                )}
              </div>

              {/* Botões de Ação e Navegação Bidirecional */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="w-full sm:flex-1 h-11 min-h-11 text-xs font-semibold rounded-lg gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <Link to={selectedTx.reference_url as any}>
                    <span>Ver Origem ({selectedTx.origin_type})</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>

                {selectedTx.has_receipt && selectedTx.receipt_auth_code && (
                  <Button
                    onClick={() => handleOpenReceipt(selectedTx.receipt_auth_code!)}
                    disabled={loadingReceipt}
                    className="w-full sm:flex-1 h-11 min-h-11 text-xs font-bold rounded-lg gap-2 bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <Receipt className="size-4" />
                    <span>Ver Comprovante</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Modal de Comprovante Oficial Verificável com HMAC-SHA256 ── */}
      {receiptModalOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar diálogo de comprovante"
            onClick={() => setReceiptModalOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm cursor-pointer focus-visible:outline-none"
          />

          <div className="relative w-full max-w-md rounded-3xl bg-card border border-border/80 p-6 space-y-4 z-10 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" weight="bold" />
                <h3 className="text-base font-bold text-foreground">Comprovante Oficial</h3>
              </div>

              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="size-11 min-h-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 text-center space-y-1">
                <span className="text-xs text-muted-foreground uppercase">{selectedReceipt.emitterName}</span>
                <p className="text-3xl font-black font-mono text-foreground tracking-tight">
                  {formatMoney(selectedReceipt.amountCents)}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(selectedReceipt.issuedAt)}</p>
              </div>

              <div className="space-y-2 text-xs divide-y divide-border/20">
                <div className="py-2 flex justify-between">
                  <span className="text-muted-foreground">Pagador</span>
                  <span className="font-semibold text-foreground">{selectedReceipt.payerName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-muted-foreground">Favorecido</span>
                  <span className="font-semibold text-foreground">{selectedReceipt.payeeName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-muted-foreground">Forma de Pagamento</span>
                  <span className="font-semibold text-foreground uppercase">{selectedReceipt.paymentMethod}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-muted-foreground">Código de Autenticação</span>
                  <span className="font-mono text-xs text-primary font-bold">{selectedReceipt.authenticationCode}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/10 border border-border/20 text-xs font-mono text-muted-foreground break-all">
                Assinatura Digital HMAC: {selectedReceipt.hmacSignature}
              </div>

              <div className="pt-2 flex items-center justify-end">
                <Button
                  onClick={() => setReceiptModalOpen(false)}
                  className="h-12 min-h-12 px-6 text-xs font-bold rounded-xl bg-lime-400 hover:bg-lime-500 active:bg-lime-600 text-zinc-950 focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:outline-none shadow-xs"
                >
                  Concluir
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
