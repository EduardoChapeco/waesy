import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TransferChatThreadModal } from "@/components/chat/TransferChatThreadModal";
import { QuickAnswersManagerModal } from "@/components/chat/QuickAnswersManagerModal";
import { ScheduleWhatsAppMessageModal } from "@/components/chat/ScheduleWhatsAppMessageModal";
import { listStoreQuickAnswers } from "@/services/chat-operations.functions";
import { listTeamMembers } from "@/services/admin-team.functions";
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
import {
  listIntranetChannels,
  createIntranetChannel,
  sendIntranetMessage,
  toggleIntranetMilestone,
} from "@/services/intranet.functions";
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
  CalendarClock,
  ArrowRightLeft,
  Zap,
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
} from "lucide-react";
import { ArtifactInteractiveTable } from "@/components/chat/artifacts/ArtifactInteractiveTable";
import {
  ChatQuickComposerModals,
  type StructuredDispatchPayload,
} from "@/components/chat/ChatQuickComposerModals";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/workspace/atendimento/")({
  head: () => ({ meta: [{ title: "Atendimento Omnichannel & WhatsApp" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    threadId: typeof search.threadId === "string" ? search.threadId : undefined,
    search: typeof search.search === "string" ? search.search : undefined,
  }),
  loader: async () => {
    try {
      const [res, store, sdrData, instances, quickReplies] = await Promise.all([
        listChatThreads().catch(() => null),
        getStoreSettings().catch(() => null),
        listSdrChatSessions().catch(() => ({
          sessions: [],
          metrics: { total: 0, readyToBuy: 0, warm: 0, curious: 0 },
        })),
        listWorkspaceWhatsAppInstances().catch(() => []),
        listChatQuickReplies().catch(() => [] as QuickReplyItem[]),
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
  } = (Route.useLoaderData?.() as any) || {};

  const searchParams = Route.useSearch?.() || {};
  const semantics = useMemo(() => getNicheSemantics(store), [store]);
  const departmentLabels = semantics.departmentLabels || DEPARTMENT_LABELS;

  // Modais de Operações Avançadas (Whaticket Toolkit)
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [quickAnswersModalOpen, setQuickAnswersModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

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

  const [intranetChannels, setIntranetChannels] = useState<
    Array<{
      id: string;
      title: string;
      department: "Executivo" | "Comercial" | "Marketing" | "Operações" | "Financeiro" | "Suporte";
      scope: "public" | "private";
      creator: string;
      updatedAt: string;
      membersCount: number;
      milestones: Array<{ id: string; label: string; time: string; done: boolean; detail: string }>;
      spreadsheet?: {
        title: string;
        rowsCount: number;
        colsCount: number;
        headers: string[];
        colTypes: string[];
        rows: (string | number)[][];
      };
      messages: Array<{
        id: string;
        author: string;
        role: string;
        time: string;
        text: string;
        payload?: any;
      }>;
    }>
  >([
    {
      id: "ch-exec-q3",
      title: "Análise de Pedidos & Desempenho Regional",
      department: "Executivo",
      scope: "private",
      creator: "Diretoria",
      updatedAt: "14:20",
      membersCount: 6,
      milestones: [
        {
          id: "ms-1",
          label: "Consolidação das tabelas de pedidos, itens e avaliações da operação",
          time: "14:12",
          done: true,
          detail: "3 tabelas cruzadas • 100% reconciliado",
        },
        {
          id: "ms-2",
          label: "Cálculo da participação de receita por linha de produtos e entregas",
          time: "14:15",
          done: true,
          detail: "Margem líquida auditada por centro de custo",
        },
        {
          id: "ms-3",
          label: "Publicação da planilha interativa para revisão dos gestores",
          time: "14:18",
          done: true,
          detail: "Arquivo CSV liberado para download e filtro",
        },
      ],
      spreadsheet: {
        title: "Desempenho_Categorias_Regional.csv",
        rowsCount: 6,
        colsCount: 5,
        headers: ["Categoria", "Pedidos", "Receita (R$)", "Ticket Médio", "Participação (%)"],
        colTypes: ["abc", "123", "123", "123", "123"],
        rows: [
          ["Cama, Mesa & Banho", 142, 28400, 200, "24.5%"],
          ["Beleza & Saúde", 198, 23760, 120, "20.5%"],
          ["Esporte & Lazer", 115, 19550, 170, "16.9%"],
          ["Informática & Acessórios", 84, 18480, 220, "15.9%"],
          ["Utilidades Domésticas", 160, 14400, 90, "12.4%"],
          ["Alimentos & Bebidas", 210, 11340, 54, "9.8%"],
        ],
      },
      messages: [
        {
          id: "im-1",
          author: "Carlos Mendes",
          role: "Diretor de Operações",
          time: "14:10",
          text: "Equipe, precisamos consolidar os indicadores das categorias campeãs de venda e logística da semana para o fechamento mensal.",
        },
        {
          id: "im-2",
          author: "Helena Costa",
          role: "Líder Comercial",
          time: "14:20",
          text: "Planilha consolidada anexada na Linha do Tempo acima! Já separei também o formulário secreto de votação de metas para os coordenadores.",
        },
      ],
    },
    {
      id: "ch-com-metas",
      title: "Campanha Relâmpago & Vitrines da Semana",
      department: "Comercial",
      scope: "public",
      creator: "Helena Costa",
      updatedAt: "11:45",
      membersCount: 12,
      milestones: [
        {
          id: "ms-c1",
          label: "Seleção de ofertas âncora com estoque validado",
          time: "10:30",
          done: true,
          detail: "18 SKUs aprovados",
        },
        {
          id: "ms-c2",
          label: "Ativação de disparo segmentado e cupons no chat",
          time: "11:40",
          done: true,
          detail: "Conversão inicial de 14.2%",
        },
      ],
      messages: [
        {
          id: "im-c1",
          author: "Helena Costa",
          role: "Líder Comercial",
          time: "11:45",
          text: "Lembrem de utilizar o envio de carrinho direto no chat para fechar pedidos em 1 clique com código de retirada.",
        },
      ],
    },
    {
      id: "ch-ops-frota",
      title: "Torre de Controle Logística & MotoLink",
      department: "Operações",
      scope: "public",
      creator: "Roberto Alves",
      updatedAt: "09:30",
      membersCount: 9,
      milestones: [
        {
          id: "ms-o1",
          label: "Conferência de códigos de entrega (Pickup Code) no balcão",
          time: "09:00",
          done: true,
          detail: "Zero divergências no turno da manhã",
        },
      ],
      messages: [
        {
          id: "im-o1",
          author: "Roberto Alves",
          role: "Coord. Logística",
          time: "09:30",
          text: "Todos os pedidos despachados já exibem o mini-mapa ao vivo e código de 4 dígitos para o cliente.",
        },
      ],
    },
    {
      id: "ch-fin-dre",
      title: "Conciliação PIX & Repasses Semanais",
      department: "Financeiro",
      scope: "private",
      creator: "Fernanda Lima",
      updatedAt: "Ontem",
      membersCount: 4,
      milestones: [
        {
          id: "ms-f1",
          label: "Fechamento de liquidação instantânea PIX no chat",
          time: "Ontem",
          done: true,
          detail: "100% conciliado com extrato bancário",
        },
      ],
      messages: [
        {
          id: "im-f1",
          author: "Fernanda Lima",
          role: "Controller",
          time: "Ontem",
          text: "Relatório de conciliação validado sem pendências.",
        },
      ],
    },
  ]);

  const [activeIntranetChannelId, setActiveIntranetChannelId] = useState<string>("ch-exec-q3");
  const activeIntranetChannel = useMemo(
    () =>
      intranetChannels.find((c) => c.id === activeIntranetChannelId) ||
      intranetChannels[0],
    [intranetChannels, activeIntranetChannelId],
  );

  // Status de presença do atendente
  const [agentPresence, setAgentPresence] = useState<"online" | "busy" | "away">("online");

  // Filtro de status da lista (all: ativas | open: novas | archived: arquivadas)
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "waiting" | "archived">("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState((searchParams as any).search || "");

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
    (searchParams as any).threadId || (initialThreads && initialThreads.length > 0 ? initialThreads[0].id : null),
  );

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
  const [showCustomer360, setShowCustomer360] = useState(false);
  const [isWhisperMode, setIsWhisperMode] = useState(false);
  const [quickReplies] = useState<QuickReplyItem[]>(initialQuickReplies || [
    { id: "qr_ola", shortcut: "ola", title: "Saudação de Boas-Vindas", content: "Olá {{nome}}! Seja bem-vindo ao atendimento oficial da {{loja}}. Como podemos ajudar?", category: "geral" },
    { id: "qr_pix", shortcut: "pix", title: "Chave PIX", content: "Nossa chave PIX oficial é gerada diretamente no seu pedido com confirmação automática em segundos!", category: "financeiro" },
    { id: "qr_horarios", shortcut: "horarios", title: "Horários de Expediente", content: "Atendemos de Segunda a Sexta das 08h às 18h e Sábados das 08h às 12h.", category: "suporte" },
    { id: "qr_rastreio", shortcut: "rastreio", title: "Rastreio do Pedido", content: "Seu pedido está em trânsito e você pode acompanhar pelo link de rastreio oficial.", category: "logistica" },
    { id: "qr_cardapio", shortcut: "cardapio", title: "Cardápio e Catálogo", content: "Confira todos os itens do nosso cardápio atualizado no link da vitrine!", category: "vendas" }
  ]);

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
    listChatThreads({ data: { status: (statusFilter === "waiting" ? "open" : statusFilter) as any } })
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
            listChatThreads({ data: { status: (statusFilter === "waiting" ? "open" : statusFilter) as any } }).then((res) => {
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
    <div className="flex flex-col h-full flex-1 overflow-hidden bg-background">
      {/* CABEÇALHO DO HUB DE ATENDIMENTO */}
      <header className={cn(
        "shrink-0 border-b border-border/80 bg-card/90 px-4 py-3 flex-col md:flex-row md:items-center justify-between gap-3",
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
                "px-3 py-2 h-11 min-h-11 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
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
                "px-3 py-2 h-11 min-h-11 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
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
                "px-3 py-2 h-11 min-h-11 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
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
              "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
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

          {/* Aba 2: Intranet Corporativa (Canais estilo Slack + Linha do Tempo + Planilhas) */}
          <button
            type="button"
            onClick={() => setActiveHubTab("intranet")}
            className={cn(
              "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              activeHubTab === "intranet"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/50",
            )}
          >
            <Hash className="size-4" />
            <span>Intranet</span>
            <Badge variant="secondary" className="text-xs h-4 px-2 font-mono">
              {intranetChannels.length}
            </Badge>
          </button>

          {/* Aba 2: Leads SDR / IA */}
          <button
            type="button"
            onClick={() => setActiveHubTab("sdr")}
            className={cn(
              "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
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
              "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
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
              "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
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
              "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
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
                  className="pl-9 h-11 min-h-11 rounded-lg text-xs bg-muted/40"
                />
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
                    <SelectTrigger className="h-8 text-xs rounded-lg border-border/60">
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
                        "w-full p-4 text-left flex items-start gap-3 transition-colors duration-150 cursor-pointer border-l-4 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
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
                    {/* Tags Semânticas Coloridas (Whaticket / CRM Parity) */}
                    <div className="pt-1">
                      <ThreadTagsPicker
                        threadId={activeThread.id}
                        tags={activeThread.tags || []}
                        onTagsChange={(newTags) => {
                          setThreads((prev) =>
                            prev.map((t) => (t.id === activeThread.id ? { ...t, tags: newTags } : t))
                          );
                        }}
                      />
                    </div>

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

                  {/* Dossiê no CRM */}
                  {activeThread.customer?.id && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-11 rounded-lg text-xs font-semibold gap-2 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      title="Abrir dossiê no CRM"
                    >
                      <Link to="/workspace/clientes/$id" params={{ id: activeThread.customer.id }}>
                        <Building2 className="size-4 text-primary" />
                        <span className="hidden xl:inline">CRM</span>
                      </Link>
                    </Button>
                  )}

                  {/* Chamados de Suporte & SAC */}
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-11 rounded-lg text-xs font-semibold gap-2 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    title="Abrir central de chamados e suporte"
                  >
                    <Link to="/workspace/suporte">
                      <HelpCircle className="size-4 text-sky-500" />
                      <span className="hidden xl:inline">Chamados</span>
                    </Link>
                  </Button>

                  {/* Transferir Atendimento (Whaticket Hand-off) */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTransferModalOpen(true)}
                    className="h-11 rounded-lg text-xs font-semibold gap-2 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    title="Transferir para outro setor ou atendente com nota de contexto"
                  >
                    <ArrowRightLeft className="size-4 text-primary" />
                    <span className="hidden sm:inline">Transferir</span>
                  </Button>

                  {/* Agendar Mensagem de Follow-up WhatsApp */}
                  {activeThread.channel === "whatsapp" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setScheduleModalOpen(true)}
                      className="h-11 rounded-lg text-xs font-semibold gap-2 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      title="Agendar envio de mensagem futura"
                    >
                      <CalendarClock className="size-4 text-amber-500" />
                      <span className="hidden sm:inline">Agendar</span>
                    </Button>
                  )}

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

                  {/* Toggle Linha do Tempo na Conversa */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLiveTimeline((prev) => !prev)}
                    className={cn(
                      "h-11 min-h-11 text-xs font-semibold rounded-lg px-3 gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                      showLiveTimeline ? "bg-primary/15 text-primary border-primary/40 font-bold" : "",
                    )}
                    title="Exibir Linha do Tempo de eventos, pedidos e planilhas do cliente"
                  >
                    <GitBranch className="size-4 text-primary" />
                    <span className="hidden sm:inline">Linha do Tempo</span>
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

              {/* Painel Recolhível: Linha do Tempo Cronológica (Pedidos, Chamados e Planilhas) */}
              {showLiveTimeline && (
                <div className="bg-card/95 border-b border-border/80 p-4 space-y-3 animate-in fade-in duration-150">
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
                            "max-w-md sm:max-w-md rounded-lg p-3 text-xs leading-relaxed shadow-xs",
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
                
                {/* Autocomplete de Respostas Rápidas / Macros com gatilho "/" */}
                {text.startsWith("/") && (
                  <QuickRepliesMenu
                    searchTerm={text}
                    quickReplies={quickReplies}
                    customerName={activeThread.customer?.full_name}
                    storeName={store?.name}
                    onSelectReply={(expanded) => {
                      setText(expanded);
                    }}
                    onClose={() => {}}
                  />
                )}

                {/* Banner Modo Nota Interna (Whisper) com Design Âmbar Whaticket/Chatwoot */}
                {isWhisperMode && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-950 dark:text-amber-100 text-xs font-semibold animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Nota Interna Privada: Visível apenas para a equipe (NÃO é enviada ao WhatsApp).</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsWhisperMode(false)}
                      className="h-11 min-h-11 px-3 text-xs text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Voltar ao Chat
                    </Button>
                  </div>
                )}

                {/* Trilho de Respostas Rápidas / Macros */}
                <div
                  role="tablist"
                  aria-label="Atalhos Rápidos"
                  className="flex items-center gap-2 overflow-x-auto tab-list no-scrollbar"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickAnswersModalOpen(true)}
                    className="h-11 min-h-11 px-3 rounded-md text-xs font-semibold gap-2 shrink-0 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 cursor-pointer"
                    title="Gerenciar respostas rápidas personalizadas"
                  >
                    <Zap className="size-3.5" />
                    <span>Macros</span>
                  </Button>

                  {(storeMacros.length > 0
                    ? storeMacros.map((m: any) => ({ cmd: m.shortcut, text: m.message, label: m.title }))
                    : [
                        { cmd: "ola", text: "Olá! Seja muito bem-vindo ao atendimento da nossa empresa. Como podemos te ajudar?", label: "Saudação" },
                        { cmd: "pix", text: "Nossa chave PIX oficial é gerada e confirmada diretamente no seu pedido. O comprovante é validado automaticamente!", label: "Chave PIX" },
                        { cmd: "horarios", text: "Nosso horário de atendimento é de Segunda a Sexta das 08h às 18h e Sábados das 08h às 12h.", label: "Horários" },
                        { cmd: "rastreio", text: "Seu pedido está em processamento logístico e você pode acompanhar pelo link de rastreio acima.", label: "Rastreio" },
                      ]
                  ).map((macro: any) => (
                    <button
                      key={macro.cmd}
                      type="button"
                      onClick={() => setText(macro.text)}
                      className="h-11 min-h-11 px-3 py-2 rounded-md text-xs font-mono font-medium bg-muted/50 hover:bg-muted border border-border/60 text-muted-foreground hover:text-foreground shrink-0 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
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
                      title="Abrir ferramentas rápidas: Formulário, Evento, Planilha, Sticker"
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
                        isWhisperMode ? "bg-amber-600 hover:bg-amber-700 text-amber-50" : "",
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
                  className="h-11 min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
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
      {/* ABA 2: INTRANET CORPORATIVA (SLACK CHANNELS + TIMELINE + PLANILHAS) */}
      {/* ======================================================== */}
      {activeHubTab === "intranet" && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-background">
          {/* COLUNA ESQUERDA: Sidebar Segmentada por Departamento (Estilo Slack / Corporativo) */}
          <aside className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-border/80 bg-card/40 flex flex-col shrink-0">
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
                  <option value="Diretoria">Diretoria</option>
                  <option value="Helena Costa">Helena Costa</option>
                  <option value="Roberto Alves">Roberto Alves</option>
                  <option value="Fernanda Lima">Fernanda Lima</option>
                </select>
              </div>
            </div>

            {/* Grupos Colapsáveis por Departamento */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
              {(
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
                                : "bg-card/60 border-border/50 hover:bg-muted/40 text-foreground",
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
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
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
              })}
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

                  <div className="relative pl-7 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-500/40">
                    {activeIntranetChannel.milestones.map((ms) => (
                      <div key={ms.id} className="relative flex items-start justify-between gap-3 text-xs">
                        <span className=" -left-7 top-0.5 size-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center justify-center shrink-0">
                          <Check className="size-3" />
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-semibold text-foreground">{ms.label}</p>
                          <p className="text-muted-foreground">{ms.detail}</p>
                        </div>
                        <span className="font-mono text-2xs text-muted-foreground shrink-0">
                          {ms.time}
                        </span>
                      </div>
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
                          {activeIntranetChannel.spreadsheet.headers.map((h, idx) => (
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
                  {activeIntranetChannel.messages.map((m) => (
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
                    <Sparkles className="size-3.5 text-amber-500" />
                    <span>Stickers</span>
                  </Button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!intranetComposerText.trim()) return;
                    const txt = intranetComposerText.trim();
                    setIntranetComposerText("");
                    if (activeIntranetChannel?.id && !activeIntranetChannel.id.startsWith("ch-")) {
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
                        ch.id === activeIntranetChannel.id
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
                        "bg-card p-4 rounded-lg border flex flex-col justify-between space-y-4 shadow-xs transition-colors duration-150 hover:border-primary/50",
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
                <div className="size-48 bg-card p-3 rounded-lg border border-border shadow-xs flex items-center justify-center">
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

      {/* MODAIS DE OPERAÇÕES AVANÇADAS WHATICKET / OMNICHANNEL */}
      {activeThread && (
        <TransferChatThreadModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          threadId={activeThread.id}
          currentDepartment={activeThread.department || "geral"}
          departmentLabels={{ geral: "Geral", vendas: "Vendas", suporte: "Suporte", financeiro: "Financeiro" }}
          teamMembers={teamMembers}
          onSuccess={() => {
            listChatThreads().then((res) => {
              if (res?.threads) setThreads(res.threads);
            }).catch(() => {});
          }}
        />
      )}
      <QuickAnswersManagerModal
        isOpen={quickAnswersModalOpen}
        onClose={() => setQuickAnswersModalOpen(false)}
      />
      {activeThread && (
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
          if (!activeIntranetChannel) return;
          if (activeIntranetChannel.id && !activeIntranetChannel.id.startsWith("ch-")) {
            sendIntranetMessage({
              data: {
                channelId: activeIntranetChannel.id,
                content: data.message,
                authorRole: "Gestão",
                artifactType: data.type,
                artifactPayload: data.payload,
              },
            }).catch((err) => console.warn("[intranet] Erro ao persistir mensagem estruturada:", err));
          }
          setIntranetChannels((prev) =>
            prev.map((ch) =>
              ch.id === activeIntranetChannel.id
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
              onClick={() => {
                if (!newChannelTitle.trim()) {
                  toast.error("Informe o título do canal.");
                  return;
                }
                const newId = `ch-${Date.now()}`;
                if (store?.id) {
                  createIntranetChannel({
                    data: {
                      storeId: store.id,
                      title: newChannelTitle.trim(),
                      department: newChannelDept,
                      scope: newChannelScope,
                    },
                  }).then((created) => {
                    if (created?.id) {
                      setActiveIntranetChannelId(created.id);
                    }
                  }).catch((err) => console.warn("[intranet] Erro ao criar canal:", err));
                }
                setIntranetChannels((prev) => [
                  {
                    id: newId,
                    title: newChannelTitle.trim(),
                    department: newChannelDept as any,
                    scope: newChannelScope,
                    creator: "Você",
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
                  },
                  ...prev,
                ]);
                setActiveIntranetChannelId(newId);
                setNewChannelTitle("");
                setNewChannelModalOpen(false);
                toast.success("Canal criado na Intranet!");
              }}
              className="h-11 min-h-11 px-5 text-xs font-bold cursor-pointer"
            >
              Criar Canal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
