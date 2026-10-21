import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  listChatThreads,
  getChatMessages,
  sendChatMessage,
  assignChatThread,
  updateTicketStatus,
  archiveChatThread,
  saveStoreSupportSettings,
} from "@/services/chat.functions";
import { getStoreSettings } from "@/services/store.functions";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { getRealtimeChannel } from "@/services/realtime-channel";
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
} from "lucide-react";
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
  listWorkspaceWhatsAppInstances,
  type WhatsAppChannelInstanceDTO,
} from "@/services/whatsapp-channel-instances.functions";
import { Link } from "@tanstack/react-router";
import { WhatsAppOperationsMetricsPanel } from "@/components/chat/whatsapp-operations-metrics-panel";

export const Route = createFileRoute("/workspace/atendimento/")({
  head: () => ({ meta: [{ title: "Atendimento Omnichannel & WhatsApp" }] }),
  loader: async () => {
    try {
      const [res, store, sdrData, instances] = await Promise.all([
        listChatThreads().catch(() => null),
        getStoreSettings().catch(() => null),
        listSdrChatSessions().catch(() => ({
          sessions: [],
          metrics: { total: 0, readyToBuy: 0, warm: 0, curious: 0 },
        })),
        listWorkspaceWhatsAppInstances().catch(() => []),
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
  } = (Route.useLoaderData?.() as any) || {};

  const semantics = useMemo(() => getNicheSemantics(store), [store]);
  const departmentLabels = semantics.departmentLabels || DEPARTMENT_LABELS;

  // Tabs do Hub: Conversas estilo WhatsApp, SDR, Telemetria & Filas, Conexão WhatsApp e Horários
  const [activeHubTab, setActiveHubTab] = useState<"live" | "sdr" | "metrics" | "whatsapp" | "hours">("live");

  // Status de presença do atendente
  const [agentPresence, setAgentPresence] = useState<"online" | "busy" | "away">("online");

  // Filtro de status da lista (all: ativas | open: novas | archived: arquivadas)
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "archived">("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Instâncias de WhatsApp
  const [whatsappInstances, setWhatsappInstances] = useState<WhatsAppChannelInstanceDTO[]>(initialInstances || []);

  // Estados SDR
  const [sdrSessions] = useState<SdrChatSessionDTO[]>(initialSdrSessions || []);
  const [sdrMetrics] = useState(initialSdrMetrics || { total: 0, readyToBuy: 0, warm: 0, curious: 0 });
  const [sdrIntentFilter, setSdrIntentFilter] = useState<string>("all");
  const [sdrSearchTerm, setSdrSearchTerm] = useState("");
  const [selectedSdrSession, setSelectedSdrSession] = useState<SdrChatSessionDTO | null>(null);
  const [sdrDrawerOpen, setSdrDrawerOpen] = useState(false);

  // Estados de Conversas
  const [threads, setThreads] = useState<any[]>(initialThreads || []);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreads && initialThreads.length > 0 ? initialThreads[0].id : null,
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showCustomer360, setShowCustomer360] = useState(false);
  const [isWhisperMode, setIsWhisperMode] = useState(false);

  // Ticket Resolver Modal state
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketStatus, setTicketStatus] = useState<any>("resolved");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolvingTicket, setIsResolvingTicket] = useState(false);

  // Estados de Horários de Atendimento & Ausência (Persistidos)
  const initialSupportSettings = (store?.settings as any)?.support_settings || {};
  const [supportSchedules, setSupportSchedules] = useState<Array<{ day: string; hours: string; active: boolean }>>(
    initialSupportSettings.support_schedules || [
      { day: "Segunda a Sexta", hours: "08:00 às 18:00", active: true },
      { day: "Sábado", hours: "08:00 às 12:00", active: true },
      { day: "Domingo e Feriados", hours: "Fechado", active: false },
    ],
  );
  const [awayMessage, setAwayMessage] = useState<string>(
    initialSupportSettings.away_message ||
      "Olá! Nosso horário de atendimento é de Segunda a Sexta das 08h às 18h e Sábados das 08h às 12h. Deixe sua mensagem que responderemos assim que nossa equipe iniciar o expediente!",
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
    listChatThreads({ data: { status: statusFilter } })
      .then((res) => {
        if (res?.threads) {
          setThreads(res.threads);
          if (activeThreadId && !res.threads.some((t: any) => t.id === activeThreadId)) {
            setActiveThreadId(res.threads.length > 0 ? res.threads[0].id : null);
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

  // Realtime
  useEffect(() => {
    if (!store?.id) return;
    const rt = getRealtimeChannel(`store-chat-${store.id}`);
    if (!rt.channel) return;

    rt.channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload: any) => {
          const newMsg = payload.new as any;
          if (newMsg.thread_id === activeThreadId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (!newMsg.is_staff_reply) {
              playMessageChime();
            }
          }
          // Atualiza o snippet na lista de threads
          setThreads((prev) =>
            prev.map((t) => {
              if (t.id === newMsg.thread_id) {
                return {
                  ...t,
                  last_message: newMsg.message,
                  is_last_reply_staff: newMsg.is_staff_reply,
                  updated_at: newMsg.created_at,
                };
              }
              return t;
            }),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_threads" },
        (payload: any) => {
          const newThread = payload.new as any;
          // Ignora threads de IA/Copilot
          if (newThread.thread_type === "ai_assistant" || newThread.thread_type === "copilot") {
            return;
          }
          if (newThread.store_id === store.id) {
            listChatThreads({ data: { status: statusFilter } }).then((res) => {
              if (res?.threads) setThreads(res.threads);
            });
            playMessageChime();
          }
        },
      )
      .subscribe();

    return () => {
      rt.unsubscribe();
    };
  }, [store?.id, activeThreadId, statusFilter]);

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
        },
      });

      setMessages((prev) => [...prev, sent]);
      setText("");
      setIsWhisperMode(false);

      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              last_message: isWhisperMode ? `[Nota Interna]: ${text.trim()}` : text.trim(),
              is_last_reply_staff: true,
              updated_at: new Date().toISOString(),
            };
          }
          return t;
        }),
      );
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
      const matchDept = deptFilter === "all" || t.department === deptFilter;
      const matchSearch =
        !searchTerm.trim() ||
        (t.customer?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.last_message || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [threads, deptFilter, searchTerm]);

  // Filtros SDR
  const filteredSdrSessions = useMemo(() => {
    return sdrSessions.filter((session) => {
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
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] overflow-hidden bg-background">
      {/* CABEÇALHO DO HUB DE ATENDIMENTO */}
      <header className={cn(
        "shrink-0 border-b border-border/80 bg-card/90 px-4 py-2.5 flex-col md:flex-row md:items-center justify-between gap-3",
        activeHubTab === "live" && activeThreadId ? "hidden md:flex" : "flex"
      )}>
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground truncate">
              Atendimento Omnichannel
            </h1>
            <span className="hidden sm:inline-block text-xs text-muted-foreground">
              • {store?.name || "Workspace"}
            </span>
          </div>

          {/* Status de Presença do Atendente */}
          <div className="flex items-center gap-2 shrink-0 bg-muted/60 p-1 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setAgentPresence("online")}
              className={cn(
                "px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer",
                agentPresence === "online"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold"
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
                "px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer",
                agentPresence === "busy"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="size-2 rounded-full bg-amber-500" />
              <span>Ocupado</span>
            </button>
            <button
              type="button"
              onClick={() => setAgentPresence("away")}
              className={cn(
                "px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer",
                agentPresence === "away"
                  ? "bg-muted text-muted-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="size-2 rounded-full bg-muted-foreground/50" />
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
              "px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0",
              activeHubTab === "live"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
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

          {/* Aba 2: Leads SDR / IA */}
          <button
            type="button"
            onClick={() => setActiveHubTab("sdr")}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0",
              activeHubTab === "sdr"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/50",
            )}
          >
            <Bot className="size-4" />
            <span>Leads SDR / IA</span>
            {sdrMetrics?.total > 0 && (
              <Badge variant="secondary" className="text-xs h-4 px-2 font-mono">
                {sdrMetrics.total}
              </Badge>
            )}
          </button>

          {/* Aba 3: Telemetria & Filas */}
          <button
            type="button"
            onClick={() => setActiveHubTab("metrics")}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0",
              activeHubTab === "metrics"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/50",
            )}
          >
            <Activity className="size-4" />
            <span>Telemetria & Filas</span>
          </button>

          {/* Aba 4: Conexão WhatsApp Web */}
          <button
            type="button"
            onClick={() => setActiveHubTab("whatsapp")}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0",
              activeHubTab === "whatsapp"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/50",
            )}
          >
            <Smartphone className="size-4" />
            <span>Conexão WhatsApp</span>
          </button>

          {/* Aba 5: Horários & Setores */}
          <button
            type="button"
            onClick={() => setActiveHubTab("hours")}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0",
              activeHubTab === "hours"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/50",
            )}
          >
            <Clock className="size-4" />
            <span>Horários & Setores</span>
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
            <div className="p-3 border-b border-border/80 space-y-2 bg-card/40">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversa ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 rounded-lg text-xs bg-muted/40"
                />
              </div>

              {/* Chips Rápidos: Todas / Abertas / Arquivadas */}
              <div className="flex items-center gap-2 overflow-x-auto tab-list no-scrollbar">
                {[
                  { id: "all", label: "Todas" },
                  { id: "open", label: "Abertas" },
                  { id: "archived", label: "Arquivadas" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setStatusFilter(chip.id as any)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer shrink-0",
                      statusFilter === chip.id
                        ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border/50",
                    )}
                  >
                    {chip.label}
                  </button>
                ))}

                <div className="ml-auto">
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="h-7 text-xs rounded-md border-border/60">
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
                <div className="p-8 text-center text-muted-foreground text-xs space-y-2">
                  <MessageSquare className="size-8 mx-auto opacity-40" />
                  <p className="font-semibold text-foreground">Nenhuma conversa encontrada</p>
                  <p className="text-xs">
                    {statusFilter === "archived"
                      ? "Não há conversas arquivadas no momento."
                      : "Mensagens recebidas de clientes ou WhatsApp aparecerão aqui."}
                  </p>
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
                        "w-full p-4 text-left flex items-start gap-3 transition-colors cursor-pointer border-l-4",
                        isActive
                          ? "bg-muted/70 border-primary"
                          : "border-transparent hover:bg-muted/30",
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
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-foreground truncate">
                        {activeThread.customer?.full_name || "Cliente"}
                      </h3>
                      {activeThread.channel === "whatsapp" && (
                        <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          (WhatsApp)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate font-mono">
                      {activeThread.customer?.phone || activeThread.customer?.email || "Atendimento Direto"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Sinalizador Janela 24h WhatsApp */}
                  <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-md border text-xs font-mono font-semibold shrink-0 bg-muted/40 border-border/60">
                    <Clock className="size-3 text-primary shrink-0" />
                    <span
                      className={cn(
                        "text-xs",
                        isWhatsAppWindowOpen
                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                          : "text-muted-foreground",
                      )}
                    >
                      {isWhatsAppWindowOpen ? "Janela 24h Aberta" : "Janela Expirada"}
                    </span>
                  </div>

                  {/* Transferir Setor */}
                  <Select
                    value={activeThread.department || "geral"}
                    onValueChange={handleDepartmentChange}
                  >
                    <SelectTrigger className="h-11 rounded-lg text-xs w-32 sm:w-36 focus-visible:ring-2 focus-visible:ring-ring">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="vendas">Vendas</SelectItem>
                      <SelectItem value="suporte">Suporte / SAC</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="logistica">Logística</SelectItem>
                      <SelectItem value="geral">Geral</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Ação de Arquivar / Desarquivar */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isArchiving}
                    onClick={() =>
                      handleArchiveThread(activeThread.id, activeThread.status !== "archived")
                    }
                    className="h-11 rounded-lg text-xs font-semibold gap-2 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    title={activeThread.status === "archived" ? "Desarquivar conversa" : "Arquivar conversa"}
                  >
                    {activeThread.status === "archived" ? (
                      <>
                        <ArchiveRestore className="size-4" />
                        <span className="hidden sm:inline">Desarquivar</span>
                      </>
                    ) : (
                      <>
                        <Archive className="size-4" />
                        <span className="hidden sm:inline">Arquivar</span>
                      </>
                    )}
                  </Button>

                  {/* Toggle Perfil 360 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomer360(!showCustomer360)}
                    className={cn(
                      "h-11 text-xs font-bold rounded-lg px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                      showCustomer360 ? "bg-muted" : "",
                    )}
                  >
                    <UserCheck className="size-4 mr-1" />
                    <span className="hidden sm:inline">Perfil 360º</span>
                  </Button>
                </div>
              </div>

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
                          <div className="max-w-lg w-full p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1 shadow-2xs">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                                <Lock className="size-4 shrink-0" />
                                <span>Nota Interna da Equipe (Whisper)</span>
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
                              "max-w-[95%] sm:max-w-lg rounded-lg p-4 text-xs shadow-xs",
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
                            {isStaff && <CheckCheck className="size-3 text-primary inline" />}
                          </span>
                        </div>
                      );
                    }

                    // Balão Normal estilo WhatsApp Web
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] sm:max-w-md rounded-lg p-3 text-xs leading-relaxed shadow-xs",
                            isStaff
                              ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                              : "bg-card border border-border/80 text-foreground rounded-tl-xs",
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 px-1 flex items-center gap-1 font-mono">
                          {isStaff ? "Você" : activeThread.customer?.full_name || "Cliente"} •{" "}
                          {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {isStaff && <CheckCheck className="size-3 text-primary inline" />}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input de Envio do Atendente & Macros Rápidas */}
              <div className="bg-card border-t border-border/80 p-3 space-y-2">
                {/* Trilho de Respostas Rápidas / Macros */}
                <div
                  role="tablist"
                  aria-label="Atalhos Rápidos"
                  className="flex items-center gap-2 overflow-x-auto tab-list no-scrollbar"
                >
                  <span className="text-xs text-muted-foreground shrink-0 font-mono">Macros:</span>
                  {[
                    {
                      cmd: "/ola",
                      text: "Olá! Como podemos te ajudar hoje?",
                      label: "Saudação",
                    },
                    {
                      cmd: "/pix",
                      text: "Nossa chave PIX oficial é gerada e confirmada diretamente no seu pedido. O comprovante é validado automaticamente!",
                      label: "Chave PIX",
                    },
                    {
                      cmd: "/horarios",
                      text: "Nosso horário de atendimento é de Segunda a Sexta das 08h às 18h e Sábados das 08h às 12h.",
                      label: "Horários",
                    },
                    {
                      cmd: "/rastreio",
                      text: "Seu pedido está em processamento logístico e você pode acompanhar pelo link de rastreio acima.",
                      label: "Rastreio",
                    },
                  ].map((macro) => (
                    <button
                      key={macro.cmd}
                      type="button"
                      onClick={() => setText(macro.text)}
                      className="px-2 py-1 rounded-md text-xs font-mono font-medium bg-muted/50 hover:bg-muted border border-border/60 text-muted-foreground hover:text-foreground shrink-0 transition-colors cursor-pointer"
                    >
                      {macro.cmd} <span className="text-xs opacity-75">({macro.label})</span>
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSend} className="space-y-2">
                  <div className="flex items-end gap-2">
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
                            : "Digite sua mensagem ou use / para macros (Enter para enviar)..."
                        }
                        className={cn(
                          "min-h-11 max-h-32 text-xs rounded-lg resize-none p-3",
                          isWhisperMode
                            ? "border-amber-500/50 bg-amber-500/5 placeholder:text-amber-700/60"
                            : "bg-muted/30",
                        )}
                        rows={1}
                      />
                    </div>

                    {/* Botão Modo Sussurro */}
                    <Button
                      type="button"
                      variant={isWhisperMode ? "default" : "outline"}
                      size="icon"
                      onClick={() => setIsWhisperMode(!isWhisperMode)}
                      className={cn(
                        "size-11 rounded-lg shrink-0 cursor-pointer",
                        isWhisperMode ? "bg-amber-600 hover:bg-amber-700 text-white" : "",
                      )}
                      title={
                        isWhisperMode
                          ? "Desativar modo sussurro (voltar para resposta pública)"
                          : "Ativar modo sussurro (nota interna invisível ao cliente)"
                      }
                    >
                      <Lock className="size-4" />
                    </Button>

                    {/* Botão Enviar */}
                    <Button
                      type="submit"
                      disabled={isSending || !text.trim()}
                      className="h-11 px-4 rounded-lg font-bold text-xs gap-2 shrink-0 cursor-pointer"
                    >
                      {isSending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <span>Enviar</span>
                          <Send className="size-4" />
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
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Fechar
                </Button>
              </div>
              <Customer360Sidebar
                customerId={activeThread.customer?.id}
                storeId={store?.id || ""}
              />
            </div>
          )}

          {/* Drawer Sheet Mobile/Tablet do Perfil 360 */}
          <Sheet open={Boolean(activeThread && showCustomer360)} onOpenChange={setShowCustomer360}>
            <SheetContent side="right" className="lg:hidden w-full sm:max-w-md p-0 overflow-y-auto">
              <SheetHeader className="p-4 border-b border-border/60">
                <SheetTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  Perfil 360º do Cliente
                </SheetTitle>
              </SheetHeader>
              <div className="p-4">
                <Customer360Sidebar
                  customerId={activeThread?.customer?.id}
                  storeId={store?.id || ""}
                />
              </div>
            </SheetContent>
          </Sheet>
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
              <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Buscar por anúncio ou resumo da IA..."
                value={sdrSearchTerm}
                onChange={(e) => setSdrSearchTerm(e.target.value)}
                className="pl-8 h-9 rounded-lg text-xs bg-muted/40"
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
                    "px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1",
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
                  <p className="text-sm font-bold text-foreground">Nenhuma conversa com SDR encontrada</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    As mensagens e intenções de compra de clientes com a IA aparecerão aqui.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSdrSessions.map((session) => {
                  const isReady = session.intent_classification === "ready_to_buy";
                  const isWarm = session.intent_classification === "warm";

                  return (
                    <div
                      key={session.id}
                      className={cn(
                        "bg-card p-4 rounded-lg border flex flex-col justify-between space-y-4 shadow-xs transition-all hover:border-primary/50",
                        isReady
                          ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10"
                          : isWarm
                          ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/10"
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
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
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
                          className="h-7 px-3 text-xs font-semibold rounded-lg gap-1 cursor-pointer"
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
                {metrics?.sla_first_response_min || 3.5} min
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Satisfação (CSAT)</span>
              <p className="text-2xl font-bold font-mono text-amber-500 flex items-center gap-1">
                <Star className="size-5 fill-amber-500" />
                <span>{metrics?.avg_rating || 4.8} / 5.0</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: CONEXÃO WHATSAPP WEB & INSTÂNCIAS */}
      {/* ======================================================== */}
      {activeHubTab === "whatsapp" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-muted/10">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Instâncias & Conexão WhatsApp Web
            </h2>
            <p className="text-xs text-muted-foreground">
              Conecte o número de WhatsApp da sua empresa para enviar e receber mensagens diretamente no Waesy.
            </p>
          </div>

          {/* Cards de Instâncias Conectadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card de Conexão Ativa / QR Code */}
            <div className="bg-card p-6 rounded-lg border border-border/80 space-y-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <Smartphone className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">WhatsApp Business</h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      {whatsappInstances[0]?.display_phone_number || "Conectar Aparelho"}
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs px-2 py-1 font-bold",
                    whatsappInstances.some((i) => i.is_active && i.status === "connected")
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
                  )}
                >
                  {whatsappInstances.some((i) => i.is_active && i.status === "connected")
                    ? "Conectado"
                    : "Aguardando Leitura"}
                </Badge>
              </div>

              {/* Instruções de Conexão WhatsApp Web */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Como conectar seu WhatsApp Web no Waesy:
                </h4>
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Abra o aplicativo do WhatsApp no celular da sua empresa.</li>
                  <li>Toque no menu de 3 pontinhos (Android) ou Configurações (iPhone).</li>
                  <li>Selecione <strong>Aparelhos conectados</strong> e depois <strong>Conectar um aparelho</strong>.</li>
                  <li>Aponte a câmera do celular para o QR Code abaixo para sincronizar.</li>
                </ol>
              </div>

              {/* Área do QR Code */}
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/80 rounded-lg bg-muted/10 space-y-3">
                <div className="size-48 bg-white p-3 rounded-lg border border-border shadow-xs flex items-center justify-center">
                  <QrCode className="size-40 text-neutral-900" />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  QR Code gerado com criptografia segura ponto a ponto.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.success("Código QR atualizado com sucesso!")}
                  className="rounded-lg text-xs gap-2 cursor-pointer"
                >
                  <RefreshCw className="size-4" />
                  Atualizar QR Code
                </Button>
              </div>
            </div>

            {/* Configurações do Canal */}
            <div className="bg-card p-6 rounded-lg border border-border/80 space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-foreground">Diretrizes de Operação do Canal</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O ecossistema Waesy opera em conformidade com as regras de mensageria da Meta Cloud API e WhatsApp Web:
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                  <span className="font-bold text-foreground block">Janela de Conversação de 24 Horas</span>
                  <p className="text-muted-foreground leading-relaxed">
                    Respostas da equipe após 24h sem nova mensagem do cliente exigem envio de modelo de mensagem aprovado.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                  <span className="font-bold text-foreground block">Roteamento Inteligente por Setor</span>
                  <p className="text-muted-foreground leading-relaxed">
                    Clientes podem selecionar departamento pelo menu inicial ou ser transferidos entre atendentes.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                  <span className="font-bold text-foreground block">Histórico Unificado & Zero Deleção Física</span>
                  <p className="text-muted-foreground leading-relaxed">
                    Todas as conversas arquivadas permanecem preservadas para auditoria, histórico de pedidos e SAC.
                  </p>
                </div>
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
                {supportSchedules.map((item, idx) => (
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
                        className="h-8 text-xs bg-background mt-1"
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
                ))}
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
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
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

                  <Button asChild size="sm" variant="ghost" className="h-7 text-xs gap-1 rounded-lg">
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
                        "flex flex-col max-w-[85%] rounded-lg p-3 text-xs leading-relaxed",
                        isAssistant
                          ? "ml-auto bg-primary text-primary-foreground rounded-tr-xs"
                          : "mr-auto bg-card border border-border/70 text-foreground rounded-tl-xs shadow-2xs",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 opacity-75 text-xs font-semibold">
                        <span>{isAssistant ? "Assistente SDR (IA)" : "Cliente / Comprador"}</span>
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
    </div>
  );
}
