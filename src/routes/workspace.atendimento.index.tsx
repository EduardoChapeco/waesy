import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { TransferChatThreadModal } from "@/components/chat/TransferChatThreadModal";
import { QuickAnswersManagerModal } from "@/components/chat/QuickAnswersManagerModal";
import { ScheduleWhatsAppMessageModal } from "@/components/chat/ScheduleWhatsAppMessageModal";
import { WhatsAppQrConnectModal } from "@/components/chat/whatsapp-qr-connect-modal";
import { WhatsAppTeamSectorsDrawer } from "@/components/chat/whatsapp-team-sectors-drawer";
import { listStoreQuickAnswers, interpolateTemplateVariables } from "@/services/chat-operations.functions";
import { listTeamMembers } from "@/services/admin-team.functions";
import {
  listChatThreads,
  getChatMessages,
  sendChatMessage,
  assignChatThread,
  updateTicketStatus,
  archiveChatThread,
  saveStoreSupportSettings,
  clearChatThreadMessagesLocal,
  deleteChatThreadLocal,
  resetStoreChatHistoryLocal,
} from "@/services/chat.functions";
import { getStoreSettings } from "@/services/store.functions";
import {
  listIntranetChannels,
  createIntranetChannel,
  sendIntranetMessage,
  toggleIntranetMilestone,
  getStoreIntranetSalesSpreadsheet,
} from "@/services/intranet.functions";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { getRealtimeChannel } from "@/services/realtime-channel";
import { getClientActiveTenant } from "@/lib/context-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Lock,
  EyeOff,
  MessageSquare,
  ArrowLeft,
  Search,
  Filter,
  Send,
  UserCheck,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  DollarSign,
  Info,
  Loader2,
  RefreshCw,
  Layers,
  ShieldCheck,
  Bot,
  Star,
  Flame,
  Target,
  HelpCircle,
  Copy,
  ExternalLink,
  MessageCircle,
  Plus,
  FileText,
  Activity,
  Smartphone,
  Archive,
  ArchiveRestore,
  QrCode,
  CheckCheck,
  Sliders,
  Radio,
  CalendarClock,
  ArrowRightLeft,
  Zap,
  MoreVertical,
  Eraser,
  Trash2,
  Ban,
  PowerOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatDate, formatRelativeTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { OrderMessageCard } from "@/components/chat/order-message-card";
import { RmaMessageCard } from "@/components/chat/rma-message-card";
import { Customer360Sidebar } from "@/components/chat/customer-360-sidebar";
import { StructuredMessageView } from "@/components/chat/structured-message-view";
import { playMessageChime } from "@/lib/audio-chimes";
import { listSdrChatSessions, type SdrChatSessionDTO } from "@/services/ai-sdr.functions";
import {
  listWorkspaceWhatsAppInstances, normalizeWhatsAppQrDataUri,
  syncWhatsAppChatsFromEvolution,
  disconnectWhatsAppInstance,
  type WhatsAppChannelInstanceDTO,
} from "@/services/whatsapp-channel-instances.functions";
import { Link } from "@tanstack/react-router";
import { WhatsAppOperationsMetricsPanel } from "@/components/chat/whatsapp-operations-metrics-panel";
import { TransferTicketDialog } from "@/components/chat/TransferTicketDialog";
import { QuickRepliesMenu, type QuickReplyItem } from "@/components/chat/QuickRepliesMenu";
import { ThreadTagsPicker } from "@/components/chat/ThreadTagsPicker";
import { listChatQuickReplies } from "@/services/chat.functions";
import {
  Tag,
  Hash,
  Users,
  Share2,
  GitBranch,
  FileSpreadsheet,
  ClipboardList,
  Calendar,
  Sparkles,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  AlertCircle,
} from "lucide-react";

function MessageDeliveryStatusIcon({ status }: { status?: string }) {
  if (status === "read") {
    return <CheckCheck className="size-3.5 text-sky-500 dark:text-sky-400 inline" aria-label="Lida" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="size-3.5 text-muted-foreground inline" aria-label="Entregue" />;
  }
  if (status === "failed") {
    return <AlertCircle className="size-3 text-destructive inline" aria-label="Falha de envio" />;
  }
  return <Check className="size-3 text-muted-foreground inline" aria-label="Enviada" />;
}
import { ArtifactInteractiveTable } from "@/components/chat/artifacts/ArtifactInteractiveTable";
import {
  ChatQuickComposerModals,
  type StructuredDispatchPayload,
} from "@/components/chat/ChatQuickComposerModals";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AtendimentoSearch = {
  threadId?: string;
  search?: string;
  storeId?: string;
};

export const Route = createFileRoute("/workspace/atendimento/")({
  head: () => ({ meta: [{ title: "Atendimento Omnichannel & WhatsApp" }] }),
  validateSearch: (search: Record<string, unknown>): AtendimentoSearch => ({
    threadId: typeof search.threadId === "string" ? search.threadId : undefined,
    search: typeof search.search === "string" ? search.search : undefined,
    storeId: typeof search.storeId === "string" ? search.storeId : undefined,
  }),
  loaderDeps: ({ search }) => ({ storeId: search.storeId }),
  loader: async ({ deps }) => {
    try {
      const store = await getStoreSettings({ data: { store_id: deps?.storeId } }).catch(() => null);
      const storeId = store?.id || deps?.storeId || undefined;
      const [res, sdrData, instances, quickReplies, intranetChannels] = await Promise.all([
        listChatThreads({ data: { store_id: storeId } }).catch(() => null),
        listSdrChatSessions().catch(() => ({
          sessions: [],
          metrics: { total: 0, readyToBuy: 0, warm: 0, curious: 0 },
        })),
        listWorkspaceWhatsAppInstances({ data: { store_id: storeId } }).catch(() => []),
        listChatQuickReplies().catch(() => [] as QuickReplyItem[]),
        listIntranetChannels({ data: { store_id: storeId } }).catch(() => []),
      ]);
      return {
        ...(res || {
          threads: [],
          metrics: { total: 0, open: 0, closed: 0, avg_rating: 0, sla_first_response_min: 0 },
        }),
        store,
        sdrSessions: sdrData?.sessions || [],
        sdrMetrics: sdrData?.metrics || { total: 0, readyToBuy: 0, warm: 0, curious: 0 },
        whatsappInstances: (instances || []) as WhatsAppChannelInstanceDTO[],
        quickReplies: (quickReplies || []) as QuickReplyItem[],
        intranetChannels: (intranetChannels || []) as any[],
      };
    } catch (e) {
      console.warn("[workspace.atendimento] Fallback de segurança no loader:", e);
      return {
        threads: [],
        metrics: { total: 0, open: 0, closed: 0, avg_rating: 0, sla_first_response_min: 0 },
        store: null,
        sdrSessions: [],
        sdrMetrics: { total: 0, readyToBuy: 0, warm: 0, curious: 0 },
        whatsappInstances: [] as WhatsAppChannelInstanceDTO[],
        quickReplies: [] as QuickReplyItem[],
        intranetChannels: [],
      };
    }
  },
  component: WorkspaceAtendimentoPage,
});

const DEPARTMENT_LABELS: Record<string, string> = {
  geral: "Geral",
  vendas: "Vendas / Comercial",
  suporte: "Suporte / SAC",
  financeiro: "Financeiro / Pix",
  cozinha_estoque: "Cozinha / Estoque",
  logistica: "Logística / Motoboy",
};

function WorkspaceAtendimentoPage() {
  const {
    threads: initialThreads,
    metrics,
    isSupervisor,
    store,
    sdrSessions: initialSdrSessions,
    sdrMetrics: initialSdrMetrics,
    whatsappInstances: initialInstances,
    quickReplies: initialQuickReplies,
    intranetChannels: initialIntranetChannels,
  } = (Route.useLoaderData?.() as any) || {};

  const searchParams = Route.useSearch?.() || {};
  const semantics = useMemo(() => getNicheSemantics(store), [store]);
  const departmentLabels = semantics.departmentLabels || DEPARTMENT_LABELS;

  // Modais de Operações Avançadas (Whaticket Toolkit)
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [quickAnswersModalOpen, setQuickAnswersModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [qrConnectModalOpen, setQrConnectModalOpen] = useState(false);
  const [teamSectorsDrawerOpen, setTeamSectorsDrawerOpen] = useState(false);

  // Queries de Macros Dinâmicas e Membros da Equipe
  const { data: storeMacros = [] } = useQuery({
    queryKey: ["workspace-quick-answers"],
    queryFn: () => listStoreQuickAnswers().catch(() => []),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["workspace-team-members"],
    queryFn: () => listTeamMembers().catch(() => []),
  });

  // Tabs do Hub: Conversas estilo WhatsApp, Intranet Corporativa, SDR, Telemetria & Filas, Conexão WhatsApp e Horários
  const [activeHubTab, setActiveHubTab] = useState<
    "live" | "intranet" | "sdr" | "metrics" | "whatsapp" | "hours"
  >("live");
  const [showLiveTimeline, setShowLiveTimeline] = useState(false);
  const [liveComposerTrayOpen, setLiveComposerTrayOpen] = useState(false);
  const [liveModalOverride, setLiveModalOverride] = useState<
    "form" | "event" | "sticker" | "spreadsheet" | null
  >(null);

  // Estados da Intranet Corporativa (Canais estilo Slack + Linha do Tempo + Planilhas)
  const [intranetScopeFilter, setIntranetScopeFilter] = useState<"all" | "public" | "private">("all");
  const [intranetCreatorFilter, setIntranetCreatorFilter] = useState<string>("all");
  const [intranetSearch, setIntranetSearch] = useState("");
  const [newChannelModalOpen, setNewChannelModalOpen] = useState(false);
  const [newChannelTitle, setNewChannelTitle] = useState("");
  const [newChannelDept, setNewChannelDept] = useState("Executivo");
  const [newChannelScope, setNewChannelScope] = useState<"public" | "private">("private");
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});
  const [intranetComposerText, setIntranetComposerText] = useState("");
  const [intranetTrayOpen, setIntranetTrayOpen] = useState(false);
  const [intranetModalOverride, setIntranetModalOverride] = useState<
    "form" | "event" | "sticker" | "spreadsheet" | null
  >(null);

  const [intranetChannels, setIntranetChannels] = useState<any[]>(initialIntranetChannels || []);
  const [activeIntranetChannelId, setActiveIntranetChannelId] = useState<string>(
    initialIntranetChannels?.[0]?.id || ""
  );

  useEffect(() => {
    if ((!activeIntranetChannelId || !intranetChannels.some((c: any) => c.id === activeIntranetChannelId)) && intranetChannels.length > 0) {
      setActiveIntranetChannelId(intranetChannels[0].id);
    }
  }, [intranetChannels, activeIntranetChannelId]);

  const { data: storeSalesSpreadsheet } = useQuery({
    queryKey: ["store-intranet-sales-spreadsheet", store?.id],
    queryFn: () => getStoreIntranetSalesSpreadsheet({ data: { storeId: store?.id } }),
    enabled: Boolean(store?.id),
    staleTime: 60000,
  });

  const activeIntranetChannel = useMemo(() => {
    const raw = intranetChannels.find((c) => c.id === activeIntranetChannelId) || intranetChannels[0];
    if (!raw) return raw;
    if (raw.spreadsheet && storeSalesSpreadsheet && Array.isArray(storeSalesSpreadsheet.rows) && storeSalesSpreadsheet.rows.length > 0) {
      return {
        ...raw,
        spreadsheet: storeSalesSpreadsheet,
      };
    }
    return raw;
  }, [intranetChannels, activeIntranetChannelId, storeSalesSpreadsheet]);

  // Status de presença do atendente
  const [agentPresence, setAgentPresence] = useState<"online" | "busy" | "away">("online");

  // Filtro de status da lista (all: ativas | open: novas | archived: arquivadas)
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "waiting" | "archived">("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState((searchParams as any).search || "");

  // Instâncias de WhatsApp
  const [whatsappInstances, setWhatsappInstances] = useState<WhatsAppChannelInstanceDTO[]>(initialInstances || []);
  const [isRefreshingWhatsApp, setIsRefreshingWhatsApp] = useState(false);
  const [isSyncingWhatsApp, setIsSyncingWhatsApp] = useState(false);

  const handleSyncWhatsApp = async () => {
    setIsSyncingWhatsApp(true);
    try {
      const res = await syncWhatsAppChatsFromEvolution({ data: { storeId: store?.id } });
      const threadsRes = await listChatThreads({ data: { store_id: store?.id } });
      if (threadsRes?.threads) {
        setThreads(threadsRes.threads);
      }
      toast.success(
        res?.importedCount
          ? `${res.importedCount} conversas sincronizadas do WhatsApp!`
          : "Sincronização concluída. Todas as conversas estão atualizadas."
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao sincronizar conversas do WhatsApp.");
    } finally {
      setIsSyncingWhatsApp(false);
    }
  };

  const handleRefreshWhatsAppStatus = async () => {
    setIsRefreshingWhatsApp(true);
    try {
      const [instances, syncRes] = await Promise.all([
        listWorkspaceWhatsAppInstances({ data: { store_id: store?.id } }),
        syncWhatsAppChatsFromEvolution({ data: { storeId: store?.id } }).catch((e) => {
          console.warn("[whatsapp] Falha no sync automático:", e);
          return null;
        }),
      ]);
      setWhatsappInstances(instances);
      const threadsRes = await listChatThreads({ data: { store_id: store?.id } }).catch(() => null);
      if (threadsRes?.threads) {
        setThreads(threadsRes.threads);
      }
      toast.success(
        syncRes?.importedCount
          ? `Status atualizado! ${syncRes.importedCount} conversas sincronizadas.`
          : "Status da conexão WhatsApp atualizado."
      );
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível atualizar a conexão WhatsApp.");
    } finally {
      setIsRefreshingWhatsApp(false);
    }
  };

  // Estados para Desconexão Completa do WhatsApp
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [selectedDisconnectInstanceId, setSelectedDisconnectInstanceId] = useState<string | null>(null);
  const [deepDisconnect, setDeepDisconnect] = useState(false);
  const [isDisconnectingWhatsApp, setIsDisconnectingWhatsApp] = useState(false);

  const handleDisconnectWhatsApp = async () => {
    const inst = (selectedDisconnectInstanceId ? whatsappInstances.find((i) => i.id === selectedDisconnectInstanceId) : null) || whatsappInstances.find((i) => i.status === "connected") || whatsappInstances[0];
    const instId = inst?.id;
    if (!instId || !store?.id) {
      toast.error("Nenhuma instância ativa do WhatsApp selecionada.");
      return;
    }
    setIsDisconnectingWhatsApp(true);
    try {
      await disconnectWhatsAppInstance({
        data: {
          id: instId,
          storeId: store.id,
          deepDisconnect,
        },
      });
      const instances = await listWorkspaceWhatsAppInstances({ data: { store_id: store.id } }).catch(() => []);
      setWhatsappInstances(instances);
      setDisconnectModalOpen(false);
      setSelectedDisconnectInstanceId(null);
      toast.success(deepDisconnect ? "WhatsApp desconectado e credenciais removidas." : "WhatsApp desconectado com sucesso.");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao desconectar instância.");
    } finally {
      setIsDisconnectingWhatsApp(false);
    }
  };

  // Estados para Limpar e Excluir Conversas Localmente (Sem afetar o WhatsApp do cliente)
  const [clearMessagesModalOpen, setClearMessagesModalOpen] = useState(false);
  const [isClearingMessages, setIsClearingMessages] = useState(false);

  const handleClearThreadMessages = async () => {
    if (!activeThread?.id || !store?.id) return;
    setIsClearingMessages(true);
    try {
      await clearChatThreadMessagesLocal({
        data: { threadId: activeThread.id, storeId: store.id },
      });
      setMessages([]);
      setClearMessagesModalOpen(false);
      const threadsRes = await listChatThreads({ data: { store_id: store.id } }).catch(() => null);
      if (threadsRes?.threads) setThreads(threadsRes.threads);
      toast.success("Mensagens apagadas estritamente no sistema local.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao limpar mensagens.");
    } finally {
      setIsClearingMessages(false);
    }
  };

  const [deleteThreadModalOpen, setDeleteThreadModalOpen] = useState(false);
  const [isDeletingThread, setIsDeletingThread] = useState(false);

  const handleDeleteThread = async () => {
    if (!activeThread?.id || !store?.id) return;
    setIsDeletingThread(true);
    try {
      await deleteChatThreadLocal({
        data: { threadId: activeThread.id, storeId: store.id },
      });
      setMessages([]);
      setDeleteThreadModalOpen(false);
      const remainingThreads = threads.filter((t) => t.id !== activeThread.id);
      setThreads(remainingThreads);
      setActiveThreadId(remainingThreads.length > 0 ? remainingThreads[0].id : null);
      toast.success("Conversa excluída do sistema local.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir conversa.");
    } finally {
      setIsDeletingThread(false);
    }
  };

  const [resetHistoryModalOpen, setResetHistoryModalOpen] = useState(false);
  const [resetConfirmationCode, setResetConfirmationCode] = useState("");
  const [isResettingHistory, setIsResettingHistory] = useState(false);

  const handleResetStoreHistory = async () => {
    if (!store?.id) return;
    if (resetConfirmationCode.trim() !== "RESETAR") {
      toast.error("Digite RESETAR para confirmar a exclusão do histórico local.");
      return;
    }
    setIsResettingHistory(true);
    try {
      const res = await resetStoreChatHistoryLocal({
        data: { storeId: store.id, confirmationCode: "RESETAR" },
      });
      setThreads([]);
      setMessages([]);
      setActiveThreadId(null);
      setResetHistoryModalOpen(false);
      setResetConfirmationCode("");
      toast.success(`Histórico local resetado! ${res.deletedThreadsCount} conversas removidas do sistema.`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao resetar histórico da loja.");
    } finally {
      setIsResettingHistory(false);
    }
  };

  // Estados SDR
  const [sdrSessions] = useState<SdrChatSessionDTO[]>(initialSdrSessions || []);
  const [sdrMetrics] = useState(initialSdrMetrics || { total: 0, readyToBuy: 0, warm: 0, curious: 0 });
  const [sdrIntentFilter, setSdrIntentFilter] = useState<string>("all");
  const [sdrSearchTerm, setSdrSearchTerm] = useState("");
  const [selectedSdrSession, setSelectedSdrSession] = useState<SdrChatSessionDTO | null>(null);
  const [sdrDrawerOpen, setSdrDrawerOpen] = useState(false);

  // Estados de Conversas
  const [threads, setThreads] = useState<any[]>(initialThreads || []);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => {
    if ((searchParams as any)?.threadId) return (searchParams as any).threadId;
    if (typeof window !== "undefined" && window.innerWidth < 768) return null;
    return (initialThreads && initialThreads.length > 0 ? initialThreads[0]?.id : null) || null;
  });

  useEffect(() => {
    if (initialThreads) {
      setThreads(initialThreads);
    }
  }, [initialThreads]);

  useEffect(() => {
    if (!activeThreadId && threads.length > 0 && typeof window !== "undefined" && window.innerWidth >= 768) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  // Client-side fallback defensivo para sincronizar threads com o tenant ativo do workspace
  useEffect(() => {
    if (typeof window === "undefined") return;
    const activeTenant = getClientActiveTenant();
    const effectiveStore = store?.id || activeTenant;
    if (effectiveStore && threads.length === 0) {
      listChatThreads({ data: { store_id: effectiveStore } }).then((res) => {
        if (res?.threads && res.threads.length > 0) {
          setThreads(res.threads);
        }
      }).catch(() => {});
    }
  }, [store?.id, threads.length]);

  const activeThreadIdRef = useRef<string | null>(activeThreadId);
  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  const statusFilterRef = useRef(statusFilter);
  useEffect(() => {
    statusFilterRef.current = statusFilter;
  }, [statusFilter]);

  const threadsRef = useRef(threads);
  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  // Revalidação em background da lista de conversas
  const reloadThreads = useCallback(async () => {
    const activeTenant = typeof window !== "undefined" ? getClientActiveTenant() : null;
    const effectiveStoreId = store?.id || activeTenant;
    if (!effectiveStoreId) return;
    try {
      const sf = statusFilterRef.current;
      const res = await listChatThreads({
        data: {
          store_id: effectiveStoreId,
          status: (sf === "waiting" ? "open" : sf) as any,
        },
      });
      if (res?.threads) {
        setThreads(res.threads);
      }
    } catch (e) {
      console.warn("[atendimento] Erro ao recarregar threads:", e);
    }
  }, [store?.id]);

  // Revalidação em background das mensagens da conversa ativa
  const reloadActiveMessages = useCallback(async (targetThreadId?: string) => {
    const tId = targetThreadId || activeThreadIdRef.current;
    if (!tId) return;
    try {
      const res: any = await getChatMessages({ data: { threadId: tId } });
      if (res?.messages && activeThreadIdRef.current === tId) {
        setMessages(res.messages);
      }
    } catch (e) {
      console.warn("[atendimento] Erro ao recarregar mensagens:", e);
    }
  }, []);

  useEffect(() => {
    if ((searchParams as any)?.search) {
      setSearchTerm((searchParams as any).search);
    }
    if ((searchParams as any)?.threadId) {
      setActiveThreadId((searchParams as any).threadId);
    }
  }, [(searchParams as any)?.search, (searchParams as any)?.threadId]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showCustomer360, setShowCustomer360] = useState(true);
  const [mobileCustomer360Open, setMobileCustomer360Open] = useState(false);
  const [isWhisperMode, setIsWhisperMode] = useState(false);
  const [aiAutoReplyPerThread, setAiAutoReplyPerThread] = useState<Record<string, boolean>>({});
  const [assignedAgentPerThread, setAssignedAgentPerThread] = useState<Record<string, string>>({});
  const [baseQuickReplies] = useState<QuickReplyItem[]>(initialQuickReplies || []);

  const quickReplies = useMemo<QuickReplyItem[]>(() => { const byShortcut = new Map<string, QuickReplyItem>(); for (const item of baseQuickReplies) byShortcut.set(String(item.shortcut || "").toLowerCase(), item); for (const m of storeMacros as any[]) { const sc = String(m.shortcut || "").toLowerCase(); if (sc) byShortcut.set(sc, { id: m.id, shortcut: sc, title: m.title || sc, content: m.message || m.content || "", category: m.category || "geral" }); } return Array.from(byShortcut.values()); }, [baseQuickReplies, storeMacros]);
  // Ticket Resolver Modal state
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketStatus, setTicketStatus] = useState<any>("resolved");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolvingTicket, setIsResolvingTicket] = useState(false);

  // Estados de Horários de Atendimento & Ausência (Persistidos)
  const initialSupportSettings = (store?.settings as any)?.support_settings || {};
  const [supportSchedules, setSupportSchedules] = useState<Array<{ day: string; hours: string; active: boolean }>>(
    initialSupportSettings.support_schedules || [],
  );
  const [awayMessage, setAwayMessage] = useState<string>(
    initialSupportSettings.away_message || "",
  );
  const [autoReplyEnabled, setAutoReplyEnabled] = useState<boolean>(
    initialSupportSettings.auto_reply_enabled ?? true,
  );
  const [isSavingSupportSettings, setIsSavingSupportSettings] = useState(false);

  const handleSaveSupportSettings = async () => {
    setIsSavingSupportSettings(true);
    try {
      await saveStoreSupportSettings({
        data: {
          away_message: awayMessage,
          auto_reply_enabled: autoReplyEnabled,
          support_schedules: supportSchedules,
        },
      });
      toast.success("Horários e mensagem de ausência salvos no banco com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar configurações de atendimento.");
    } finally {
      setIsSavingSupportSettings(false);
    }
  };

  const activeThread = threads.find((t) => t.id === activeThreadId);

  // Recarregar threads ao alternar statusFilter (para suportar 'archived' via backend)
  useEffect(() => {
    listChatThreads({ data: { store_id: store?.id, status: (statusFilter === "waiting" ? "open" : statusFilter) as any } })
      .then((res) => {
        if (res?.threads) {
          setThreads(res.threads);
          if (activeThreadId && !res.threads.some((t: any) => t.id === activeThreadId)) {
            setActiveThreadId(res.threads.length > 0 ? (res.threads[0]?.id || null) : null);
          }
        }
      })
      .catch(() => {});
  }, [statusFilter]);

  // Cálculo da Janela de 24h WhatsApp Meta Cloud API
  const isWhatsAppWindowOpen = useMemo(() => {
    if (!messages || messages.length === 0) return true;
    const customerMsgs = messages.filter((m) => !m.is_staff_reply && m.created_at);
    if (customerMsgs.length === 0) return true;
    const lastCustomerMsg = customerMsgs[customerMsgs.length - 1];
    const diffHours = (Date.now() - new Date(lastCustomerMsg.created_at).getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }, [messages]);

  // Carregamento de Mensagens
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    getChatMessages({ data: { threadId: activeThreadId } })
      .then((res: any) => {
        setMessages(res?.messages || []);
      })
      .catch((e) => {
        console.error("Falha ao carregar mensagens:", e);
        toast.error("Erro ao carregar mensagens da conversa.");
      })
      .finally(() => setLoadingMessages(false));
  }, [activeThreadId]);

  // Auto-scroll
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loadingMessages]);

  // Realtime Estável de Alta Performance (Zero Teardown em Troca de Conversa)
  useEffect(() => {
    const activeTenant = typeof window !== "undefined" ? getClientActiveTenant() : null;
    const effectiveStoreId = store?.id || activeTenant;
    if (!effectiveStoreId) return;
    const rt = getRealtimeChannel(`store-chat-${effectiveStoreId}`);
    if (!rt.channel) return;

    rt.channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload: any) => {
          const newMsg = payload.new as any;
          if (!newMsg) return;

          const currentActive = activeThreadIdRef.current;
          const isCurrentActive = newMsg.thread_id === currentActive;

          if (isCurrentActive) {
            // Se mensagem for criptografada ou externa, revalida via server para decodificação perfeita
            if (newMsg.is_encrypted || (typeof newMsg.message === "string" && newMsg.message.startsWith("waesy-msg:"))) {
              reloadActiveMessages(newMsg.thread_id);
            } else {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }

            if (!newMsg.is_staff_reply) {
              playMessageChime();
            }
          } else if (!newMsg.is_staff_reply) {
            playMessageChime();
          }

          // Atualiza lista de conversas: move para o topo ou sincroniza nova conversa
          const exists = threadsRef.current.some((t) => t.id === newMsg.thread_id);
          if (exists) {
            setThreads((prev) => {
              const target = prev.find((t) => t.id === newMsg.thread_id);
              if (!target) return prev;
              const cleanPreview = (typeof newMsg.message === "string" && !newMsg.message.startsWith("waesy-msg:"))
                ? newMsg.message
                : (target.last_message || "Nova mensagem");
              const updated = {
                ...target,
                last_message: cleanPreview,
                is_last_reply_staff: newMsg.is_staff_reply,
                updated_at: newMsg.created_at || new Date().toISOString(),
              };
              return [updated, ...prev.filter((t) => t.id !== newMsg.thread_id)];
            });
            if (newMsg.is_encrypted || (typeof newMsg.message === "string" && newMsg.message.startsWith("waesy-msg:"))) {
              reloadThreads();
            }
          } else {
            reloadThreads();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages" },
        (payload: any) => {
          const updatedMsg = payload.new as any;
          if (!updatedMsg) return;

          if (updatedMsg.thread_id === activeThreadIdRef.current) {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== updatedMsg.id) return m;
                return {
                  ...m,
                  delivery_status: updatedMsg.delivery_status || m.delivery_status,
                  external_message_id: updatedMsg.external_message_id || m.external_message_id,
                  sent_at: updatedMsg.sent_at || m.sent_at,
                  delivered_at: updatedMsg.delivered_at || m.delivered_at,
                  payload: { ...(m.payload || {}), ...(updatedMsg.payload || {}) },
                };
              })
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_threads" },
        (payload: any) => {
          const newThread = payload.new as any;
          // Ignora threads de IA/Copilot
          if (newThread?.thread_type === "ai_assistant" || newThread?.thread_type === "copilot") {
            return;
          }
          if (newThread?.store_id === effectiveStoreId) {
            reloadThreads();
            playMessageChime();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "intranet_messages" },
        (payload: any) => {
          const newMsg = payload.new as any;
          if (newMsg && newMsg.store_id === effectiveStoreId) {
            setIntranetChannels((prev) =>
              prev.map((c) => {
                if (c.id === newMsg.channel_id) {
                  const exists = c.messages.some((m: any) => m.id === newMsg.id);
                  if (exists) return c;
                  return {
                    ...c,
                    messages: [
                      ...c.messages,
                      {
                        id: newMsg.id,
                        author: newMsg.author_name || "Colega",
                        role: newMsg.author_role || "Equipe",
                        time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        text: newMsg.content,
                      },
                    ],
                  };
                }
                return c;
              })
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "intranet_milestones" },
        (payload: any) => {
          const updated = payload.new as any;
          if (updated && updated.store_id === effectiveStoreId) {
            setIntranetChannels((prev) =>
              prev.map((c) => {
                if (c.id === updated.channel_id) {
                  return {
                    ...c,
                    milestones: c.milestones.map((m: any) =>
                      m.id === updated.id ? { ...m, done: updated.done, label: updated.label, detail: updated.detail } : m
                    ),
                  };
                }
                return c;
              })
            );
          }
        },
      )
      .subscribe();

    return () => {
      rt.unsubscribe();
    };
  }, [store?.id, reloadThreads, reloadActiveMessages]);

  // Listener de Visibilidade & Retomada de Foco (Zero Lag Mobile/Background)
  useEffect(() => {
    const handleRevalidation = () => {
      if (document.visibilityState === "visible") {
        reloadThreads();
        if (activeThreadIdRef.current) {
          reloadActiveMessages(activeThreadIdRef.current);
        }
      }
    };
    window.addEventListener("visibilitychange", handleRevalidation);
    window.addEventListener("focus", handleRevalidation);
    return () => {
      window.removeEventListener("visibilitychange", handleRevalidation);
      window.removeEventListener("focus", handleRevalidation);
    };
  }, [reloadThreads, reloadActiveMessages]);

  // Subscrição Supabase Realtime (Streaming ao Vivo <50ms de Mensagens e Conversas)
  useEffect(() => {
    if (!store?.id) return;
    let supabase: any = null;
    try {
      supabase = getBrowserClient();
    } catch {
      return;
    }
    if (!supabase) return;

    const channel = supabase
      .channel(`chat_realtime_${store.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
        },
        (payload: any) => {
          // Streaming ao vivo de nova mensagem recebida ou enviada
          if (activeThreadIdRef.current && payload.new?.thread_id === activeThreadIdRef.current) {
            reloadActiveMessages(activeThreadIdRef.current);
          }
          reloadThreads();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_threads",
          filter: `store_id=eq.${store.id}`,
        },
        () => {
          reloadThreads();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_channel_instances",
          filter: `store_id=eq.${store.id}`,
        },
        () => {
          // Atualiza o estado da conexão instantaneamente ao parear QR Code ou desconectar
          listWorkspaceWhatsAppInstances({ data: { store_id: store.id } })
            .then((list) => setWhatsappInstances(list))
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [store?.id, reloadThreads, reloadActiveMessages]);

  // Polling Leve de Segurança a Cada 15s (Tolerância a Wi-Fi Instável)
  useEffect(() => {
    if (!store?.id) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        reloadThreads();
        if (activeThreadIdRef.current) {
          reloadActiveMessages(activeThreadIdRef.current);
        }
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [store?.id, reloadThreads, reloadActiveMessages]);

  // Enviar Mensagem
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !activeThreadId || isSending) return;

    try {
      setIsSending(true);
      const payload: Record<string, any> = {};
      let messageType: any = "text";

      if (isWhisperMode) {
        messageType = "system_event";
        payload.is_whisper = true;
      }

      const sent = await sendChatMessage({
        data: {
          threadId: activeThreadId,
          message: text.trim(),
          message_type: messageType,
          payload,
          attachments: [],
          is_internal: isWhisperMode,
        },
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      setText("");
      setIsWhisperMode(false);

      setThreads((prev) => {
        const target = prev.find((t) => t.id === activeThreadId);
        if (!target) return prev;
        const updatedTarget = {
          ...target,
          last_message: isWhisperMode ? `[Nota Interna]: ${text.trim()}` : text.trim(),
          is_last_reply_staff: true,
          updated_at: new Date().toISOString(),
        };
        return [updatedTarget, ...prev.filter((t) => t.id !== activeThreadId)];
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao despachar mensagem.");
    } finally {
      setIsSending(false);
    }
  };

  // Arquivar / Desarquivar conversa (Soft Delete Seguro)
  const handleArchiveThread = async (threadId: string, archive = true) => {
    try {
      setIsArchiving(true);
      await archiveChatThread({ data: { threadId, archived: archive } });
      toast.success(archive ? "Conversa arquivada com sucesso" : "Conversa desarquivada");
      setThreads((prev) =>
        prev
          .map((t) => (t.id === threadId ? { ...t, status: archive ? "archived" : "open" } : t))
          .filter((t) => (statusFilter === "archived" ? t.status === "archived" : t.status !== "archived")),
      );
      if (archive && statusFilter !== "archived") {
        setActiveThreadId(null);
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao arquivar conversa");
    } finally {
      setIsArchiving(false);
    }
  };

  // Trocar Departamento
  const handleDepartmentChange = async (newDept: string) => {
    if (!activeThreadId) return;
    try {
      await assignChatThread({
        data: {
          threadId: activeThreadId,
          department: newDept,
        },
      });
      toast.success(`Transferido para o setor ${departmentLabels[newDept] || newDept}`);
      setThreads((prev) =>
        prev.map((t) => (t.id === activeThreadId ? { ...t, department: newDept } : t)),
      );
    } catch {
      toast.error("Falha ao transferir conversa.");
    }
  };

  // Resolver Ticket
  const handleResolveTicket = async () => {
    if (!selectedTicket?.ticket_id) return;
    try {
      setIsResolvingTicket(true);
      await updateTicketStatus({
        data: {
          ticketId: selectedTicket.ticket_id,
          status: ticketStatus,
          resolution_notes: resolutionNotes.trim() || undefined,
        },
      });
      toast.success(`Ticket #${selectedTicket.ticket_id.slice(0, 8)} atualizado!`);
      setTicketModalOpen(false);
      if (activeThreadId) {
        const refreshed: any = await getChatMessages({ data: { threadId: activeThreadId } });
        setMessages(refreshed?.messages || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Falha ao resolver ticket.");
    } finally {
      setIsResolvingTicket(false);
    }
  };

  // Filtros de busca de threads
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      // Filtro de 4 Abas Estilo WhatsApp Web / Whaticket
      if (statusFilter === "open" && t.status !== "open") return false;
      if (statusFilter === "archived" && t.status !== "archived") return false;
      if (statusFilter === "waiting" && (t.status === "archived" || t.is_last_reply_staff)) return false;
      if (statusFilter === "all" && t.status === "archived") return false;
      const matchDept = deptFilter === "all" || t.department === deptFilter;
      const matchSearch =
        !searchTerm.trim() ||
        (t.customer?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.last_message || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [threads, statusFilter, deptFilter, searchTerm]);

  // Filtros SDR
  const filteredSdrSessions = useMemo(() => {
    return sdrSessions.filter((session) => {
      if (!session) return false;
      const matchIntent = sdrIntentFilter === "all" || session.intent_classification === sdrIntentFilter;
      const matchSearch =
        !sdrSearchTerm.trim() ||
        (session.classified?.title || "").toLowerCase().includes(sdrSearchTerm.toLowerCase()) ||
        (session.summary || "").toLowerCase().includes(sdrSearchTerm.toLowerCase());
      return matchIntent && matchSearch;
    });
  }, [sdrSessions, sdrIntentFilter, sdrSearchTerm]);

  // Ticket SAC vinculado
  const linkedTicket = useMemo(() => {
    const rmaMsg = messages.find((m) => m.message_type === "rma_ticket" && m.payload?.ticket_id);
    return rmaMsg ? rmaMsg.payload : null;
  }, [messages]);

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden bg-background">
      {/* CABEÇALHO DO HUB DE ATENDIMENTO */}
      <header className={cn(
        "shrink-0 border-b border-border/80 bg-card px-4 py-3 flex-col md:flex-row md:items-center justify-between gap-3",
        activeHubTab === "live" && activeThreadId ? "hidden md:flex" : "flex"
      )}>
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground truncate">
              Atendimento
            </h1>
            <span className="hidden sm:inline-block text-xs text-muted-foreground font-medium">
              • {store?.name || "Workspace"}
            </span>
          </div>

          {/* Status de Presença do Atendente */}
          <div className="flex items-center gap-1 shrink-0 bg-muted/40 p-1 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setAgentPresence("online")}
              className={cn(
                "px-3 h-11 min-h-11 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                agentPresence === "online"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Online</span>
            </button>
            <button
              type="button"
              onClick={() => setAgentPresence("busy")}
              className={cn(
                "px-3 h-11 min-h-11 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                agentPresence === "busy"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="size-2 rounded-full bg-warning" />
              <span>Ocupado</span>
            </button>
            <button
              type="button"
              onClick={() => setAgentPresence("away")}
              className={cn(
                "px-3 h-11 min-h-11 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                agentPresence === "away"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="size-2 rounded-full bg-muted-foreground/60" />
              <span>Pausa</span>
            </button>
          </div>
        </div>

        {/* REGUA DE ABAS CANÔNICAS */}
        <div className="flex items-center gap-2 overflow-x-auto tab-list no-scrollbar pb-1 md:pb-0">
          {/* Aba 1: Conversas (WhatsApp Web Nativo) */}
          <button
            type="button"
            onClick={() => setActiveHubTab("live")}
            className={cn(
              "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              activeHubTab === "live"
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/50",
            )}
          >
            <MessageSquare className="size-4" />
            <span>Conversas</span>
            {(metrics?.open || 0) > 0 && (
              <Badge variant="secondary" className="text-xs h-4 px-2 font-mono">
                {metrics?.open}
              </Badge>
            )}
          </button>

          {/* Aba 2: Intranet Corporativa (Canais estilo Slack + Linha do Tempo + Planilhas) */}
          <button
            type="button"
            onClick={() => setActiveHubTab("intranet")}
            className={cn(
              "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              activeHubTab === "intranet"
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/50",
            )}
          >
            <Hash className="size-4" />
            <span>Intranet</span>
            <Badge variant="secondary" className="text-xs h-4 px-2 font-mono">
              {intranetChannels.length}
            </Badge>
          </button>

          {/* Aba 3: Leads SDR */}
          <button
            type="button"
            onClick={() => setActiveHubTab("sdr")}
            className={cn(
              "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              activeHubTab === "sdr"
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/50",
            )}
          >
            <Bot className="size-4" />
            <span>Oportunidades</span>
            {sdrMetrics?.total > 0 && (
              <Badge variant="secondary" className="text-xs h-4 px-2 font-mono">
                {sdrMetrics.total}
              </Badge>
            )}
          </button>

          {/* Aba 4: Desempenho & Filas */}
          <button
            type="button"
            onClick={() => setActiveHubTab("metrics")}
            className={cn(
              "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              activeHubTab === "metrics"
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/50",
            )}
          >
            <Activity className="size-4" />
            <span>Desempenho & Filas</span>
          </button>

          {/* Aba 5: Conexão WhatsApp */}
          <button
            type="button"
            onClick={() => setActiveHubTab("whatsapp")}
            className={cn(
              "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              activeHubTab === "whatsapp"
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/50",
            )}
          >
            <Smartphone className="size-4" />
            <span>WhatsApp</span>
          </button>

          {/* Aba 6: Horários & Turnos */}
          <button
            type="button"
            onClick={() => setActiveHubTab("hours")}
            className={cn(
              "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              activeHubTab === "hours"
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/50",
            )}
          >
            <Clock className="size-4" />
            <span>Horários</span>
          </button>
          <button type="button" onClick={() => setTeamSectorsDrawerOpen(true)} className="px-4 h-11 min-h-11 rounded-lg text-xs font-bold flex items-center gap-2 bg-foreground text-background cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary">
            <Sliders className="size-4" />
            <span>Setores</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* ABA 1: CONVERSAS (WHATSAPP WEB NATIVO LIMPO) */}
      {/* ======================================================== */}
      {activeHubTab === "live" && (
        <div className="flex-1 flex overflow-hidden">
          {/* COLUNA 1: Lista de Conversas (Sidebar estilo WhatsApp Web) */}
          <div
            className={cn(
              "w-full md:w-80 lg:w-96 border-r border-border/80 bg-background flex flex-col shrink-0",
              activeThreadId ? "hidden md:flex" : "flex",
            )}
          >
            {/* Busca & Chips de Status */}
            <div className="p-3 border-b border-border/80 space-y-2 bg-card">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Buscar conversa ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-11 min-h-11 rounded-lg text-xs bg-muted/40"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleSyncWhatsApp}
                  disabled={isSyncingWhatsApp}
                  title="Sincronizar conversas do WhatsApp"
                  className="size-11 min-w-11 min-h-11 rounded-lg text-muted-foreground hover:text-foreground shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <RefreshCw className={cn("size-4", isSyncingWhatsApp && "animate-spin text-primary")} />
                </Button>
              </div>

              
              {/* Chips Rápidos de 4 Abas: Todas / Abertas / Aguardando / Arquivadas (WhatsApp Web / Whaticket) */}
              <div className="flex items-center gap-2 overflow-x-auto tab-list no-scrollbar py-1">
                {[
                  { id: "all", label: "Todas" },
                  { id: "open", label: "Abertas" },
                  { id: "waiting", label: "Aguardando" },
                  { id: "archived", label: "Arquivadas" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setStatusFilter(chip.id as any)}
                    className={cn(
                      "px-3 h-11 min-h-11 rounded-md text-xs font-semibold transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                      statusFilter === chip.id
                        ? "bg-foreground text-background font-bold shadow-2xs"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border/50"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}

                <div className="ml-auto">
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="h-11 min-h-11 px-3 text-xs rounded-lg border-border/60 bg-muted/40 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary">
                      <SelectValue placeholder="Setor" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="all">Todos Setores</SelectItem>
                      {Object.entries(departmentLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Lista de Threads de Conversas */}
            <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-border/40">
              {filteredThreads.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs space-y-3">
                  <MessageSquare className="size-8 mx-auto opacity-40" />
                  <p className="font-semibold text-foreground">Nenhuma conversa encontrada</p>
                  <p className="text-xs">
                    {statusFilter === "archived"
                      ? "Não há conversas arquivadas no momento."
                      : "Mensagens recebidas de clientes ou WhatsApp aparecerão aqui."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSyncWhatsApp}
                    disabled={isSyncingWhatsApp}
                    className="h-11 min-h-11 text-xs gap-2 mt-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <RefreshCw className={cn("size-3.5", isSyncingWhatsApp && "animate-spin text-primary")} />
                    <span>{isSyncingWhatsApp ? "Sincronizando..." : "Sincronizar conversas do WhatsApp"}</span>
                  </Button>
                </div>
              ) : (
                filteredThreads.map((t) => {
                  const isActive = t.id === activeThreadId;
                  const isWhatsApp = t.channel === "whatsapp" || t.context_type === "whatsapp";
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveThreadId(t.id)}
                      className={cn(
                        "w-full p-4 text-left flex items-start gap-3 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                        isActive
                          ? "bg-muted"
                          : "hover:bg-muted/40",
                      )}
                    >
                      {/* Avatar com foto real ou iniciais */}
                      {t.customer?.avatar_url ? (
                        <img
                          src={t.customer.avatar_url}
                          alt={t.customer?.full_name || "Cliente"}
                          className="size-10 rounded-full object-cover shrink-0 border border-border/60"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                          {(t.customer?.full_name || "C")[0].toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-foreground truncate">
                            {t.customer?.full_name || "Cliente"}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0 font-mono">
                            {formatRelativeTime(t.updated_at)}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-1 leading-snug">
                          {t.is_last_reply_staff ? "Você: " : ""}
                          {t.last_message || "Sem mensagens"}
                        </p>

                        <div className="flex items-center gap-2 pt-1">
                          {/* Badge de Canal: WhatsApp verde ou Chat Web */}
                          {isWhatsApp ? (
                            <Badge
                              variant="outline"
                              className="text-xs px-2 py-0 h-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold"
                            >
                              <Smartphone className="size-3 text-emerald-600" />
                              <span>WhatsApp</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs px-2 py-0 h-4 gap-1">
                              <MessageCircle className="size-3 text-primary" />
                              <span>Web</span>
                            </Badge>
                          )}

                          <Badge variant="secondary" className="text-xs px-2 py-0 h-4 uppercase">
                            {departmentLabels[t.department] || t.department}
                          </Badge>

                          {t.status === "archived" && (
                            <Badge
                              variant="outline"
                              className="text-xs px-1 py-0 h-4 bg-muted text-muted-foreground border-border/60"
                            >
                              Arquivada
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUNA 2: Mensagens & Composer (Área Central de Chat) */}
          {activeThread ? (
            <div
              className={cn(
                "flex-1 flex flex-col bg-muted/10 w-full min-w-0",
                !activeThreadId ? "hidden md:flex" : "flex",
              )}
            >
              {/* Header da Conversa Ativa */}
              <div className="p-3 sm:p-4 bg-card border-b border-border/80 flex items-center justify-between gap-3 shrink-0">
                <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setActiveThreadId(null)}
                    className="md:hidden size-11 -ml-2 text-muted-foreground hover:text-foreground cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-ring"
                    title="Voltar para a lista"
                  >
                    <ArrowLeft className="size-5" />
                  </Button>

                  {/* Avatar do cliente */}
                  {activeThread.customer?.avatar_url ? (
                    <img
                      src={activeThread.customer.avatar_url}
                      alt={activeThread.customer?.full_name || "Cliente"}
                      className="size-10 rounded-full object-cover shrink-0 border border-border/60"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                      {(activeThread.customer?.full_name || "C")[0].toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-foreground truncate min-w-0">
                        {activeThread.customer?.full_name || "Cliente"}
                      </h3>
                      {activeThread.channel === "whatsapp" && (
                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0 border border-emerald-500/20">
                          <span
                            className={cn("size-2 rounded-full shrink-0", isWhatsAppWindowOpen ? "bg-emerald-500" : "bg-muted-foreground")}
                            title={isWhatsAppWindowOpen ? "Janela 24h WhatsApp Ativa" : "Janela 24h Expirada"}
                          />
                          <span>WhatsApp</span>
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate font-mono select-all">
                      {activeThread.customer?.phone || activeThread.customer?.email || "Atendimento Direto"}
                    </p>
                    {/* Tags Semânticas Coloridas (Whaticket / CRM Parity) */}
                    <div className="pt-1">
                      <ThreadTagsPicker
                        threadId={activeThread?.id || ""}
                        tags={activeThread.tags || []}
                        onTagsChange={(newTags) => {
                          setThreads((prev) =>
                            prev.map((t) => (t.id === activeThread?.id ? { ...t, tags: newTags } : t))
                          );
                        }}
                      />
                    </div>

                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Ação: Encerrar / Reabrir Atendimento */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isArchiving}
                    onClick={() =>
                      activeThread?.id && handleArchiveThread(activeThread.id, activeThread.status !== "archived")
                    }
                    className="h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary shrink-0"
                    title={activeThread.status === "archived" ? "Reabrir conversa" : "Encerrar atendimento"}
                  >
                    {activeThread.status === "archived" ? (
                      <>
                        <ArchiveRestore className="size-4 shrink-0" />
                        <span className="hidden xl:inline">Reabrir</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span className="hidden xl:inline">Encerrar</span>
                      </>
                    )}
                  </Button>

                  {/* Toggle Ficha do Cliente (Perfil 360) */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.innerWidth < 1024) {
                        setMobileCustomer360Open((prev) => !prev);
                      } else {
                        setShowCustomer360((prev) => !prev);
                      }
                    }}
                    className={cn(
                      "h-11 min-h-11 text-xs font-semibold rounded-lg px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary shrink-0",
                      showCustomer360 ? "bg-muted font-bold" : "",
                    )}
                    title="Exibir dados e ficha do cliente"
                    aria-label="Ficha do Cliente"
                  >
                    <UserCheck className="size-4 mr-0 xl:mr-1 shrink-0" />
                    <span className="hidden xl:inline">Ficha</span>
                  </Button>

                  {/* Menu Dropdown de Ações Operacionais */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11 min-w-11 min-h-11 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-primary shrink-0"
                        title="Mais Ações de Atendimento"
                        aria-label="Mais Ações de Atendimento"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-border shadow-overlay">
                      <DropdownMenuItem
                        onClick={() => setTransferModalOpen(true)}
                        className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2"
                      >
                        <ArrowRightLeft className="size-4 text-primary shrink-0" />
                        <span>Transferir Atendimento</span>
                      </DropdownMenuItem>

                      {activeThread.channel === "whatsapp" && (
                        <DropdownMenuItem
                          onClick={() => setScheduleModalOpen(true)}
                          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2"
                        >
                          <CalendarClock className="size-4 text-warning-strong shrink-0" />
                          <span>Agendar Mensagem</span>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        onClick={() => setShowLiveTimeline((prev) => !prev)}
                        className="2xl:hidden h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2"
                      >
                        <GitBranch className="size-4 text-primary shrink-0" />
                        <span>{showLiveTimeline ? "Ocultar Linha do Tempo" : "Linha do Tempo"}</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="my-1 border-border/60" />

                      {activeThread.customer?.id && (
                        <DropdownMenuItem asChild className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2">
                          <Link to="/workspace/clientes/$id" params={{ id: activeThread.customer.id }}>
                            <Building2 className="size-4 text-primary shrink-0" />
                            <span>Abrir Dossiê no CRM</span>
                          </Link>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem asChild className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2">
                        <Link to="/workspace/suporte">
                          <HelpCircle className="size-4 text-sky-500 shrink-0" />
                          <span>Central de Chamados SAC</span>
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="my-1 border-border/60" />

                      <DropdownMenuItem
                        onClick={() => setClearMessagesModalOpen(true)}
                        className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2 text-warning-strong hover:bg-warning/10"
                      >
                        <Eraser className="size-4 shrink-0" />
                        <span>Limpar mensagens (no sistema)</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => setDeleteThreadModalOpen(true)}
                        className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4 shrink-0" />
                        <span>Excluir conversa (no sistema)</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Painel Recolhível: Linha do Tempo Cronológica (Pedidos, Chamados e Planilhas) */}
              {showLiveTimeline && (
                <div className="bg-card border-b border-border/80 p-4 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                      <GitBranch className="size-4 text-primary" />
                      <span>Linha do Tempo do Atendimento</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLiveModalOverride("form")}
                        className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer"
                      >
                        <ClipboardList className="size-3.5 text-primary" />
                        <span>Formulário</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLiveModalOverride("event")}
                        className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer"
                      >
                        <Calendar className="size-3.5 text-emerald-600" />
                        <span>Evento</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLiveModalOverride("spreadsheet")}
                        className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer"
                      >
                        <FileSpreadsheet className="size-3.5 text-sky-600" />
                        <span>Planilha</span>
                      </Button>
                    </div>
                  </div>

                  <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary/30">
                    <div className="relative flex items-start justify-between gap-2 text-xs">
                      <span className=" -left-6 top-0.5 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Check className="size-3" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">
                          Início do atendimento omnichannel ({activeThread.channel === "whatsapp" ? "WhatsApp Oficial" : "Chat Web"})
                        </p>
                        <p className="text-muted-foreground">
                          Setor: {departmentLabels[activeThread.department] || activeThread.department}
                        </p>
                      </div>
                      <span className="font-mono text-muted-foreground shrink-0">
                        {formatRelativeTime(activeThread.created_at)}
                      </span>
                    </div>

                    <div className="relative flex items-start justify-between gap-2 text-xs">
                      <span className=" -left-6 top-0.5 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Check className="size-3" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">
                          {messages.length} mensagens sincronizadas e auditadas na conversa
                        </p>
                        <p className="text-muted-foreground">
                          Janela 24h: {isWhatsAppWindowOpen ? "Ativa para resposta livre" : "Exige template"}
                        </p>
                      </div>
                      <span className="font-mono text-muted-foreground shrink-0">
                        {formatRelativeTime(activeThread.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline de Mensagens */}
              <div
                ref={chatContainerRef}
                className="flex-1 space-y-4 overflow-y-auto no-scrollbar p-4 bg-muted/10"
              >
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="size-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs">
                    Nenhuma mensagem nesta conversa ainda.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.is_staff_reply;

                    // Card de Pedido
                    if (msg.message_type === "order_card" && msg.payload?.order) {
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isStaff ? "justify-end" : "justify-start"} w-full`}
                        >
                          <OrderMessageCard order={msg.payload.order} isStaff={true} />
                        </div>
                      );
                    }

                    // Card de Nota Interna (Whisper)
                    if (
                      msg.payload?.is_whisper ||
                      (msg.message_type === "system_event" && msg.payload?.is_whisper)
                    ) {
                      return (
                        <div key={msg.id} className="w-full flex justify-center my-2">
                          <div className="max-w-lg w-full p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning-strong  text-xs space-y-1 shadow-2xs">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="flex items-center gap-2 text-warning-strong ">
                                <Lock className="size-4 shrink-0" />
                                <span>Nota Interna da Equipe</span>
                              </span>
                              <span className="font-mono text-xs opacity-75">{formatDate(msg.created_at)}</span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed font-medium">
                              {msg.message || msg.payload?.text}
                            </p>
                            <span className="text-xs opacity-70 block text-right italic">
                              Invisível para o cliente no WhatsApp
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Card de Ticket SAC / RMA
                    if (msg.message_type === "rma_ticket" && msg.payload?.ticket_id) {
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isStaff ? "justify-end" : "justify-start"} w-full`}
                        >
                          <RmaMessageCard
                            payload={msg.payload}
                            isStaff={true}
                            onReviewTicket={() => {
                              setSelectedTicket(msg.payload);
                              setTicketModalOpen(true);
                            }}
                          />
                        </div>
                      );
                    }

                    // Card Estruturado com Widgets
                    if (
                      msg.message_type === "structured_blocks" ||
                      (msg.payload?.blocks && msg.payload.blocks.length > 0)
                    ) {
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isStaff ? "items-end" : "items-start"} w-full`}
                        >
                          <div
                            className={cn(
                              "max-w-prose sm:max-w-lg rounded-lg p-4 text-xs shadow-xs",
                              isStaff
                                ? "bg-card border border-border/80 text-foreground rounded-tr-xs"
                                : "bg-card border border-border/80 text-foreground rounded-tl-xs",
                            )}
                          >
                            <StructuredMessageView
                              payload={msg.payload || { text: msg.message }}
                              isStaff={isStaff}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground mt-1 px-1 flex items-center gap-1">
                            {isStaff ? "Equipe / Você" : activeThread.customer?.full_name || "Cliente"} •{" "}
                            {formatDate(msg.created_at)}
                            {isStaff && <MessageDeliveryStatusIcon status={msg.delivery_status} />}
                          </span>
                        </div>
                      );
                    }

                    // Balão Normal estilo WhatsApp Web
                    const isRevoked = Boolean(msg.is_revoked_by_sender || msg.payload?.is_revoked_by_sender);
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={cn(
                            "max-w-md sm:max-w-md rounded-lg p-3 text-xs leading-relaxed shadow-xs",
                            isStaff
                              ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                              : "bg-card border border-border/80 text-foreground rounded-tl-xs",
                          )}
                        >
                          {isRevoked && (
                            <div className="flex items-center gap-1 text-xs font-semibold mb-1 pb-1 border-b border-border/40 opacity-80">
                              <Ban className="size-3.5 shrink-0" />
                              <span>Apagada no WhatsApp pelo remetente</span>
                            </div>
                          )}
                          <p className={cn("whitespace-pre-wrap break-words", isRevoked && "italic")}>
                            {msg.message}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 px-1 flex items-center gap-1 font-mono">
                          {isStaff ? "Você" : activeThread.customer?.full_name || "Cliente"} •{" "}
                          {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {isStaff && <MessageDeliveryStatusIcon status={msg.delivery_status} />}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input de Envio do Atendente & Macros Rápidas */}
              <div className="bg-card border-t border-border/80 p-3 space-y-2">
                
                {/* Autocomplete de Respostas Rápidas / Macros com gatilho "/" */}
                {text.startsWith("/") && (
                  <QuickRepliesMenu
                    searchTerm={text}
                    quickReplies={quickReplies}
                    customerName={activeThread.customer?.full_name}
                    customerPhone={activeThread.customer?.phone}
                    storeName={store?.name}
                    onSelectReply={(expanded) => {
                      setText(expanded);
                    }}
                    onClose={() => {}}
                  />
                )}

                {/* Seletor de Modo: Responder ao Cliente vs Nota Interna da Equipe */}
                <div className="flex items-center justify-between gap-2 pb-1">
                  <div className="inline-flex items-center rounded-lg bg-muted/60 p-1 border border-border/60">
                    <button
                      type="button"
                      onClick={() => setIsWhisperMode(false)}
                      className={cn(
                        "h-11 min-h-11 px-3 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary",
                        !isWhisperMode
                          ? "bg-background text-foreground font-bold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <MessageSquare className="size-3.5 text-emerald-600" />
                      <span>Responder (Cliente)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsWhisperMode(true)}
                      className={cn(
                        "h-11 min-h-11 px-3 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary",
                        isWhisperMode
                          ? "bg-warning/20 text-warning-strong font-bold"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Lock className="size-3.5 text-warning-strong" />
                      <span>Nota Interna (Equipe)</span>
                    </button>
                  </div>
                </div>

                {/* Banner Modo Nota Interna (Whisper) */}
                {isWhisperMode && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-warning/15 border border-warning/40 text-warning-strong text-xs font-medium animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <Lock className="size-3.5 shrink-0 text-warning-strong" />
                      <span>Nota interna privada: visível apenas para a equipe (não enviada ao WhatsApp).</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsWhisperMode(false)}
                      className="h-11 min-h-11 px-3 text-xs text-warning-strong hover:bg-warning/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}

                {/* Trilho de Respostas Rápidas / Macros Compacto */}
                <div
                  role="tablist"
                  aria-label="Atalhos Rápidos"
                  className="flex items-center gap-2 overflow-x-auto tab-list no-scrollbar py-1"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickAnswersModalOpen(true)}
                    className="h-11 min-h-11 px-3 rounded-md text-xs font-semibold gap-2 shrink-0 border-border/70 text-foreground hover:bg-muted cursor-pointer"
                    title="Gerenciar respostas rápidas e atalhos comerciais"
                  >
                    <Zap className="size-3 text-warning-strong" />
                    <span>Atalhos</span>
                  </Button>

                  {(storeMacros.length > 0
                    ? storeMacros.map((m: any) => ({ cmd: m.shortcut, text: m.message, label: m.title }))
                    : semantics.nicheId === "tourism"
                      ? [
                          { cmd: "ola", text: "Olá! Seja muito bem-vindo ao atendimento da nossa agência. Como podemos te ajudar a planejar sua próxima viagem?", label: "Saudação" },
                          { cmd: "roteiro", text: "Temos roteiros completos e pacotes disponíveis com saídas programadas. Gostaria de receber a programação detalhada?", label: "Roteiros" },
                          { cmd: "cotacao", text: "Para preparar sua cotação personalizada, por favor nos informe a data desejada, quantidade de passageiros e acomodação.", label: "Cotação" },
                          { cmd: "embarque", text: "As informações de ponto de embarque, horários e documentação necessária constam no seu comprovante de reserva.", label: "Embarque" },
                          { cmd: "pix", text: "Nossa chave PIX oficial é gerada e confirmada diretamente na sua reserva. O comprovante é validado automaticamente!", label: "Chave PIX" },
                          { cmd: "horarios", text: "Nosso horário de atendimento é de Segunda a Sexta das 08h às 18h e Sábados das 08h às 12h.", label: "Horários" },
                        ]
                      : semantics.nicheId === "gastronomy"
                        ? [
                            { cmd: "ola", text: "Olá! Seja muito bem-vindo ao nosso atendimento. Como podemos te atender hoje?", label: "Saudação" },
                            { cmd: "cardapio", text: "Acesse nosso cardápio digital completo pelo link acima para conferir os pratos e montar seu pedido!", label: "Cardápio" },
                            { cmd: "pedido", text: "Seu pedido foi recebido e já está em preparação na nossa cozinha!", label: "Status Pedido" },
                            { cmd: "pix", text: "Nossa chave PIX oficial é gerada diretamente no seu pedido para confirmação automática.", label: "Chave PIX" },
                            { cmd: "horarios", text: "Nosso horário de funcionamento é de Terça a Domingo das 18h às 23h30.", label: "Horários" },
                          ]
                        : semantics.nicheId === "retail"
                          ? [
                              { cmd: "ola", text: "Olá! Seja muito bem-vindo ao atendimento da nossa loja. Em que posso te ajudar hoje?", label: "Saudação" },
                              { cmd: "catalogo", text: "Acesse nosso catálogo completo com lançamentos e disponibilidade em tempo real no link acima!", label: "Catálogo" },
                              { cmd: "rastreio", text: "Seu pedido está em separação/transporte e você pode acompanhar pelo link de rastreio acima.", label: "Rastreio" },
                              { cmd: "pix", text: "Nossa chave PIX oficial é gerada e confirmada diretamente no seu pedido.", label: "Chave PIX" },
                              { cmd: "horarios", text: "Nosso horário de atendimento é de Segunda a Sexta das 08h às 18h e Sábados das 08h às 12h.", label: "Horários" },
                            ]
                          : [
                              { cmd: "ola", text: "Olá! Seja muito bem-vindo ao nosso atendimento. Como podemos te ajudar?", label: "Saudação" },
                              { cmd: "servicos", text: "Conheça nossos serviços e procedimentos disponíveis com atendimento personalizado.", label: "Serviços" },
                              { cmd: "agendamento", text: "Para agendar seu horário, por favor informe a data de preferência e o procedimento desejado.", label: "Agendamento" },
                              { cmd: "pix", text: "Nossa chave PIX oficial é gerada e confirmada diretamente no seu pedido/comanda.", label: "Chave PIX" },
                              { cmd: "horarios", text: "Nosso horário de atendimento é de Segunda a Sexta das 08h às 18h e Sábados das 08h às 12h.", label: "Horários" },
                            ]
                  ).map((macro: any) => (
                    <button
                      key={macro.cmd}
                      type="button"
                      onClick={() => setText(interpolateTemplateVariables(macro.text, { customerName: activeThread.customer?.full_name, customerPhone: activeThread.customer?.phone, storeName: store?.name }))}
                      className="h-11 min-h-11 px-3 rounded-md text-xs font-mono font-medium bg-muted/50 hover:bg-muted border border-border/60 text-muted-foreground hover:text-foreground shrink-0 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      /{macro.cmd} <span className="text-xs opacity-75">({macro.label})</span>
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSend} className="space-y-2">
                  <div className="flex items-end gap-2">
                    {/* Botão + Multifuncional (Formulários, Eventos, Planilhas, Stickers) */}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setLiveComposerTrayOpen(true)}
                      className="size-11 rounded-lg shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      title="Abrir ferramentas rápidas: Formulário, Evento, Planilha, Proposta"
                      aria-label="Abrir ferramentas rápidas"
                    >
                      <Plus className="size-4" />
                    </Button>

                    <div className="flex-1 relative">
                      <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder={
                          isWhisperMode
                            ? "Escreva uma nota interna (visível apenas para sua equipe)..."
                            : "Digite sua mensagem ou use / para atalhos rápidos (Enter para enviar)..."
                        }
                        className={cn(
                          "min-h-11 max-h-32 text-xs rounded-lg resize-none p-3",
                          isWhisperMode
                            ? "border-warning/50 bg-warning/5 placeholder:text-warning-strong/60"
                            : "bg-muted/30",
                        )}
                        rows={1}
                      />
                    </div>

                    {/* Botão Enviar Responsivo */}
                    <Button
                      type="submit"
                      disabled={isSending || !text.trim()}
                      className="size-11 sm:w-auto sm:px-4 rounded-lg font-bold text-xs gap-2 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-center"
                      title="Enviar mensagem"
                      aria-label="Enviar mensagem"
                    >
                      {isSending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <span className="hidden sm:inline">Enviar</span>
                          <Send className="size-4 shrink-0" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center bg-muted/5 flex-col gap-3 text-center p-8">
              <div className="size-16 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                <MessageSquare className="size-8" />
              </div>
              <h3 className="font-bold text-foreground text-sm">Nenhuma conversa selecionada</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Selecione uma conversa na barra lateral para responder mensagens ou iniciar um atendimento.
              </p>
            </div>
          )}

          {/* COLUNA 3: Customer 360 (Lateral Direita Recolhível) */}
          {activeThread && showCustomer360 && (
            <div className="hidden lg:block w-80 xl:w-96 border-l border-border/80 bg-background overflow-y-auto no-scrollbar shrink-0 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-4">
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Perfil 360º do Cliente
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomer360(false)}
                  className="h-11 min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Fechar
                </Button>
              </div>
              {/* Controles estilo TrackChat / WhatsOmni: AI Assistant Control, Team Router & Assignee */}
              <div className="space-y-3 mb-4 pb-4 border-b border-border/60">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Bot className="size-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        IA Automática
                      </span>
                    </div>
                    <Switch
                      checked={activeThread?.id ? aiAutoReplyPerThread[activeThread.id] ?? true : true}
                      onCheckedChange={(checked) => {
                        setAiAutoReplyPerThread((prev) => ({
                          ...prev,
                          ...(activeThread?.id ? { [activeThread.id]: checked } : {}),
                        }));
                        toast.success(
                          checked
                            ? "IA Copilot Auto-Reply ativado para este contato."
                            : "IA Copilot pausado. Atendimento assumido manualmente.",
                        );
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Responder automaticamente dúvidas, catálogo e cotações para este cliente.
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Setor / Fila
                  </Label>
                  <select
                    value={activeThread?.department || "geral"}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full h-11 rounded-md border border-border/70 bg-background px-3 text-xs font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {Object.entries(departmentLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Atendente Responsável
                  </Label>
                  <select
                    value={activeThread?.id ? assignedAgentPerThread[activeThread.id] || "" : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssignedAgentPerThread((prev) => ({
                        ...prev,
                        ...(activeThread?.id ? { [activeThread.id]: val } : {}),
                      }));
                      if (activeThread?.id) assignChatThread({ data: { threadId: activeThread.id, assigned_to_profile_id: val || null } }).catch(() => {});
                      toast.success("Atendente atribuído à conversa!");
                    }}
                    className="w-full h-11 rounded-md border border-border/70 bg-background px-3 text-xs font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="">Distribuição Automática</option>
                    {(teamMembers || []).map((m: any) => (
                      <option key={m.id || m.user_id} value={String(m.id || m.user_id)}>
                        {m.full_name || m.name || m.email || "Atendente"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Customer360Sidebar
                customerId={activeThread?.customer?.id}
                storeId={store?.id || ""}
                threadId={activeThread?.id}
                guestName={activeThread?.customer?.full_name}
                guestPhone={activeThread?.customer?.phone}
                niche={semantics.nicheId}
                storeName={store?.name}
                onQuickSendMessage={(msgText) => setText(msgText)}
                onOpenTransfer={() => setTransferModalOpen(true)}
                onOpenSchedule={() => setScheduleModalOpen(true)}
              />
            </div>
          )}

          {/* Drawer Sheet Mobile/Tablet do Perfil 360 */}
          <Sheet open={Boolean(activeThread && mobileCustomer360Open)} onOpenChange={setMobileCustomer360Open}>
            <SheetContent side="right" className="lg:hidden w-full sm:max-w-md p-0 overflow-y-auto">
              <SheetHeader className="p-4 border-b border-border/60">
                <SheetTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  Perfil 360º do Cliente
                </SheetTitle>
              </SheetHeader>
              {activeThread?.id && (
              <div className="p-4">
                {/* Controles estilo TrackChat / WhatsOmni: AI Assistant Control, Team Router & Assignee */}
              <div className="space-y-3 mb-4 pb-4 border-b border-border/60">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Bot className="size-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        IA Automática
                      </span>
                    </div>
                    <Switch
                      checked={activeThread?.id ? aiAutoReplyPerThread[activeThread.id] ?? true : true}
                      onCheckedChange={(checked) => {
                        setAiAutoReplyPerThread((prev) => ({
                          ...prev,
                          ...(activeThread?.id ? { [activeThread.id]: checked } : {}),
                        }));
                        toast.success(
                          checked
                            ? "IA Copilot Auto-Reply ativado para este contato."
                            : "IA Copilot pausado. Atendimento assumido manualmente.",
                        );
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Responder automaticamente dúvidas, catálogo e cotações para este cliente.
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Setor / Fila
                  </Label>
                  <select
                    value={activeThread?.department || "geral"}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full h-11 rounded-md border border-border/70 bg-background px-3 text-xs font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {Object.entries(departmentLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Atendente Responsável
                  </Label>
                  <select
                    value={activeThread?.id ? assignedAgentPerThread[activeThread.id] || "" : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssignedAgentPerThread((prev) => ({
                        ...prev,
                        ...(activeThread?.id ? { [activeThread.id]: val } : {}),
                      }));
                      if (activeThread?.id) assignChatThread({ data: { threadId: activeThread.id, assigned_to_profile_id: val || null } }).catch(() => {});
                      toast.success("Atendente atribuído à conversa!");
                    }}
                    className="w-full h-11 rounded-md border border-border/70 bg-background px-3 text-xs font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="">Distribuição Automática</option>
                    {(teamMembers || []).map((m: any) => (
                      <option key={m.id || m.user_id} value={String(m.id || m.user_id)}>
                        {m.full_name || m.name || m.email || "Atendente"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Customer360Sidebar
                  customerId={activeThread?.customer?.id}
                  storeId={store?.id || ""}
                  threadId={activeThread?.id}
                  guestName={activeThread?.customer?.full_name}
                  guestPhone={activeThread?.customer?.phone}
                  niche={semantics.nicheId}
                  storeName={store?.name}
                  onQuickSendMessage={(msgText) => { setText(msgText); setMobileCustomer360Open(false); }}
                  onOpenTransfer={() => { setMobileCustomer360Open(false); setTransferModalOpen(true); }}
                  onOpenSchedule={() => { setMobileCustomer360Open(false); setScheduleModalOpen(true); }}
                />
              </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: INTRANET CORPORATIVA (SLACK CHANNELS + TIMELINE + PLANILHAS) */}
      {/* ======================================================== */}
      {activeHubTab === "intranet" && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-background">
          {/* COLUNA ESQUERDA: Sidebar Segmentada por Departamento (Estilo Slack / Corporativo) */}
          <aside className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-border/80 bg-card flex flex-col shrink-0">
            <div className="p-3 border-b border-border/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Hash className="size-4 text-primary" />
                  <span>Canais</span>
                </h2>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setNewChannelModalOpen(true)}
                  className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Plus className="size-3.5" />
                  <span>Criar Canal</span>
                </Button>
              </div>

              <div className="relative">
                <Search className="size-4 absolute left-3 top-3.5 text-muted-foreground" />
                <Input
                  value={intranetSearch}
                  onChange={(e) => setIntranetSearch(e.target.value)}
                  placeholder="Filtrar canais, criador ou departamento..."
                  className="pl-9 h-11 text-xs rounded-lg bg-muted/40"
                />
              </div>

              {/* Filtros de Escopo (Todos | Público | Privado) e Criador */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {[
                    { id: "all", label: "Todos" },
                    { id: "public", label: "Público" },
                    { id: "private", label: "Privado" },
                  ].map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setIntranetScopeFilter(sc.id as any)}
                      className={cn(
                        "h-11 min-h-11 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        intranetScopeFilter === sc.id
                          ? "bg-foreground text-background font-bold"
                          : "bg-muted/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>

                <select
                  value={intranetCreatorFilter}
                  onChange={(e) => setIntranetCreatorFilter(e.target.value)}
                  aria-label="Filtrar por criador"
                  className="h-11 px-3 rounded-md bg-muted/50 border border-border/60 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="all">Criador: Todos</option>
                  {Array.from(new Set(intranetChannels.map((c) => c.creator).filter(Boolean))).map((creator) => (
                    <option key={creator} value={creator}>
                      {creator}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grupos Colapsáveis por Departamento ou Estado Vazio */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
              {intranetChannels.length === 0 ? (
                <div className="py-8 px-4 text-center text-xs text-muted-foreground space-y-3">
                  <Hash className="size-8 text-muted-foreground/40 mx-auto" />
                  <p className="font-semibold text-foreground">Nenhum canal cadastrado</p>
                  <p className="text-2xs text-muted-foreground">
                    Crie canais temáticos por departamento para organizar a comunicação interna da equipe.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setNewChannelModalOpen(true)}
                    className="h-11 min-h-11 w-full gap-2 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Plus className="size-3.5" />
                    <span>Criar Primeiro Canal</span>
                  </Button>
                </div>
              ) : (
                (
                  [
                    "Executivo",
                    "Comercial",
                    "Marketing",
                    "Operações",
                    "Financeiro",
                    "Suporte",
                  ] as const
                ).map((dept) => {
                  const deptChannels = intranetChannels.filter((c) => {
                    if (c.department !== dept) return false;
                    if (intranetScopeFilter !== "all" && c.scope !== intranetScopeFilter) return false;
                    if (intranetCreatorFilter !== "all" && c.creator !== intranetCreatorFilter)
                      return false;
                    if (
                      intranetSearch.trim() &&
                      !c.title.toLowerCase().includes(intranetSearch.toLowerCase()) &&
                      !c.creator.toLowerCase().includes(intranetSearch.toLowerCase())
                    ) {
                      return false;
                    }
                    return true;
                  });

                  const isCollapsed = Boolean(collapsedDepts[dept]);

                  return (
                    <div key={dept} className="space-y-1">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedDepts((prev) => ({ ...prev, [dept]: !prev[dept] }))
                        }
                        className="w-full h-11 min-h-11 px-2 rounded-md flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span className="flex items-center gap-2">
                          {isCollapsed ? (
                            <ChevronRight className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                          <span>{dept}</span>
                        </span>
                        <Badge variant="outline" className="text-2xs font-mono">
                          {deptChannels.length}
                        </Badge>
                      </button>

                      {!isCollapsed &&
                        deptChannels.map((ch) => {
                          const isSelected = ch.id === activeIntranetChannel?.id;
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => setActiveIntranetChannelId(ch.id)}
                              className={cn(
                                "w-full p-3 rounded-lg text-left transition-colors cursor-pointer border space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                isSelected
                                  ? "bg-primary/10 border-primary/40 text-foreground"
                                  : "bg-card border-border/50 hover:bg-muted/40 text-foreground",
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-bold leading-snug line-clamp-1">
                                  {ch.title}
                                </span>
                                <span className="text-2xs font-mono text-muted-foreground shrink-0">
                                  {ch.updatedAt}
                                </span>
                              </div>

                              <div className="flex items-center flex-wrap gap-2 text-2xs">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-2xs gap-1",
                                    ch.scope === "private"
                                      ? "bg-warning/10 text-warning-strong  border-warning/30"
                                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
                                  )}
                                >
                                  {ch.scope === "private" ? (
                                    <Lock className="size-2.5" />
                                  ) : (
                                    <Hash className="size-2.5" />
                                  )}
                                  <span>{ch.scope === "private" ? "Privado" : "Público"}</span>
                                </Badge>

                                <Badge variant="secondary" className="text-2xs">
                                  {ch.department}
                                </Badge>

                                <span className="text-muted-foreground ml-auto truncate">
                                  por {ch.creator}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* COLUNA PRINCIPAL: Canal da Intranet + Linha do Tempo + Preview de Planilha */}
          {activeIntranetChannel && (
            <div className="flex-1 flex flex-col min-w-0 bg-muted/10 overflow-hidden">
              {/* Cabeçalho do Canal Corporativo */}
              <div className="p-4 bg-card border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                      {activeIntranetChannel.title}
                    </h3>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {activeIntranetChannel.department}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Criador: {activeIntranetChannel.creator}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Canal corporativo interno • {activeIntranetChannel.membersCount} colaboradores conectados
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.info(
                        `${activeIntranetChannel.membersCount} colaboradores com acesso a este canal.`,
                      )
                    }
                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Users className="size-4 text-primary" />
                    <span>Membros ({activeIntranetChannel.membersCount})</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      toast.success("Link do canal interno copiado!");
                    }}
                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Share2 className="size-4 text-primary" />
                    <span>Compartilhar</span>
                  </Button>
                </div>
              </div>

              {/* Stream do Canal: Linha do Tempo + Preview de Planilha + Mensagens */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-5">
                {/* Bloco Linha do Tempo (Milestones Conectados) */}
                <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <GitBranch className="size-4 text-primary" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Linha do Tempo
                      </h4>
                    </div>
                    <Badge variant="outline" className="text-2xs font-mono">
                      {activeIntranetChannel.milestones.length} etapas concluídas
                    </Badge>
                  </div>

                  <div className="relative pl-7 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-500/40">
                    {activeIntranetChannel.milestones.map((ms: any) => (
                      <button
                        key={ms.id}
                        type="button"
                        onClick={() => {
                          const nextDone = !ms.done;
                          toggleIntranetMilestone({ data: { milestoneId: ms.id, done: nextDone } }).catch((err) =>
                            console.warn("[intranet] Erro ao alternar marco:", err),
                          );
                          setIntranetChannels((prev) =>
                            prev.map((ch) =>
                              ch.id === activeIntranetChannel.id
                                ? {
                                    ...ch,
                                    milestones: ch.milestones.map((m: any) =>
                                      m.id === ms.id ? { ...m, done: nextDone } : m,
                                    ),
                                  }
                                : ch,
                            ),
                          );
                        }}
                        className="w-full relative flex items-start justify-between gap-3 text-xs text-left p-1 rounded-md hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span
                          className={cn(
                            "size-5 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-colors",
                            ms.done
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                              : "bg-muted text-muted-foreground border-border/80",
                          )}
                        >
                          {ms.done ? <Check className="size-3" /> : <Circle className="size-2 text-muted-foreground" />}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className={cn("font-semibold text-foreground", ms.done && "line-through text-muted-foreground")}>
                            {ms.label}
                          </p>
                          {ms.detail && <p className="text-2xs text-muted-foreground">{ms.detail}</p>}
                        </div>
                        <span className="font-mono text-2xs text-muted-foreground shrink-0">
                          {ms.time}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Preview Interativo de Planilha Anexada (ArtifactInteractiveTable) */}
                  {activeIntranetChannel.spreadsheet && (
                    <div className="pt-3 border-t border-border/50 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="size-4 text-primary" />
                          <span className="font-bold text-foreground">
                            {activeIntranetChannel.spreadsheet.title}
                          </span>
                          <Badge variant="secondary" className="text-2xs font-mono">
                            {activeIntranetChannel.spreadsheet.rowsCount} linhas ×{" "}
                            {activeIntranetChannel.spreadsheet.colsCount} colunas
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {activeIntranetChannel.spreadsheet.headers.map((h: string, idx: number) => (
                            <Badge key={h} variant="outline" className="text-2xs font-mono">
                              {activeIntranetChannel.spreadsheet?.colTypes[idx] || "abc"} • {h}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <ArtifactInteractiveTable
                        title={activeIntranetChannel.spreadsheet.title}
                        headers={activeIntranetChannel.spreadsheet.headers}
                        rows={activeIntranetChannel.spreadsheet.rows}
                      />
                    </div>
                  )}
                </div>

                {/* Mensagens e Cards Estruturados dos Colaboradores */}
                <div className="space-y-3">
                  {activeIntranetChannel.messages.map((m: any) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-border/70 bg-card p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-xs">
                            {m.author[0]}
                          </div>
                          <span className="font-bold text-foreground">{m.author}</span>
                          <Badge variant="outline" className="text-2xs">
                            {m.role}
                          </Badge>
                        </div>
                        <span className="font-mono text-2xs text-muted-foreground">{m.time}</span>
                      </div>

                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {m.text}
                      </p>

                      {m.payload && (
                        <div className="pt-2">
                          <StructuredMessageView payload={m.payload} isStaff={true} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Barra Inferior de Ações Rápidas da Intranet (Formulários, Eventos, Planilhas, Mensagem) */}
              <div className="p-3 bg-card border-t border-border/80 space-y-2 shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIntranetModalOverride("form")}
                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ClipboardList className="size-3.5 text-primary" />
                    <span>Formulário Rápido / Secreto</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIntranetModalOverride("event")}
                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Calendar className="size-3.5 text-emerald-600" />
                    <span>Novo Evento</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIntranetModalOverride("spreadsheet")}
                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <FileSpreadsheet className="size-3.5 text-sky-600" />
                    <span>Anexar Planilha</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIntranetModalOverride("sticker")}
                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Sparkles className="size-3.5 text-warning-strong" />
                    <span>Stickers</span>
                  </Button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!intranetComposerText.trim()) return;
                    const txt = intranetComposerText.trim();
                    setIntranetComposerText("");
                    if (activeIntranetChannel?.id) {
                      sendIntranetMessage({
                        data: {
                          channelId: activeIntranetChannel.id,
                          content: txt,
                          authorRole: "Colaborador",
                        },
                      }).catch((err) => console.warn("[intranet] Erro ao persistir mensagem:", err));
                    }
                    setIntranetChannels((prev) =>
                      prev.map((ch) =>
                        ch.id === activeIntranetChannel?.id
                          ? {
                              ...ch,
                              updatedAt: "Agora",
                              messages: [
                                ...ch.messages,
                                {
                                  id: `im-${Date.now()}`,
                                  author: "Você (Equipe)",
                                  role: "Colaborador",
                                  time: "Agora",
                                  text: txt,
                                },
                              ],
                            }
                          : ch,
                      ),
                    );
                  }}
                  className="flex items-center gap-2"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIntranetTrayOpen(true)}
                    className="size-11 rounded-lg shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Abrir ferramentas da Intranet"
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Input
                    value={intranetComposerText}
                    onChange={(e) => setIntranetComposerText(e.target.value)}
                    placeholder={`Enviar atualização em #${activeIntranetChannel.title}...`}
                    className="h-11 text-xs rounded-lg bg-muted/40"
                  />
                  <Button
                    type="submit"
                    className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 shrink-0 cursor-pointer"
                  >
                    <span>Publicar</span>
                    <Send className="size-3.5" />
                  </Button>
                </form>
              </div>
            </div>
          )}

          {!activeIntranetChannel && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Hash className="size-10 mb-3 opacity-30 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Nenhum canal selecionado</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Crie ou selecione um canal na barra lateral para colaborar com a equipe e acompanhar marcos operacionais.
              </p>
              <Button
                type="button"
                onClick={() => setNewChannelModalOpen(true)}
                className="mt-4 h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Criar Canal</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: LEADS SDR & QUALIFICAÇÃO IA */}
      {/* ======================================================== */}
      {activeHubTab === "sdr" && (
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/15 p-4 sm:p-6 space-y-4">
          {/* Barra de Filtros SDR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border/70 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="size-4 absolute left-3 top-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por anúncio ou resumo da IA..."
                value={sdrSearchTerm}
                onChange={(e) => setSdrSearchTerm(e.target.value)}
                className="pl-9 h-11 min-h-11 rounded-lg text-xs bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto tab-list pb-1 sm:pb-0">
              {[
                { id: "all", label: "Todas", count: sdrMetrics.total },
                { id: "ready_to_buy", label: "Pronto p/ Compra", count: sdrMetrics.readyToBuy },
                { id: "warm", label: "Interessado", count: sdrMetrics.warm },
                { id: "curious", label: "Curioso", count: sdrMetrics.curious },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setSdrIntentFilter(pill.id)}
                  className={cn(
                    "px-3 h-11 min-h-11 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                    sdrIntentFilter === pill.id
                      ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border/50",
                  )}
                >
                  <span>{pill.label}</span>
                  <span className="text-xs opacity-75 font-mono">({pill.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Conversas SDR */}
          <div className="flex-1 overflow-y-auto">
            {filteredSdrSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <div className="size-12 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground">
                  <Bot className="size-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Nenhuma oportunidade qualificada encontrada</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    As mensagens e intenções de compra captadas pelo atendimento aparecerão aqui.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSdrSessions.map((session) => {
                  if (!session?.id) return null;
                  const isReady = session.intent_classification === "ready_to_buy";
                  const isWarm = session.intent_classification === "warm";

                  return (
                    <div
                      key={session.id}
                      className={cn(
                        "bg-card p-4 rounded-lg border flex flex-col justify-between space-y-4 shadow-xs transition-colors duration-150 hover:border-primary/50",
                        isReady
                          ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10"
                          : isWarm
                          ? "border-warning/40 bg-warning/5 "
                          : "border-border/70",
                      )}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-bold px-2 py-1 rounded-md",
                              isReady
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                : isWarm
                                ? "bg-warning/15 text-warning-strong  border-warning/30"
                                : "bg-muted text-muted-foreground border border-border/60",
                            )}
                          >
                            {isReady
                              ? "Pronto para Comprar"
                              : isWarm
                              ? "Lead Quente"
                              : session.intent_classification === "curious"
                              ? "Curioso / Dúvida"
                              : "Atendimento Geral"}
                          </Badge>

                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(session.updated_at)}
                          </span>
                        </div>

                        {session.classified && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-foreground line-clamp-1">
                              {session.classified.title}
                            </h4>
                            {session.classified.price_cents !== null &&
                              session.classified.price_cents !== undefined && (
                                <p className="text-xs font-semibold text-primary font-mono">
                                  {session.classified.price_cents > 0
                                    ? formatMoney(session.classified.price_cents)
                                    : "Sob Consulta"}
                                </p>
                              )}
                          </div>
                        )}

                        {session.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/40 p-3 rounded-lg border border-border/40">
                            {session.summary}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                          <MessageSquare className="size-3 text-muted-foreground" />
                          <span>{session.message_count} mensagens</span>
                        </span>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSdrSession(session);
                            setSdrDrawerOpen(true);
                          }}
                          className="h-11 min-h-11 px-3 text-xs font-semibold rounded-lg gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          Ver Diálogo
                          <ArrowLeft className="size-3 rotate-180" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: TELEMETRIA & FILAS (PAINEL OPERACIONAL ISOLADO) */}
      {/* ======================================================== */}
      {activeHubTab === "metrics" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-muted/10">
          {/* Métricas Operacionais de Mensageria e Fila */}
          <div className="space-y-2">
            <h2 className="text-base font-bold text-foreground">
              Monitoramento Operacional de Mensageria & Filas
            </h2>
            <p className="text-xs text-muted-foreground">
              Acompanhamento em tempo real da vazão de mensagens, workers de envio, latência P95 e dead-letter.
            </p>
          </div>

          <WhatsAppOperationsMetricsPanel />

          {/* Cards de Governança de SAC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Total de Atendimentos</span>
              <p className="text-2xl font-bold font-mono text-foreground">{metrics?.total || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Atendimentos Abertos</span>
              <p className="text-2xl font-bold font-mono text-primary">{metrics?.open || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Tempo Médio 1ª Resposta</span>
              <p className="text-2xl font-bold font-mono text-foreground">
                {metrics?.sla_first_response_min ? `${metrics.sla_first_response_min} min` : "—"}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Avaliação dos Clientes</span>
              {Number(metrics?.avg_rating || 0) > 0 ? (
                <p className="text-2xl font-bold font-mono text-warning-strong flex items-center gap-1">
                  <Star className="size-5 fill-warning" />
                  <span>{metrics.avg_rating} / 5.0</span>
                </p>
              ) : (
                <p className="text-xs font-medium text-muted-foreground">Sem avaliações registradas</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: CONEXÃO WHATSAPP WEB & INSTÂNCIAS */}
      {/* ======================================================== */}
      {activeHubTab === "whatsapp" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-muted/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                Canais WhatsApp
              </h2>
              <p className="text-xs text-muted-foreground">
                Gerencie aparelhos conectados, setores de atendimento e rotas de entrada.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => setQrConnectModalOpen(true)}
                className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                <QrCode className="size-4" />
                Conectar Novo Aparelho
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTeamSectorsDrawerOpen(true)}
                className="h-11 min-h-11 rounded-lg text-xs gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Layers className="size-4" />
                Setores & Permissões
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRefreshWhatsAppStatus}
                disabled={isRefreshingWhatsApp}
                className="h-11 min-h-11 rounded-lg text-xs gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                <RefreshCw className={cn("size-4", isRefreshingWhatsApp && "animate-spin motion-reduce:animate-none")} />
                Atualizar
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {whatsappInstances.length === 0 ? (
              <div className="bg-card p-10 rounded-xl border border-border/80 text-center space-y-4 max-w-xl mx-auto shadow-xs">
                <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <Smartphone className="size-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-foreground">Nenhum WhatsApp Conectado</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                    Conecte o WhatsApp corporativo da sua loja para iniciar atendimentos com múltiplos operadores e respostas automatizadas.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setQrConnectModalOpen(true)}
                  className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer"
                >
                  <QrCode className="size-4" />
                  Conectar Aparelho via QR Code
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {whatsappInstances.map((inst) => {
                  const isConnected = inst.is_active && inst.status === "connected";
                  const qrUrl = inst.public_config?.qr_code_url ? normalizeWhatsAppQrDataUri(inst.public_config.qr_code_url) || String(inst.public_config.qr_code_url) : null;
                  return (
                    <div
                      key={inst.id}
                      className={cn(
                        "bg-card p-5 rounded-xl border space-y-4 shadow-xs flex flex-col justify-between transition-colors",
                        isConnected ? "border-emerald-500/40" : "border-border/80"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                              "size-10 rounded-lg flex items-center justify-center shrink-0 border",
                              isConnected ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground border-border/60"
                            )}>
                              <Smartphone className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-sm text-foreground truncate">
                                {inst.display_name}
                              </h3>
                              <p className="text-xs text-muted-foreground font-mono truncate">
                                {inst.display_phone_number || "Aguardando pareamento"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {inst.is_default && (
                              <Badge variant="secondary" className="text-xs font-semibold">
                                Padrão
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs px-2 py-1 font-bold",
                                isConnected
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : inst.status === "error"
                                  ? "bg-destructive/15 text-destructive border-destructive/30"
                                  : "bg-warning/15 text-warning-strong border-warning/30"
                              )}
                            >
                              {isConnected ? "Conectado" : inst.status === "error" ? "Falha" : "Aguardando"}
                            </Badge>
                          </div>
                        </div>

                        <div className="bg-muted/30 rounded-lg p-2 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Setor:</span>
                            <span className="font-semibold text-foreground">{String(inst.public_config?.department || "Geral")}</span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Tipo:</span>
                            <span className="font-medium text-foreground">{inst.provider === "meta_cloud_api" ? "Meta Cloud Oficial" : "QR Code (VPS)"}</span>
                          </div>
                        </div>

                        {!isConnected && qrUrl && (
                          /* design-lint-ignore DL-18 reason:"Fundo branco obrigatório para leitura óptica de QR Code por câmeras de smartphone" expiry:"2027-10-30" */
                          <div className="size-36 mx-auto bg-white p-2 rounded-lg border border-border flex items-center justify-center shadow-2xs">
                            <img
                              src={qrUrl}
                              alt="QR Code"
                              className="size-full object-contain"
                            />
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setQrConnectModalOpen(true)}
                          className="h-11 min-h-11 flex-1 text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <QrCode className="size-4" />
                          {isConnected ? "Gerenciar" : "Parear"}
                        </Button>

                        {isConnected && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDisconnectInstanceId(inst.id);
                              setDisconnectModalOpen(true);
                            }}
                            className="h-11 min-h-11 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/40 gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-destructive shrink-0"
                          >
                            <PowerOff className="size-4" />
                            Desconectar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Card de Gestão e Higienização Local do SAC */}
            <div className="bg-card p-6 rounded-xl border border-border/80 space-y-4 shadow-xs mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-foreground">Higienização do Sistema Local</h3>
                  <p className="text-xs text-muted-foreground">
                    Ferramentas para apagar ou resetar conversas estritamente no banco do Waesy, sem deletar nada no WhatsApp dos clientes.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResetHistoryModalOpen(true)}
                  className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer border-destructive/40 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive shrink-0"
                >
                  <Trash2 className="size-4" />
                  Resetar Histórico Local
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 5: HORÁRIOS & SETORES DE ATENDIMENTO */}
      {/* ======================================================== */}
      {activeHubTab === "hours" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-muted/10">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Horários de Atendimento & Departamentos
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure os turnos em que sua equipe está disponível e a resposta automática fora de expediente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Horários de Expediente */}
            <div className="bg-card p-6 rounded-lg border border-border/80 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground">Turnos de Atendimento ao Cliente</h3>
                <span className="text-xs text-muted-foreground font-mono">Sincronizado</span>
              </div>
              <div className="space-y-3 text-xs">
                {supportSchedules.length === 0 ? (
                  <div className="p-6 text-center rounded-lg border border-dashed border-border/80 space-y-3">
                    <Clock className="size-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-xs text-muted-foreground font-medium">Nenhum turno de atendimento configurado.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSupportSchedules([
                          { day: "Segunda a Sexta", hours: "08:00 às 18:00", active: true },
                          { day: "Sábado", hours: "08:00 às 12:00", active: true },
                          { day: "Domingo e Feriados", hours: "Fechado", active: false },
                        ])
                      }
                      className="h-11 min-h-11 text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary mx-auto"
                    >
                      <Plus className="size-3.5" />
                      <span>Configurar Horários Padrão</span>
                    </Button>
                  </div>
                ) : (
                  supportSchedules.map((item, idx) => (
                    <div
                      key={item.day}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 gap-3"
                    >
                      <div className="flex-1">
                        <span className="font-bold text-foreground block">{item.day}</span>
                        <Input
                          value={item.hours}
                          onChange={(e) => {
                            const updated = [...supportSchedules];
                            updated[idx] = { ...updated[idx], hours: e.target.value };
                            setSupportSchedules(updated);
                          }}
                          className="h-11 min-h-11 px-3 text-xs bg-background mt-1 rounded-lg border-border/70 focus-visible:ring-2 focus-visible:ring-primary"
                          placeholder="Ex: 08:00 às 18:00 ou Fechado"
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pt-4">
                        <Switch
                          id={`schedule-switch-${idx}`}
                          checked={item.active}
                          onCheckedChange={(checked) => {
                            const updated = [...supportSchedules];
                            updated[idx] = { ...updated[idx], active: checked };
                            setSupportSchedules(updated);
                          }}
                        />
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-semibold select-none",
                            item.active
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : "bg-muted text-muted-foreground border-border/50",
                          )}
                        >
                          {item.active ? "Ativo" : "Fechado"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Button
                type="button"
                onClick={handleSaveSupportSettings}
                disabled={isSavingSupportSettings}
                className="w-full h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-center gap-2"
              >
                {isSavingSupportSettings ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Turnos de Atendimento</span>
                )}
              </Button>
            </div>

            {/* Mensagem Fora de Expediente */}
            <div className="bg-card p-6 rounded-lg border border-border/80 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground">Mensagem Automática de Ausência</h3>
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-reply-toggle"
                    checked={autoReplyEnabled}
                    onCheckedChange={setAutoReplyEnabled}
                  />
                  <Label htmlFor="auto-reply-toggle" className="text-xs text-muted-foreground cursor-pointer">
                    {autoReplyEnabled ? "Ativada" : "Desativada"}
                  </Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Enviada automaticamente no WhatsApp quando o cliente enviar mensagem fora do expediente comercial:
              </p>

              <div className="space-y-2">
                <Textarea
                  value={awayMessage}
                  onChange={(e) => setAwayMessage(e.target.value)}
                  rows={4}
                  className="text-xs rounded-lg bg-muted/30 resize-none"
                  placeholder="Digite a mensagem de ausência..."
                />
              </div>

              <Button
                type="button"
                onClick={handleSaveSupportSettings}
                disabled={isSavingSupportSettings}
                className="w-full h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-center gap-2"
              >
                {isSavingSupportSettings ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Mensagem de Ausência</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL DA SESSÃO SDR SELECIONADA */}
      {selectedSdrSession && (
        <Sheet open={sdrDrawerOpen} onOpenChange={setSdrDrawerOpen}>
          <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
            <SheetHeader className="p-4 border-b border-border/70 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <SheetTitle className="text-sm font-bold flex items-center gap-2">
                  <Bot className="size-4 text-primary" />
                  <span>Diálogo Qualificado por IA</span>
                </SheetTitle>

                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-bold",
                    selectedSdrSession.intent_classification === "ready_to_buy"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      : selectedSdrSession.intent_classification === "warm"
                      ? "bg-warning/15 text-warning-strong  border-warning/30"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {selectedSdrSession.intent_classification === "ready_to_buy"
                    ? "Pronto para Comprar"
                    : selectedSdrSession.intent_classification === "warm"
                    ? "Lead Quente"
                    : "Curioso / Dúvida"}
                </Badge>
              </div>

              {selectedSdrSession.classified && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {selectedSdrSession.classified.title}
                    </p>
                    {selectedSdrSession.classified.price_cents !== null &&
                      selectedSdrSession.classified.price_cents !== undefined && (
                        <p className="text-xs font-semibold text-primary font-mono">
                          {formatMoney(selectedSdrSession.classified.price_cents)}
                        </p>
                      )}
                  </div>

                  <Button asChild size="sm" variant="ghost" className="h-11 min-h-11 px-3 text-xs gap-1 rounded-lg focus-visible:ring-2 focus-visible:ring-primary">
                    <Link to="/classificados/$id" params={{ id: selectedSdrSession.classified_id }}>
                      Ver Anúncio
                      <ExternalLink className="size-3" />
                    </Link>
                  </Button>
                </div>
              )}

              {selectedSdrSession.summary && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                    Resumo do Interesse (Gerado por IA)
                  </span>
                  <p className="leading-relaxed text-xs">{selectedSdrSession.summary}</p>
                </div>
              )}
            </SheetHeader>

            {/* Histórico das Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              {Array.isArray(selectedSdrSession.messages_log) &&
              selectedSdrSession.messages_log.length > 0 ? (
                selectedSdrSession.messages_log.map((msg, i) => {
                  const isAssistant = msg.role === "assistant";
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex flex-col max-w-md rounded-lg p-3 text-xs leading-relaxed",
                        isAssistant
                          ? "ml-auto bg-primary text-primary-foreground rounded-tr-xs"
                          : "mr-auto bg-card border border-border/70 text-foreground rounded-tl-xs shadow-2xs",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 opacity-75 text-xs font-semibold">
                        <span>{isAssistant ? "Atendimento Virtual" : "Cliente"}</span>
                        {msg.at && (
                          <span>
                            {new Date(msg.at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-line">{msg.content}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-xs text-muted-foreground py-10">
                  Nenhuma mensagem registrada nesta sessão.
                </p>
              )}
            </div>

            <SheetFooter className="p-4 border-t border-border/70 flex-row gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const logText = (selectedSdrSession.messages_log || [])
                    .map((m) => `[${m.role}]: ${m.content}`)
                    .join("\n\n");
                  navigator.clipboard.writeText(logText);
                  toast.success("Transcrição da conversa copiada!");
                }}
                className="rounded-lg text-xs gap-2 cursor-pointer"
              >
                <Copy className="size-4" />
                Copiar Histórico
              </Button>

              <Button
                size="sm"
                onClick={() => setSdrDrawerOpen(false)}
                className="rounded-lg text-xs font-semibold cursor-pointer"
              >
                Fechar
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* MODAL DE RESOLUÇÃO DE TICKET SAC / RMA */}
      {selectedTicket && (
        <Sheet open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
          <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-4 space-y-4">
            <SheetHeader>
              <SheetTitle className="text-base font-bold">
                Ticket SAC #{selectedTicket.ticket_id?.slice(0, 8)}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status da Resolução</Label>
                <Select value={ticketStatus} onValueChange={setTicketStatus}>
                  <SelectTrigger className="h-9 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under_review">Em Análise</SelectItem>
                    <SelectItem value="action_required">Ação Requerida do Cliente</SelectItem>
                    <SelectItem value="resolved">Resolvido / Concluído</SelectItem>
                    <SelectItem value="refunded">Reembolsado</SelectItem>
                    <SelectItem value="rejected">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Notas de Resolução</Label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explique a conclusão do atendimento para histórico do cliente..."
                  rows={4}
                  className="text-xs rounded-lg"
                />
              </div>
            </div>

            <SheetFooter className="mt-auto pt-4 border-t flex-row gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTicketModalOpen(false)}
                className="rounded-lg text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={isResolvingTicket}
                onClick={handleResolveTicket}
                className="rounded-lg text-xs font-bold cursor-pointer"
              >
                {isResolvingTicket ? <Loader2 className="size-4 animate-spin" /> : "Concluir Resolução"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* MODAIS DE OPERAÇÕES AVANÇADAS WHATICKET / OMNICHANNEL */}
      {activeThread?.id && (
        <TransferChatThreadModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          threadId={activeThread.id}
          currentDepartment={activeThread.department || "geral"}
          departmentLabels={{ geral: "Geral", vendas: "Vendas", suporte: "Suporte", financeiro: "Financeiro" }}
          teamMembers={teamMembers}
          onSuccess={() => {
            listChatThreads({ data: { store_id: store?.id } }).then((res) => {
              if (res?.threads) setThreads(res.threads);
            }).catch(() => {});
          }}
        />
      )}
      <QuickAnswersManagerModal
        isOpen={quickAnswersModalOpen}
        onClose={() => setQuickAnswersModalOpen(false)}
        customerName={activeThread?.customer?.full_name}
        customerPhone={activeThread?.customer?.phone}
        storeName={store?.name}
        onSelectAnswer={(msg) => setText(msg)}
      />
      {activeThread?.id && (
        <ScheduleWhatsAppMessageModal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          threadId={activeThread.id}
          recipientPhone={activeThread.customer?.phone || ""}
          recipientName={activeThread.customer?.full_name || "Cliente"}
        />
      )}

      {/* Modais Rápidos no Atendimento ao Cliente (Live) */}
      <ChatQuickComposerModals
        trayOpen={liveComposerTrayOpen}
        onTrayOpenChange={setLiveComposerTrayOpen}
        activeModalOverride={liveModalOverride}
        onClearModalOverride={() => setLiveModalOverride(null)}
        storeName={store?.name || "Loja"}
        storeSlug={store?.slug}
        onDispatchMessage={async (data: StructuredDispatchPayload) => {
          if (!activeThreadId) return;
          try {
            const sent = await sendChatMessage({
              data: {
                threadId: activeThreadId,
                message: data.message,
                message_type: data.message_type,
                payload: data.payload,
                attachments: [],
              },
            });
            setMessages((prev) => [...prev, sent]);
          } catch {
            setMessages((prev) => [
              ...prev,
              {
                id: `local-${Date.now()}`,
                message: data.message,
                message_type: data.message_type,
                payload: data.payload,
                is_staff_reply: true,
                created_at: new Date().toISOString(),
              },
            ]);
          }
        }}
      />

      {/* Modais Rápidos na Intranet Corporativa */}
      <ChatQuickComposerModals
        trayOpen={intranetTrayOpen}
        onTrayOpenChange={setIntranetTrayOpen}
        activeModalOverride={intranetModalOverride}
        onClearModalOverride={() => setIntranetModalOverride(null)}
        storeName={store?.name || "Intranet"}
        onDispatchMessage={(data: StructuredDispatchPayload) => {
          if (!activeIntranetChannel?.id) return;
          sendIntranetMessage({
            data: {
              channelId: activeIntranetChannel.id,
              content: data.message,
              authorRole: "Gestão",
              artifactType: (data as any).type || data.message_type,
              artifactPayload: data.payload,
            },
          }).catch((err) => console.warn("[intranet] Erro ao persistir mensagem estruturada:", err));
          setIntranetChannels((prev) =>
            prev.map((ch) =>
              ch.id === activeIntranetChannel?.id
                ? {
                    ...ch,
                    updatedAt: "Agora",
                    messages: [
                      ...ch.messages,
                      {
                        id: `im-${Date.now()}`,
                        author: "Você (Equipe)",
                        role: "Gestão",
                        time: "Agora",
                        text: data.message,
                        payload: data.payload,
                      },
                    ],
                  }
                : ch,
            ),
          );
        }}
      />

      {/* Modal Criar Novo Canal da Intranet */}
      <Dialog open={newChannelModalOpen} onOpenChange={setNewChannelModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/80 rounded-xl">
          <DialogHeader className="p-4 border-b border-border/50">
            <DialogTitle className="text-base font-bold text-foreground">
              Canais
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome do Canal ou Tópico</Label>
              <Input
                value={newChannelTitle}
                onChange={(e) => setNewChannelTitle(e.target.value)}
                placeholder="Ex: Planejamento Black Friday & Estoque"
                className="h-11 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Departamento</Label>
                <select
                  value={newChannelDept}
                  onChange={(e) => setNewChannelDept(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-muted/40 border border-border/60 text-xs font-semibold text-foreground"
                >
                  <option value="Executivo">Executivo</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operações">Operações</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Suporte">Suporte</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Privacidade</Label>
                <select
                  value={newChannelScope}
                  onChange={(e) => setNewChannelScope(e.target.value as any)}
                  className="w-full h-11 px-3 rounded-lg bg-muted/40 border border-border/60 text-xs font-semibold text-foreground"
                >
                  <option value="private">Privado</option>
                  <option value="public">Público</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border/50 flex items-center justify-end gap-2 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewChannelModalOpen(false)}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!newChannelTitle.trim()) {
                  toast.error("Informe o título do canal.");
                  return;
                }
                try {
                  const created = await createIntranetChannel({
                    data: {
                      storeId: store?.id,
                      store_id: store?.id,
                      title: newChannelTitle.trim(),
                      department: newChannelDept,
                      scope: newChannelScope,
                    },
                  });
                  if (created?.id) {
                    const newChan = {
                      ...created,
                      creator: created.creator_name || "Você",
                      updatedAt: "Agora",
                      membersCount: 1,
                      milestones: [
                        {
                          id: `ms-${Date.now()}`,
                          label: "Canal corporativo estruturado criado",
                          time: "Agora",
                          done: true,
                          detail: `Escopo ${newChannelScope === "private" ? "Privado" : "Público"} • Setor ${newChannelDept}`,
                        },
                      ],
                      messages: [],
                    };
                    setIntranetChannels((prev) => [newChan, ...prev]);
                    setActiveIntranetChannelId(created.id);
                    setNewChannelTitle("");
                    setNewChannelModalOpen(false);
                    toast.success("Canal criado na Intranet!");
                  }
                } catch (err: any) {
                  console.warn("[intranet] Erro ao criar canal:", err);
                  toast.error("Falha ao criar canal no banco de dados.");
                }
              }}
              className="h-11 min-h-11 px-5 text-xs font-bold cursor-pointer"
            >
              Criar Canal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Desconectar WhatsApp */}
      <Dialog open={disconnectModalOpen} onOpenChange={setDisconnectModalOpen}>
        <DialogContent className="sm:max-w-md p-6 space-y-4 border-border/80 rounded-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <PowerOff className="size-5 text-destructive" />
              <span>Desconectar WhatsApp</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Deseja desconectar o aparelho {selectedDisconnectInstanceId ? `"${whatsappInstances.find((i) => i.id === selectedDisconnectInstanceId)?.display_name || "WhatsApp"}"` : "WhatsApp"} vinculado? A sessão será despareada no aparelho e na VPS.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="deep-disconnect-toggle" className="text-xs font-semibold text-foreground cursor-pointer">
                  Limpeza total da sessão
                </Label>
                <p className="text-xs text-muted-foreground">
                  Remove completamente os dados e arquivos da sessão na VPS.
                </p>
              </div>
              <Switch
                id="deep-disconnect-toggle"
                checked={deepDisconnect}
                onCheckedChange={setDeepDisconnect}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDisconnectModalOpen(false)}
              disabled={isDisconnectingWhatsApp}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDisconnectWhatsApp}
              disabled={isDisconnectingWhatsApp}
              className="h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer"
            >
              {isDisconnectingWhatsApp && <Loader2 className="size-4 animate-spin" />}
              Confirmar Desconexão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Limpar Mensagens no Sistema Local */}
      <Dialog open={clearMessagesModalOpen} onOpenChange={setClearMessagesModalOpen}>
        <DialogContent className="sm:max-w-md p-6 space-y-4 border-border/80 rounded-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Eraser className="size-5 text-warning-strong" />
              <span>Limpar Mensagens (No Sistema)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta ação apagará todas as mensagens desta conversa armazenadas no banco de dados do Waesy. As mensagens permanecerão intactas no WhatsApp do cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning-strong">
            As mensagens serão removidas do histórico da sua equipe. O cliente continuará vendo as mensagens no WhatsApp dele.
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setClearMessagesModalOpen(false)}
              disabled={isClearingMessages}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleClearThreadMessages}
              disabled={isClearingMessages}
              className="h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer"
            >
              {isClearingMessages && <Loader2 className="size-4 animate-spin" />}
              Limpar Mensagens Locais
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Excluir Conversa no Sistema Local */}
      <Dialog open={deleteThreadModalOpen} onOpenChange={setDeleteThreadModalOpen}>
        <DialogContent className="sm:max-w-md p-6 space-y-4 border-border/80 rounded-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" />
              <span>Excluir Conversa (No Sistema)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta conversa e todo o seu histórico serão removidos do painel da sua loja. O contato do cliente e as mensagens no WhatsApp dele NÃO sofrerão nenhuma alteração.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteThreadModalOpen(false)}
              disabled={isDeletingThread}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteThread}
              disabled={isDeletingThread}
              className="h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer"
            >
              {isDeletingThread && <Loader2 className="size-4 animate-spin" />}
              Excluir Conversa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Resetar Histórico Completo Local */}
      <Dialog open={resetHistoryModalOpen} onOpenChange={setResetHistoryModalOpen}>
        <DialogContent className="sm:max-w-md p-6 space-y-4 border-border/80 rounded-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" />
              <span>Resetar Histórico Local da Loja</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Exclui todas as conversas e mensagens arquivadas no banco do Waesy para esta loja. Nenhuma mensagem ou chat será apagado no WhatsApp dos clientes ou na VPS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-xs text-foreground font-semibold">
              Para confirmar, digite <span className="font-mono text-destructive font-bold">RESETAR</span> no campo abaixo:
            </p>
            <Input
              value={resetConfirmationCode}
              onChange={(e) => setResetConfirmationCode(e.target.value)}
              placeholder="RESETAR"
              className="h-11 min-h-11 font-mono uppercase text-xs"
            />
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setResetHistoryModalOpen(false);
                setResetConfirmationCode("");
              }}
              disabled={isResettingHistory}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleResetStoreHistory}
              disabled={isResettingHistory || resetConfirmationCode.trim() !== "RESETAR"}
              className="h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer"
            >
              {isResettingHistory && <Loader2 className="size-4 animate-spin" />}
              Confirmar Reset Local
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WhatsAppQrConnectModal
        open={qrConnectModalOpen}
        onOpenChange={setQrConnectModalOpen}
        instances={whatsappInstances}
        canManageConnection={Boolean(isSupervisor ?? true)}
        onInstancesUpdated={() => {
          handleRefreshWhatsAppStatus();
        }}
      />

      <WhatsAppTeamSectorsDrawer
        open={teamSectorsDrawerOpen}
        onOpenChange={setTeamSectorsDrawerOpen}
        companyId={store?.id || ""}
        instanceId={whatsappInstances[0]?.id}
        initialConfig={(store?.settings as any)?.whatsapp_governance}
        availableInstances={(whatsappInstances || []).map((inst: any) => ({ id: String(inst.id), displayName: String(inst.display_name || inst.instance_key || "WhatsApp"), phone: inst.display_phone_number || null }))}
        availableAgents={(teamMembers || []).map((m: any) => ({
          id: String(m.id || m.user_id),
          name: String(m.full_name || m.name || m.email || "Atendente"),
          role: String(m.role || "operator"),
        }))}
      />
    </div>
  );
}
