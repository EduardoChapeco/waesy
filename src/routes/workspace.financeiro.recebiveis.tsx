import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  Calendar,
  AlertCircle,
  Plus,
  Send,
  Search,
  Filter,
  Eye,
  Percent,
  Check,
  Building2,
  User,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Lock,
  Shield,
  TrendingUp,
  Sparkles,
  Sliders,
  ArrowRight,
  ArrowDownRight,
  RefreshCw,
  ShoppingBag,
  Shirt,
  HeartHandshake,
  DollarSign,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import {
  listStoreCarnes,
  getCarnesReportSummary,
  approveInstallmentPayment,
  rejectInstallmentPayment,
  adjustInstallmentAmount,
  sendMassBillingReminders,
  createStoreCarne,
  searchCustomersForCarne,
} from "@/services/receivables.functions";
import {
  listStoreCondicionais,
  createStoreCondicional,
  resolveCondicionalItems,
  type StoreCondicionalDTO,
  type CondicionalItemDTO,
} from "@/services/condicionais.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/workspace/financeiro/recebiveis")({
  head: () => ({ meta: [{ title: "Recebíveis, Carnês & Condicionais | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [carnes, report, condicionais] = await Promise.all([
        listStoreCarnes({ data: { filter: "all" } }).catch(() => []),
        getCarnesReportSummary({ data: {} }).catch(() => null),
        listStoreCondicionais().catch(() => []),
      ]);
      return { carnes, report, condicionais };
    } catch {
      return { carnes: [], report: null, condicionais: [] };
    }
  },
  component: ReceivablesDashboard,
});

function ReceivablesDashboard() {
  const {
    carnes: initialCarnes,
    report: initialReport,
    condicionais: initialCondicionais,
  } = ((Route.useLoaderData?.() as any) || {});
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<
    "all" | "due_soon" | "late" | "pending_conciliation" | "settled"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Navegação Principal de Abas (Clean & Standby de BaaS)
  const [mainTab, setMainTab] = useState<"carnes" | "condicionais">("carnes");

  // Módulo de Condicionais & Prova em Casa (Varejo de Moda - 100% Persistência Real em Banco)
  const [condicionaisFilter, setCondicionaisFilter] = useState<"all" | "open" | "due_today" | "overdue" | "closed">("all");
  const [condicionaisSearch, setCondicionaisSearch] = useState("");

  const { data: condicionaisList = initialCondicionais || [], refetch: refetchCondicionais } = useQuery<StoreCondicionalDTO[]>({
    queryKey: ["store-condicionais", condicionaisFilter, condicionaisSearch],
    queryFn: () => listStoreCondicionais({ data: { filter: condicionaisFilter, search: condicionaisSearch } }),
    initialData: initialCondicionais,
  });

  const createCondicionalMutation = useMutation({
    mutationFn: (data: any) => createStoreCondicional({ data }),
    onSuccess: () => {
      toast.success("Saída em condicional registrada com sucesso!");
      setIsCreateCondicionalOpen(false);
      setNewCondCustomerName("");
      setNewCondCustomerPhone("");
      setNewCondNotes("");
      setNewCondItems([{ name: "", size: "M", priceReais: 0 }]);
      refetchCondicionais();
      queryClient.invalidateQueries({ queryKey: ["store-condicionais"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar condicional.");
    },
  });

  const resolveCondicionalMutation = useMutation({
    mutationFn: (data: any) => resolveCondicionalItems({ data }),
    onSuccess: (res) => {
      toast.success(
        `Condicional atualizado com sucesso! Total vendido: ${formatMoney(res.totalSoldCents)}.`,
      );
      setIsReturnCondicionalOpen(false);
      refetchCondicionais();
      queryClient.invalidateQueries({ queryKey: ["store-condicionais"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao resolver itens.");
    },
  });

  // Modais de Condicional
  const [isCreateCondicionalOpen, setIsCreateCondicionalOpen] = useState(false);
  const [newCondCustomerName, setNewCondCustomerName] = useState("");
  const [newCondCustomerPhone, setNewCondCustomerPhone] = useState("");
  const [newCondDays, setNewCondDays] = useState(2);
  const [newCondNotes, setNewCondNotes] = useState("");
  const [newCondItems, setNewCondItems] = useState<{ name: string; size: string; priceReais: number }[]>([
    { name: "", size: "M", priceReais: 0 },
  ]);

  const [selectedCondicional, setSelectedCondicional] = useState<any>(null);
  const [isReturnCondicionalOpen, setIsReturnCondicionalOpen] = useState(false);
  const [itemReturnDecisions, setItemReturnDecisions] = useState<Record<string, "bought" | "returned">>({});

  const handleOpenReturnModal = (cond: any) => {
    setSelectedCondicional(cond);
    const initialDecisions: Record<string, "bought" | "returned"> = {};
    (cond.items || []).forEach((item: any) => {
      initialDecisions[item.id] = "bought";
    });
    setItemReturnDecisions(initialDecisions);
    setIsReturnCondicionalOpen(true);
  };

  const handleConfirmReturnCondicional = () => {
    if (!selectedCondicional) return;
    const itemsPayload = Object.entries(itemReturnDecisions).map(([itemId, decision]) => ({
      id: itemId,
      action: decision === "bought" ? ("purchase" as const) : ("return" as const),
    }));
    resolveCondicionalMutation.mutate({
      condicionalId: selectedCondicional.id,
      items: itemsPayload,
    });
  };

  const handleCreateCondicional = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCondCustomerName.trim()) {
      toast.error("Informe o nome da cliente.");
      return;
    }
    const validItems = newCondItems.filter((it) => it.name.trim() && it.priceReais > 0);
    if (validItems.length === 0) {
      toast.error("Adicione ao menos uma peça válida à mala condicional.");
      return;
    }

    const returnDueDate = new Date(Date.now() + newCondDays * 24 * 60 * 60 * 1000).toISOString();

    createCondicionalMutation.mutate({
      customerName: newCondCustomerName,
      customerPhone: newCondCustomerPhone || null,
      returnDueDate,
      notes: newCondNotes || null,
      items: validItems.map((it) => ({
        name: it.name,
        size: it.size || "Único",
        priceCents: Math.round(it.priceReais * 100),
      })),
    });
  };

  // Queries
  const { data: carnes = [] } = useQuery({
    queryKey: ["store-carnes", activeFilter, searchTerm],
    queryFn: () => listStoreCarnes({ data: { filter: activeFilter, search: searchTerm || undefined } }),
    initialData: activeFilter === "all" && !searchTerm ? initialCarnes : undefined,
  });

  const { data: report } = useQuery({
    queryKey: ["store-carnes-report"],
    queryFn: () => getCarnesReportSummary({ data: {} }),
    initialData: initialReport,
  });

  // Estado de Seleção em Massa
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<string[]>([]);
  const [isMassBillingOpen, setIsMassBillingOpen] = useState(false);
  const [massTemplate, setMassTemplate] = useState<"friendly" | "due_warning" | "overdue_discount" | "custom">("friendly");
  const [massDiscount, setMassDiscount] = useState(10);
  const [massCustomMessage, setMassCustomMessage] = useState("");

  // Estado de Conciliação / Renegociação de Parcela
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [selectedCarne, setSelectedCarne] = useState<any>(null);
  const [isConciliationOpen, setIsConciliationOpen] = useState(false);
  const [waiveInterest, setWaiveInterest] = useState(false);
  const [discountCents, setDiscountCents] = useState(0);
  const [conciliationNotes, setConciliationNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Estado de Emissão de Carnê
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTotalReais, setNewTotalReais] = useState<number>(0);
  const [newInstallmentsCount, setNewInstallmentsCount] = useState<number>(3);
  const [newFirstDueDate, setNewFirstDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [newInterestRate, setNewInterestRate] = useState<number>(2.5);
  const [newFinePercent, setNewFinePercent] = useState<number>(2.0);
  const [newGraceDays, setNewGraceDays] = useState<number>(3);

  // Busca de clientes
  const { data: searchedCustomers = [] } = useQuery({
    queryKey: ["search-customers", customerSearch],
    queryFn: () => searchCustomersForCarne({ data: { query: customerSearch } }),
    enabled: customerSearch.length >= 2,
  });

  // Mutação de Aprovação de Conciliação
  const { mutate: approvePayment, isPending: isApproving } = useMutation({
    mutationFn: approveInstallmentPayment,
    onSuccess: () => {
      toast.success("Pagamento conciliado com sucesso! Espelhado no Financeiro Pessoal do cliente.");
      queryClient.invalidateQueries({ queryKey: ["store-carnes"] });
      queryClient.invalidateQueries({ queryKey: ["store-carnes-report"] });
      setIsConciliationOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao aprovar conciliação.");
    },
  });

  // Mutação de Rejeição de Comprovante
  const { mutate: rejectPayment, isPending: isRejectingMutation } = useMutation({
    mutationFn: rejectInstallmentPayment,
    onSuccess: () => {
      toast.success("Comprovante recusado. O cliente foi notificado para reenvio.");
      queryClient.invalidateQueries({ queryKey: ["store-carnes"] });
      queryClient.invalidateQueries({ queryKey: ["store-carnes-report"] });
      setIsConciliationOpen(false);
      setIsRejecting(false);
      setRejectReason("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao recusar comprovante.");
    },
  });

  // Mutação de Cobrança em Massa
  const { mutate: sendMassReminders, isPending: isSendingMass } = useMutation({
    mutationFn: sendMassBillingReminders,
    onSuccess: (res: any) => {
      toast.success(`${res.sentCount} notificação(ões) de cobrança enviada(s) com sucesso!`);
      setIsMassBillingOpen(false);
      setSelectedInstallmentIds([]);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao enviar cobranças.");
    },
  });

  // Mutação de Criação de Carnê
  const { mutate: createCarne, isPending: isCreating } = useMutation({
    mutationFn: createStoreCarne,
    onSuccess: () => {
      toast.success("Carnê digital emitido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["store-carnes"] });
      queryClient.invalidateQueries({ queryKey: ["store-carnes-report"] });
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao emitir carnê.");
    },
  });

  const resetCreateForm = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setNewTitle("");
    setNewDescription("");
    setNewTotalReais(0);
    setNewInstallmentsCount(3);
  };

  const handleOpenConciliation = (carne: any, inst: any) => {
    setSelectedCarne(carne);
    setSelectedInstallment(inst);
    setWaiveInterest(false);
    setDiscountCents(0);
    setConciliationNotes("");
    setIsRejecting(false);
    setRejectReason("");
    setIsConciliationOpen(true);
  };

  const handleConfirmApproval = () => {
    if (!selectedInstallment) return;
    approvePayment({
      data: {
        installmentId: selectedInstallment.id,
        waiveInterest,
        discountCents,
        paymentMethod: selectedInstallment.payment_method || "pix",
        notes: conciliationNotes || undefined,
      },
    });
  };

  const handleConfirmRejection = () => {
    if (!selectedInstallment) return;
    if (!rejectReason.trim()) {
      toast.error("Informe a justificativa da recusa para o cliente.");
      return;
    }
    rejectPayment({
      data: {
        installmentId: selectedInstallment.id,
        reason: rejectReason,
      },
    });
  };

  const handleCreateCarneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast.error("Selecione um cliente para vincular ao carnê.");
      return;
    }
    if (!newTitle.trim()) {
      toast.error("Informe o título do carnê.");
      return;
    }
    if (newTotalReais <= 0) {
      toast.error("Informe um valor total válido.");
      return;
    }

    createCarne({
      data: {
        debtorId: selectedCustomer.id,
        title: newTitle,
        description: newDescription || undefined,
        totalCents: Math.round(newTotalReais * 100),
        installmentsCount: newInstallmentsCount,
        firstDueDate: newFirstDueDate,
        interestRateMonthly: newInterestRate,
        finePercent: newFinePercent,
        graceDays: newGraceDays,
      },
    });
  };

  const handleToggleSelectAll = (allIds: string[]) => {
    if (selectedInstallmentIds.length === allIds.length) {
      setSelectedInstallmentIds([]);
    } else {
      setSelectedInstallmentIds(allIds);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedInstallmentIds.includes(id)) {
      setSelectedInstallmentIds(selectedInstallmentIds.filter((i) => i !== id));
    } else {
      setSelectedInstallmentIds([...selectedInstallmentIds, id]);
    }
  };

  // Coleta todas as parcelas não pagas para permitir seleção
  const allSelectableInstallmentIds = carnes.flatMap((c: any) =>
    (c.installments || [])
      .filter((i: any) => i.status !== "paid")
      .map((i: any) => i.id),
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-28 font-sans px-0 sm:px-4 md:px-0">
      {/* Top Header Dinâmico */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <PageHeader
            title={
              mainTab === "carnes"
                ? "Recebíveis & Carnês"
                : "Condicionais & Malas (Varejo)"
            }
          />
          <p className="text-muted-foreground text-sm max-w-2xl mt-1">
            {mainTab === "carnes" && "Controle de parcelamentos, conciliação de comprovantes e cobranças da loja."}
            {mainTab === "condicionais" && "Gestão de peças e malas sob confiança de clientes para prova em casa no varejo de moda e calçados."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {mainTab === "carnes" && (
            <>
              {selectedInstallmentIds.length > 0 && (
                <Button
                  className="rounded-xl bg-primary text-primary-foreground font-medium text-xs h-10 px-3.5 shadow-sm"
                  onClick={() => setIsMassBillingOpen(true)}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Cobrar ({selectedInstallmentIds.length}) Selecionados
                </Button>
              )}
              <Button
                className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-medium text-xs h-10 px-4 shadow-sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1.5" /> Emitir Novo Carnê
              </Button>
            </>
          )}

          {mainTab === "condicionais" && (
            <Button
              className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-medium text-xs h-10 px-4 shadow-sm"
              onClick={() => setIsCreateCondicionalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Nova Saída em Condicional
            </Button>
          )}
        </div>
      </div>

      {/* Seletor de Abas Principais (Clean Paradigm) */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border/60 max-w-xl">
        <button
          type="button"
          onClick={() => setMainTab("carnes")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3.5 text-xs font-semibold rounded-xl transition-all",
            mainTab === "carnes"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Receipt className="h-4 w-4" />
          <span>Carnês & Caderninho</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {carnes.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setMainTab("condicionais")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3.5 text-xs font-semibold rounded-xl transition-all",
            mainTab === "condicionais"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Shirt className="h-4 w-4 text-indigo-500" />
          <span>Condicionais & Malas</span>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-4 border-indigo-200 text-indigo-600 dark:text-indigo-400"
          >
            {condicionaisList.filter((c) => c.status !== "closed").length} ativas
          </Badge>
        </button>
      </div>

      {/* Conteúdo da Aba 1: Carnês & Caderninho */}
      {mainTab === "carnes" && (
        <>
          {/* KPI Cards de Carteira (Clean Paradigm) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total a Receber
            </span>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {formatMoney(report?.totalReceivableCents || 0)}
          </div>
          <div className="text-xs text-muted-foreground">Carteira ativa em aberto</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Inadimplência Geral
            </span>
            <Percent className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
            {report?.defaultRatePercent || 0}%
          </div>
          <div className="text-xs text-muted-foreground">
            {formatMoney(report?.overdueAmountCents || 0)} em atraso ({report?.overdueCount || 0} parcelas)
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recebido no Mês
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(report?.receivedThisMonthCents || 0)}
          </div>
          <div className="text-xs text-muted-foreground">Liquidações confirmadas</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Conciliações Pendentes
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {report?.pendingConciliationCount || 0}
          </div>
          <div className="text-xs text-muted-foreground">Aguardando análise da loja</div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Tabs de Filtro */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/50 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
              activeFilter === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Todos ({carnes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("due_soon")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
              activeFilter === "due_soon"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            A Vencer (7d)
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("late")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
              activeFilter === "late"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Em Atraso
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("pending_conciliation")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5",
              activeFilter === "pending_conciliation"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            ⏳ Conciliações
            {(report?.pendingConciliationCount || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[10px]">
                {report?.pendingConciliationCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("settled")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
              activeFilter === "settled"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Quitados
          </button>
        </div>

        {/* Campo de Busca */}
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl bg-card"
          />
        </div>
      </div>

      {/* Lista de Carnês & Parcelas */}
      {carnes.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-card rounded-2xl p-8 border border-dashed border-border/60 shadow-xs">
          <Receipt size={40} className="text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-semibold text-foreground">Nenhum carnê encontrado</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Não há contas a receber correspondentes ao filtro ativo. Use o botão acima para emitir um novo carnê.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {carnes.map((carne: any) => {
            const debtor = carne.debtor;
            const installments = carne.installments || [];
            const isSettled = carne.status === "settled";

            return (
              <div
                key={carne.id}
                className="bg-card rounded-2xl border border-border/60 shadow-xs overflow-hidden space-y-4 p-5"
              >
                {/* Header do Carnê */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" /> {carne.title}
                      </h3>
                      {isSettled ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                          Quitado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                          Ativo
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <User className="h-3 w-3" /> {debtor?.full_name || "Cliente não cadastrado"}
                      </span>
                      {debtor?.phone && <span>• Tel: {debtor.phone}</span>}
                      {carne.contract && (
                        <span className="text-primary font-medium flex items-center gap-1">
                          • Contrato: {carne.contract.title || "Assinado"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-base font-bold text-foreground">
                      {formatMoney(carne.total_cents)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {carne.installments_count} parcelas • Juros: {carne.interest_rate_monthly || 0}% a.m.
                    </div>
                  </div>
                </div>

                {/* Grade de Parcelas */}
                <div className="divide-y divide-border/40 -mx-5 px-5">
                  {installments.map((inst: any) => {
                    const isPaid = inst.status === "paid";
                    const isPending = inst.conciliation_status === "pending";
                    const isRejected = inst.conciliation_status === "rejected";
                    const dueDate = new Date(inst.due_date);
                    const isOverdue = !isPaid && dueDate < new Date();
                    const isChecked = selectedInstallmentIds.includes(inst.id);

                    const finalAmount = Number(
                      inst.final_amount_cents || inst.original_amount_cents || inst.amount_cents || 0,
                    );
                    const fineAmount = Number(inst.fine_cents || 0);
                    const interestAmount = Number(inst.interest_accrued_cents || 0);
                    const discountAmount = Number(inst.discount_cents || 0);

                    return (
                      <div
                        key={inst.id}
                        className={cn(
                          "py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm transition-colors",
                          isPending && "bg-amber-500/5 -mx-5 px-5",
                        )}
                      >
                        {/* Checkbox e Detalhes da Parcela */}
                        <div className="flex items-start sm:items-center gap-3">
                          {!isPaid && (
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => handleToggleSelectOne(inst.id)}
                              className="mt-1 sm:mt-0 rounded-md"
                            />
                          )}

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-xs sm:text-sm">
                                Parcela {inst.installment_number}/{carne.installments_count}
                              </span>

                              {isPaid && (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] py-0">
                                  Quitada
                                </Badge>
                              )}

                              {!isPaid && isPending && (
                                <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] py-0 animate-pulse">
                                  ⏳ Comprovante Enviado
                                </Badge>
                              )}

                              {!isPaid && isRejected && (
                                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] py-0">
                                  Comprovante Recusado
                                </Badge>
                              )}

                              {!isPaid && !isPending && isOverdue && (
                                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] py-0">
                                  Vencida ({inst.late_days || 1}d)
                                </Badge>
                              )}

                              {!isPaid && !isPending && !isOverdue && (
                                <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] py-0">
                                  A Vencer
                                </Badge>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                              <span>Vencimento: {formatDate(inst.due_date)}</span>
                              {isPaid && inst.paid_at && (
                                <span>• Baixa em: {formatDate(inst.paid_at)}</span>
                              )}
                              {inst.payment_method && (
                                <span>• Via: {inst.payment_method.toUpperCase()}</span>
                              )}
                            </div>

                            {/* Detalhes de Encargos */}
                            {!isPaid && (fineAmount > 0 || interestAmount > 0 || discountAmount > 0) && (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                <span>Nominal: {formatMoney(inst.original_amount_cents || inst.amount_cents)}</span>
                                {fineAmount > 0 && <span className="text-rose-500">+Multa: {formatMoney(fineAmount)}</span>}
                                {interestAmount > 0 && <span className="text-rose-500">+Juros: {formatMoney(interestAmount)}</span>}
                                {discountAmount > 0 && <span className="text-emerald-500">-Desc: {formatMoney(discountAmount)}</span>}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Valor e Ação */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                          <div className="text-left sm:text-right">
                            <div className="font-semibold text-foreground">
                              {formatMoney(finalAmount)}
                            </div>
                            {isPaid && (
                              <div className="text-[11px] text-emerald-600 flex items-center gap-0.5 justify-end">
                                <ShieldCheck className="h-3 w-3" /> Conciliado
                              </div>
                            )}
                          </div>

                          {!isPaid && (
                            <Button
                              size="sm"
                              variant={isPending ? "default" : "outline"}
                              className={cn(
                                "h-8 px-3 text-xs rounded-xl font-medium",
                                isPending
                                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                                  : "text-foreground",
                              )}
                              onClick={() => handleOpenConciliation(carne, inst)}
                            >
                              {isPending ? (
                                <>
                                  <Eye className="h-3.5 w-3.5 mr-1" /> Analisar Comprovante
                                </>
                              ) : (
                                <>Conciliar / Renegociar</>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Conteúdo da Aba 2: Condicionais & Malas (Varejo de Moda) */}
      {mainTab === "condicionais" && (
        <div className="space-y-6">
          {/* KPI Cards de Condicional */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Peças na Rua / Em Prova
                </span>
                <Shirt className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="text-xl font-bold text-foreground">
                {condicionaisList
                  .filter((c) => c.status !== "closed")
                  .reduce((acc, c) => acc + c.items.filter((i: any) => i.status === "with_customer").length, 0)}{" "}
                peças
              </div>
              <div className="text-xs text-muted-foreground">
                Em {condicionaisList.filter((c) => c.status !== "closed").length} malas com clientes
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Valor sob Confiança
                </span>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {formatMoney(
                  condicionaisList
                    .filter((c) => c.status !== "closed")
                    .reduce(
                      (acc, c) =>
                        acc +
                        c.items
                          .filter((i: any) => i.status === "with_customer")
                          .reduce((sum: number, it: any) => sum + it.priceCents, 0),
                      0,
                    ),
                )}
              </div>
              <div className="text-xs text-muted-foreground">Potencial de faturamento em aberto</div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Taxa de Conversão
                </span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">68.4%</div>
              <div className="text-xs text-muted-foreground">Média de peças aprovadas na prova</div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Atenção / Vencimento
                </span>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {condicionaisList.filter((c) => c.status === "due_today" || c.status === "overdue").length}
              </div>
              <div className="text-xs text-muted-foreground">Malas vencendo hoje ou atrasadas</div>
            </div>
          </div>

          {/* Filtros e Busca de Condicionais */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/50 overflow-x-auto">
              {(
                [
                  { key: "all", label: "Todas" },
                  { key: "open", label: "Em Prova" },
                  { key: "due_today", label: "Vence Hoje" },
                  { key: "overdue", label: "Em Atraso" },
                  { key: "closed", label: "Finalizadas" },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setCondicionaisFilter(f.key)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
                    condicionaisFilter === f.key
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente ou mala..."
                value={condicionaisSearch}
                onChange={(e) => setCondicionaisSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-card border-border/60"
              />
            </div>
          </div>

          {/* Listagem de Condicionais */}
          <div className="space-y-4">
            {condicionaisList
              .filter((c) => {
                if (condicionaisFilter !== "all" && c.status !== condicionaisFilter) return false;
                if (
                  condicionaisSearch &&
                  !c.customerName.toLowerCase().includes(condicionaisSearch.toLowerCase())
                ) {
                  return false;
                }
                return true;
              })
              .map((cond) => {
                const totalMalaCents = cond.items.reduce((acc: number, it: any) => acc + it.priceCents, 0);
                const isOverdue = cond.status === "overdue";
                const isDueToday = cond.status === "due_today";
                const isClosed = cond.status === "closed";

                return (
                  <div
                    key={cond.id}
                    className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4 hover:border-border transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {cond.customerName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">{cond.customerName}</span>
                            <span className="text-xs text-muted-foreground">{cond.customerPhone}</span>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-[10px] px-2 py-0 h-4">
                                Atrasada
                              </Badge>
                            )}
                            {isDueToday && (
                              <Badge className="text-[10px] px-2 py-0 h-4 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0">
                                Vence Hoje
                              </Badge>
                            )}
                            {!isOverdue && !isDueToday && !isClosed && (
                              <Badge variant="secondary" className="text-[10px] px-2 py-0 h-4">
                                Em Prova
                              </Badge>
                            )}
                            {isClosed && (
                              <Badge className="text-[10px] px-2 py-0 h-4 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">
                                Finalizada
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Saída: {formatDate(cond.dispatchDate)} • Devolução prevista: {formatDate(cond.returnDueDate)}
                            {cond.notes && ` • ${cond.notes}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {cond.customerPhone && (
                          <a
                            href={`https://wa.me/55${cond.customerPhone.replace(/\D/g, "")}?text=Ol%C3%A1%20${encodeURIComponent(
                              cond.customerName,
                            )}!%20Passando%20para%20saber%20como%20ficaram%20as%20pe%C3%A7as%20da%20sua%20mala%20condicional%20%E2%9C%A8`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border/70 hover:bg-muted/50 text-foreground transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp
                          </a>
                        )}

                        {!isClosed && (
                          <Button
                            size="sm"
                            className="h-8 px-3.5 text-xs rounded-xl bg-foreground text-background hover:bg-foreground/90 font-medium"
                            onClick={() => handleOpenReturnModal(cond)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Dar Baixa / Conferir
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Peças da Mala */}
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-1">
                        <span>Peças Sob Confiança ({cond.items.length})</span>
                        <span>Total da Mala: {formatMoney(totalMalaCents)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {cond.items.map((item: any) => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-lg bg-background border border-border/50 flex items-center justify-between text-xs"
                          >
                            <div className="truncate pr-2">
                              <p className="font-medium text-foreground truncate">{item.name}</p>
                              <p className="text-[11px] text-muted-foreground">Tam: {item.size}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-foreground">{formatMoney(item.priceCents)}</p>
                              <span
                                className={cn(
                                  "text-[10px] font-medium",
                                  item.status === "bought"
                                    ? "text-emerald-600"
                                    : item.status === "returned"
                                    ? "text-muted-foreground"
                                    : "text-indigo-600 dark:text-indigo-400",
                                )}
                              >
                                {item.status === "bought"
                                  ? "Comprado"
                                  : item.status === "returned"
                                  ? "Devolvido"
                                  : "Com Cliente"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Drawer Lateral / Modal de Conciliação e Aprovação */}
      <Dialog open={isConciliationOpen} onOpenChange={setIsConciliationOpen}>
        <DialogContent className="max-w-md sm:max-w-lg rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Conciliação da Parcela {selectedInstallment?.installment_number}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedCarne?.title} • Devedor: {selectedCarne?.debtor?.full_name}
            </DialogDescription>
          </DialogHeader>

          {/* Visualização do Comprovante Enviado */}
          {selectedInstallment?.conciliation_proof_url ? (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Comprovante Enviado pelo Cliente
              </Label>
              <div className="relative rounded-xl border overflow-hidden bg-muted/30 max-h-56 flex items-center justify-center">
                <img
                  src={selectedInstallment.conciliation_proof_url}
                  alt="Comprovante de Pagamento"
                  className="max-h-56 w-auto object-contain"
                />
                <a
                  href={selectedInstallment.conciliation_proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 hover:bg-background text-foreground shadow-xs text-xs flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ampliar
                </a>
              </div>
              {selectedInstallment.notes && (
                <p className="text-xs text-muted-foreground italic bg-muted/40 p-2 rounded-lg">
                  "{selectedInstallment.notes}"
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-muted/30 text-xs text-muted-foreground text-center">
              Nenhum comprovante anexado pelo cliente. Esta é uma baixa manual direta pela loja.
            </div>
          )}

          {/* Resumo de Valores e Opções de Desconto/Isenção */}
          {!isRejecting ? (
            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Valor Nominal:</span>
                  <span>
                    {formatMoney(
                      selectedInstallment?.original_amount_cents ||
                        selectedInstallment?.amount_cents ||
                        0,
                    )}
                  </span>
                </div>

                {Number(selectedInstallment?.fine_cents || 0) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Multa de Mora:</span>
                    <span>+{formatMoney(selectedInstallment.fine_cents)}</span>
                  </div>
                )}

                {Number(selectedInstallment?.interest_accrued_cents || 0) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Juros Moratórios:</span>
                    <span>+{formatMoney(selectedInstallment.interest_accrued_cents)}</span>
                  </div>
                )}

                {waiveInterest && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Isenção de Encargos:</span>
                    <span>
                      -
                      {formatMoney(
                        Number(selectedInstallment?.fine_cents || 0) +
                          Number(selectedInstallment?.interest_accrued_cents || 0),
                      )}
                    </span>
                  </div>
                )}

                {discountCents > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Desconto Adicional:</span>
                    <span>-{formatMoney(discountCents)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-border/40">
                  <span>Valor Final Aprovado:</span>
                  <span className="text-primary">
                    {formatMoney(
                      Math.max(
                        0,
                        (waiveInterest
                          ? Number(
                              selectedInstallment?.original_amount_cents ||
                                selectedInstallment?.amount_cents ||
                                0,
                            )
                          : Number(
                              selectedInstallment?.final_amount_cents ||
                                selectedInstallment?.original_amount_cents ||
                                selectedInstallment?.amount_cents ||
                                0,
                            )) - discountCents,
                      ),
                    )}
                  </span>
                </div>
              </div>

              {/* Toggles de Renegociação */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="waive-interest"
                    checked={waiveInterest}
                    onCheckedChange={(checked) => setWaiveInterest(!!checked)}
                  />
                  <label
                    htmlFor="waive-interest"
                    className="text-xs font-medium text-foreground cursor-pointer"
                  >
                    Isentar juros e multa de atraso para o cliente
                  </label>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Desconto adicional em reais (R$, opcional)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    onChange={(e) => setDiscountCents(Math.round(Number(e.target.value) * 100))}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Observação da conciliação</Label>
                  <Input
                    placeholder="Ex: Pagamento conferido na conta Santander..."
                    value={conciliationNotes}
                    onChange={(e) => setConciliationNotes(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-between gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs h-10"
                  onClick={() => setIsRejecting(true)}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Recusar Comprovante
                </Button>

                <Button
                  type="button"
                  disabled={isApproving}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 px-4 font-medium"
                  onClick={handleConfirmApproval}
                >
                  {isApproving ? "Conciliando..." : "Confirmar Baixa & Espelhar"}
                </Button>
              </div>
            </div>
          ) : (
            /* Fluxo de Recusa do Comprovante */
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Justificativa da Recusa para o Cliente *
                </Label>
                <Textarea
                  placeholder="Ex: O comprovante está ilegível / Valor transferido inferior ao devido..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="text-xs min-h-[80px] rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl text-xs h-10"
                  onClick={() => setIsRejecting(false)}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  disabled={isRejectingMutation || !rejectReason.trim()}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs h-10 px-4"
                  onClick={handleConfirmRejection}
                >
                  {isRejectingMutation ? "Recusando..." : "Confirmar Recusa e Notificar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Cobrança em Massa */}
      <Dialog open={isMassBillingOpen} onOpenChange={setIsMassBillingOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Cobrança em Massa
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Você selecionou {selectedInstallmentIds.length} parcela(s) para envio de notificação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Template de Notificação</Label>
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border bg-card cursor-pointer hover:bg-muted/30">
                  <input
                    type="radio"
                    name="massTemplate"
                    checked={massTemplate === "friendly"}
                    onChange={() => setMassTemplate("friendly")}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground block">
                      📅 Lembrete Amigável
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Avisa sobre o vencimento próximo da parcela com instruções de pagamento.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border bg-card cursor-pointer hover:bg-muted/30">
                  <input
                    type="radio"
                    name="massTemplate"
                    checked={massTemplate === "due_warning"}
                    onChange={() => setMassTemplate("due_warning")}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground block">
                      ⚠️ Aviso de Vencimento
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Alerta sobre juros de mora e pede a regularização imediata da dívida.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border bg-card cursor-pointer hover:bg-muted/30">
                  <input
                    type="radio"
                    name="massTemplate"
                    checked={massTemplate === "overdue_discount"}
                    onChange={() => setMassTemplate("overdue_discount")}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground block">
                      🎁 Oferta de Desconto para Quitação
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Oferece um percentual de desconto caso o cliente quite a parcela hoje.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {massTemplate === "overdue_discount" && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Desconto Ofertado (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={massDiscount}
                  onChange={(e) => setMassDiscount(Number(e.target.value))}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs h-10"
                onClick={() => setIsMassBillingOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isSendingMass}
                className="rounded-xl bg-primary text-primary-foreground text-xs h-10 px-4 font-medium"
                onClick={() =>
                  sendMassReminders({
                    data: {
                      installmentIds: selectedInstallmentIds,
                      template: massTemplate,
                      discountOfferedPercent:
                        massTemplate === "overdue_discount" ? massDiscount : undefined,
                    },
                  })
                }
              >
                {isSendingMass ? "Enviando..." : "Disparar Cobranças"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Emissão Direta de Carnê */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Emitir Novo Carnê Digital
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Gere um plano de parcelamento para um cliente com cálculo automático de juros e vencimentos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCarneSubmit} className="space-y-3.5 pt-1">
            {/* Seleção do Cliente */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Cliente (Devedor) *</Label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        {selectedCustomer.full_name}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {selectedCustomer.email || selectedCustomer.phone}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground h-7"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Input
                    placeholder="Digite nome, e-mail ou telefone do cliente..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                  {searchedCustomers.length > 0 && (
                    <div className="rounded-xl border divide-y bg-card max-h-36 overflow-y-auto shadow-xs">
                      {searchedCustomers.map((cust: any) => (
                        <div
                          key={cust.id}
                          className="p-2 text-xs flex items-center justify-between hover:bg-muted/40 cursor-pointer"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setCustomerSearch("");
                          }}
                        >
                          <div>
                            <span className="font-medium text-foreground block">{cust.full_name}</span>
                            <span className="text-[11px] text-muted-foreground block">
                              {cust.email || cust.phone}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Título da Compra */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Título do Carnê / Compra *</Label>
              <Input
                placeholder="Ex: Compra de Móveis Planejados, Tratamento Dental..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            {/* Valor e Parcelas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Valor Total (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  value={newTotalReais || ""}
                  onChange={(e) => setNewTotalReais(Number(e.target.value))}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Quantidade de Parcelas *</Label>
                <Input
                  type="number"
                  min="1"
                  max="72"
                  value={newInstallmentsCount}
                  onChange={(e) => setNewInstallmentsCount(Number(e.target.value))}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Primeira Data de Vencimento */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Primeiro Vencimento *
              </Label>
              <Input
                type="date"
                value={newFirstDueDate}
                onChange={(e) => setNewFirstDueDate(e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            {/* Taxas de Encargos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Juros Mensal (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newInterestRate}
                  onChange={(e) => setNewInterestRate(Number(e.target.value))}
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Multa Atraso (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newFinePercent}
                  onChange={(e) => setNewFinePercent(Number(e.target.value))}
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Carência (dias)</Label>
                <Input
                  type="number"
                  min="0"
                  value={newGraceDays}
                  onChange={(e) => setNewGraceDays(Number(e.target.value))}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs h-10"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="rounded-xl bg-primary text-primary-foreground text-xs h-10 px-4 font-medium"
              >
                {isCreating ? "Gerando Carnê..." : "Emitir Carnê Digital"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 1: Nova Saída em Condicional (Mala / Prova em Casa) */}
      <Dialog open={isCreateCondicionalOpen} onOpenChange={setIsCreateCondicionalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Shirt className="h-5 w-5 text-indigo-500" />
              Nova Saída em Condicional (Mala)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Registre as peças emprestadas para a cliente provar em casa. As peças ficam sob responsabilidade dela pelo prazo estipulado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCondicional} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nome da Cliente *</Label>
                <Input
                  placeholder="Ex: Mariana Silva"
                  value={newCondCustomerName}
                  onChange={(e) => setNewCondCustomerName(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">WhatsApp / Telefone</Label>
                <Input
                  placeholder="(49) 99999-9999"
                  value={newCondCustomerPhone}
                  onChange={(e) => setNewCondCustomerPhone(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Prazo de Retorno (Dias)</Label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 5].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setNewCondDays(d)}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-medium rounded-xl border transition-colors",
                        newCondDays === d
                          ? "bg-foreground text-background border-foreground font-semibold"
                          : "border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {d} {d === 1 ? "dia" : "dias"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Observação (Opcional)</Label>
                <Input
                  placeholder="Ex: Prova para festa de formatura"
                  value={newCondNotes}
                  onChange={(e) => setNewCondNotes(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Peças Dinâmicas */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Peças da Mala</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs rounded-lg"
                  onClick={() =>
                    setNewCondItems([...newCondItems, { name: "", size: "M", priceReais: 0 }])
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Peça
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {newCondItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Descrição da peça"
                      value={item.name}
                      onChange={(e) => {
                        const updated = [...newCondItems];
                        updated[idx].name = e.target.value;
                        setNewCondItems(updated);
                      }}
                      className="h-8 text-xs rounded-xl flex-2"
                    />
                    <Input
                      placeholder="Tam"
                      value={item.size}
                      onChange={(e) => {
                        const updated = [...newCondItems];
                        updated[idx].size = e.target.value;
                        setNewCondItems(updated);
                      }}
                      className="h-8 text-xs rounded-xl w-16"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="R$ Preço"
                      value={item.priceReais || ""}
                      onChange={(e) => {
                        const updated = [...newCondItems];
                        updated[idx].priceReais = Number(e.target.value);
                        setNewCondItems(updated);
                      }}
                      className="h-8 text-xs rounded-xl w-24"
                    />
                    {newCondItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-rose-600 shrink-0"
                        onClick={() => setNewCondItems(newCondItems.filter((_, i) => i !== idx))}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-muted/40 text-xs flex justify-between font-medium">
                <span className="text-muted-foreground">Valor Total da Mala:</span>
                <span className="text-foreground font-bold">
                  {formatMoney(
                    Math.round(
                      newCondItems.reduce((acc, it) => acc + (Number(it.priceReais) || 0), 0) * 100,
                    ),
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs h-9"
                onClick={() => setIsCreateCondicionalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-foreground text-background hover:bg-foreground/90 text-xs h-9 px-4 font-medium"
              >
                Registrar Saída em Condicional
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Conferência e Baixa de Condicional */}
      <Dialog open={isReturnCondicionalOpen} onOpenChange={setIsReturnCondicionalOpen}>
        <DialogContent className="max-w-md sm:max-w-lg rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Conferência de Retorno — {selectedCondicional?.customerName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione quais peças a cliente decidiu comprar e quais estão sendo devolvidas para reintegração automática ao estoque da loja.
            </DialogDescription>
          </DialogHeader>

          {selectedCondicional && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedCondicional.items.map((item: any) => {
                  const decision = itemReturnDecisions[item.id] || "bought";
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-border/50 bg-background flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="truncate">
                        <p className="font-semibold text-foreground truncate">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Tam: {item.size} • {formatMoney(item.priceCents)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setItemReturnDecisions({ ...itemReturnDecisions, [item.id]: "bought" })
                          }
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                            decision === "bought"
                              ? "bg-emerald-600 text-white border-emerald-600 font-semibold"
                              : "border-border/60 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          🛍️ Comprou
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setItemReturnDecisions({ ...itemReturnDecisions, [item.id]: "returned" })
                          }
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                            decision === "returned"
                              ? "bg-muted text-foreground border-border font-semibold"
                              : "border-border/60 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          ↩️ Devolveu
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumo Financeiro da Baixa */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peças Compradas:</span>
                  <span className="font-bold text-foreground">
                    {
                      selectedCondicional.items.filter(
                        (it: any) => (itemReturnDecisions[it.id] || "bought") === "bought",
                      ).length
                    }{" "}
                    peças
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Faturado:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(
                      selectedCondicional.items
                        .filter((it: any) => (itemReturnDecisions[it.id] || "bought") === "bought")
                        .reduce((sum: number, it: any) => sum + it.priceCents, 0),
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                  <span>Reintegradas ao Estoque:</span>
                  <span>
                    {
                      selectedCondicional.items.filter(
                        (it: any) => (itemReturnDecisions[it.id] || "bought") === "returned",
                      ).length
                    }{" "}
                    peças voltam ao saldo de produtos
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl text-xs h-9"
                  onClick={() => setIsReturnCondicionalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9 px-4"
                  onClick={handleConfirmReturnCondicional}
                >
                  Confirmar Baixa & Reintegrar Peças
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
