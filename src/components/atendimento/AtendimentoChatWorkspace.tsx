import { cn } from "@/lib/utils";
import { Link as RouterLink } from "@tanstack/react-router";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { TransferChatThreadModal } from "@/components/chat/TransferChatThreadModal";
import { QuickAnswersManagerModal } from "@/components/chat/QuickAnswersManagerModal";
import { ScheduleWhatsAppMessageModal } from "@/components/chat/ScheduleWhatsAppMessageModal";
import { WhatsAppVoiceStudioModal } from "@/components/chat/WhatsAppVoiceStudioModal";
import { transcribeWhatsAppAudioMessage } from "@/services/whatsapp-voice-ai.functions";
import { listStoreQuickAnswers, interpolateTemplateVariables } from "@/services/chat-operations.functions";
import { listTeamMembers, toggleAgentPresence } from "@/services/admin-team.functions";
import {
  listChatThreads,
  getChatMessages,
  sendChatMessage,
  assignChatThread,
  updateTicketStatus,
  archiveChatThread,
  clearChatThreadMessagesLocal,
  deleteChatThreadLocal,
  deleteChatContactPermanently,
  requestChatContactDeletion,
  reviewChatContactDeletionRequest,
  listChatContactDeletionRequests,
  generateTourismAiCopilotReply,
  generateSmartContextualAiReply,
  detectStaffFollowUpPromise,
  toggleChatThreadStaffVisibility,
  getWhatsAppMediaBase64,
} from "@/services/chat.functions";
import {
  createIntranetChannel,
  sendIntranetMessage,
  toggleIntranetMilestone,
  getStoreIntranetSalesSpreadsheet,
} from "@/services/intranet.functions";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { getRealtimeChannel } from "@/services/realtime-channel";
import { getClientActiveTenant } from "@/lib/context-auth";
import { getBrowserClient } from "@/lib/supabase";
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
  ShieldAlert,
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
  Download,
  Image as ImageIcon,
  Film,
  Volume2,
  Eye,
  Mic,
  Play,
  Pause,
  Maximize2,
  Minimize2,
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
  listWorkspaceWhatsAppInstances,
  syncWhatsAppChatsFromEvolution,
  type WhatsAppChannelInstanceDTO,
} from "@/services/whatsapp-channel-instances.functions";
import { Link } from "@tanstack/react-router";
import { TransferTicketDialog } from "@/components/chat/TransferTicketDialog";
import { QuickRepliesMenu, type QuickReplyItem } from "@/components/chat/QuickRepliesMenu";
import { ThreadTagsPicker, resolveTagPillClass } from "@/components/chat/ThreadTagsPicker";
import { listChatQuickReplies, listStoreTagCatalog } from "@/services/chat.functions";
import {
  Tag,
  Hash,
  Users,
  Share2,
  GitBranch,
  FileSpreadsheet,
  ClipboardList,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  AlertCircle,
} from "lucide-react";

function MessageDeliveryStatusIcon({
  status,
  deliveryState,
  errorMessage,
}: {
  status?: string | null;
  deliveryState?: string | null;
  errorMessage?: string | null;
}) {
  if (status === "read") {
    return (
      <span title="Lida pelo destinatário" className="inline-flex items-center">
        <CheckCheck className="size-3.5 text-sky-500 dark:text-sky-400 inline" aria-label="Lida" />
      </span>
    );
  }
  if (status === "delivered") {
    return (
      <span title="Entregue no aparelho" className="inline-flex items-center">
        <CheckCheck className="size-3.5 text-muted-foreground inline" aria-label="Entregue" />
      </span>
    );
  }
  if (status === "failed") {
    const label =
      deliveryState === "dead_letter"
        ? "Falha permanente (Dead-Letter)"
        : deliveryState === "retry_scheduled"
          ? "Falha (Retentativa agendada)"
          : "Falha no envio";
    return (
      <span
        className="inline-flex items-center gap-1 text-destructive font-semibold"
        title={errorMessage || label}
        aria-label={label}
      >
        <AlertCircle className="size-3.5 inline shrink-0" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === "sent" || status === "accepted") {
    return (
      <span title="Enviada ao gateway" className="inline-flex items-center">
        <Check className="size-3 text-muted-foreground inline" aria-label="Enviada" />
      </span>
    );
  }
  return (
    <span title="Aguardando confirmação do gateway" className="inline-flex items-center">
      <Clock className="size-3 text-muted-foreground/70 inline" aria-label="Pendente" />
    </span>
  );
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

export type AtendimentoChatWorkspaceProps = {
  initialThreads: any[];
  metrics: any;
  isSupervisor: boolean;
  store: any;
  sdrSessions: SdrChatSessionDTO[];
  sdrMetrics: { total: number; readyToBuy: number; warm: number; curious: number };
  whatsappInstances: WhatsAppChannelInstanceDTO[];
  quickReplies: QuickReplyItem[];
  intranetChannels: any[];
  searchParams?: { threadId?: string; search?: string; channelInstanceId?: string; storeId?: string };
  initialPresence?: 'online' | 'busy' | 'away' | 'offline';
  onSelectChannelInstance?: (channelInstanceId?: string) => void;
};

const DEPARTMENT_LABELS: Record<string, string> = {
  geral: "Geral",
  vendas: "Vendas / Comercial",
  suporte: "Suporte / SAC",
  financeiro: "Financeiro / Pix",
  cozinha_estoque: "Cozinha / Estoque",
  logistica: "Logística / Motoboy",
};

export function AtendimentoChatWorkspace({
    initialThreads,
    metrics,
    isSupervisor,
    store,
    sdrSessions: initialSdrSessions,
    sdrMetrics: initialSdrMetrics,
    whatsappInstances: initialInstances,
    quickReplies: initialQuickReplies,
    intranetChannels: initialIntranetChannels,
  searchParams = {},
  initialPresence = 'online',
  onSelectChannelInstance,
}: AtendimentoChatWorkspaceProps) {

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

  // Tabs do Hub Enxuto de Chat Ao Vivo
  const [activeHubTab, setActiveHubTab] = useState<"live" | "intranet" | "sdr">("live");
  const [showLiveTimeline, setShowLiveTimeline] = useState(false);
  const [liveComposerTrayOpen, setLiveComposerTrayOpen] = useState(false);
  const [liveModalOverride, setLiveModalOverride] = useState<
    "form" | "event" | "sticker" | "spreadsheet" | "image_card" | null
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

  // Status de presença do atendente (persistido em workspace_members)
  const [agentPresence, setAgentPresence] = useState<"online" | "busy" | "away" | "offline">(initialPresence);

  // Filtro de canal WhatsApp + status + setor + tags/pastas
  const [channelFilter, setChannelFilter] = useState<string>(
    (searchParams as any)?.channelInstanceId || "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "direct" | "groups" | "open" | "waiting" | "archived">("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState((searchParams as any).search || "");

  const { data: storeTagCatalog } = useQuery({
    queryKey: ["store-tag-catalog", store?.id || "active"],
    queryFn: () => listStoreTagCatalog({ data: { storeId: store?.id || undefined } }).catch(() => null),
    staleTime: 30000,
  });

  // Instâncias de WhatsApp
  const [whatsappInstances, setWhatsappInstances] = useState<WhatsAppChannelInstanceDTO[]>(
    initialInstances || [],
  );
  const [isSyncingWhatsApp, setIsSyncingWhatsApp] = useState(false);

  const handleChangePresence = async (nextPresence: "online" | "busy" | "away" | "offline") => {
    const prev = agentPresence;
    setAgentPresence(nextPresence);
    try {
      await toggleAgentPresence({
        data: {
          storeId: store?.id || undefined,
          presence: nextPresence,
        },
      });
    } catch (err: any) {
      setAgentPresence(prev);
      toast.error(err?.message || "Não foi possível atualizar sua presença.");
    }
  };

  const handleChangeChannelFilter = async (nextChannelId: string) => {
    setChannelFilter(nextChannelId);
    const resolvedChannel = nextChannelId === "all" ? undefined : nextChannelId;
    onSelectChannelInstance?.(resolvedChannel);
    try {
      const threadsRes = await listChatThreads({
        data: {
          store_id: store?.id,
          channel_instance_id: resolvedChannel,
        },
      });
      if (threadsRes?.threads) {
        setThreads(threadsRes.threads);
      }
    } catch {
      // fallback silencioso mantém filtro local
    }
  };

  const handleSyncWhatsApp = async () => {
    setIsSyncingWhatsApp(true);
    try {
      const res = await syncWhatsAppChatsFromEvolution({ data: { storeId: store?.id } });
      const threadsRes = await listChatThreads({
        data: {
          store_id: store?.id,
          channel_instance_id: channelFilter === "all" ? undefined : channelFilter,
        },
      });
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

  const [deleteContactModalOpen, setDeleteContactModalOpen] = useState(false);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  const handleDeleteContactPermanently = async () => {
    if (!activeThread?.id || !store?.id) return;
    setIsDeletingContact(true);
    try {
      await deleteChatContactPermanently({
        data: { threadId: activeThread.id, storeId: store.id, deleteFromCrm: true },
      });
      setMessages([]);
      setDeleteContactModalOpen(false);
      const remainingThreads = threads.filter((t) => t.id !== activeThread.id);
      setThreads(remainingThreads);
      setActiveThreadId(remainingThreads.length > 0 ? remainingThreads[0].id : null);
      toast.success("Contato e histórico excluídos definitivamente do sistema.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir contato permanentemente.");
    } finally {
      setIsDeletingContact(false);
    }
  };

  const [supervisorRequestsModalOpen, setSupervisorRequestsModalOpen] = useState(false);
  const [requestDeletionModalOpen, setRequestDeletionModalOpen] = useState(false);
  const [requestDeletionReason, setRequestDeletionReason] = useState("");
  const [isSubmittingDeletionRequest, setIsSubmittingDeletionRequest] = useState(false);
  const [pendingDeletionRequests, setPendingDeletionRequests] = useState<any[]>([]);
  const [isLoadingDeletionRequests, setIsLoadingDeletionRequests] = useState(false);
  const [isReviewingRequest, setIsReviewingRequest] = useState<string | null>(null);
  const [isGeneratingAiCopilot, setIsGeneratingAiCopilot] = useState(false);

  const handleRequestContactDeletion = async () => {
    if (!activeThread?.id || !store?.id) return;
    if (!requestDeletionReason.trim()) {
      toast.error("Informe a justificativa para a solicitação.");
      return;
    }
    setIsSubmittingDeletionRequest(true);
    try {
      await requestChatContactDeletion({
        data: {
          threadId: activeThread.id,
          storeId: store.id,
          reason: requestDeletionReason.trim(),
        },
      });
      toast.success("Solicitação enviada ao supervisor com sucesso.");
      setRequestDeletionModalOpen(false);
      setRequestDeletionReason("");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao enviar solicitação.");
    } finally {
      setIsSubmittingDeletionRequest(false);
    }
  };

  const loadPendingDeletionRequests = async () => {
    if (!store?.id || !isSupervisor) return;
    setIsLoadingDeletionRequests(true);
    try {
      const res = await listChatContactDeletionRequests({
        data: { storeId: store.id, status: "pending" },
      });
      setPendingDeletionRequests(res?.requests || []);
    } catch {
      // noop defensivo
    } finally {
      setIsLoadingDeletionRequests(false);
    }
  };

  const handleReviewDeletionRequest = async (requestId: string, approved: boolean) => {
    setIsReviewingRequest(requestId);
    try {
      await reviewChatContactDeletionRequest({
        data: { requestId, approved, deleteFromCrm: true },
      });
      toast.success(approved ? "Exclusão autorizada e executada com sucesso." : "Solicitação de exclusão recusada.");
      setPendingDeletionRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (approved) {
        reloadThreads();
      }
    } catch (err: any) {
      toast.error(err?.message || "Falha ao processar solicitação.");
    } finally {
      setIsReviewingRequest(null);
    }
  };

  const handleGenerateTourismCopilot = async (customQuery?: string) => {
    if (!activeThread?.id) return;
    setIsGeneratingAiCopilot(true);
    try {
      const res = await generateTourismAiCopilotReply({
        data: {
          threadId: activeThread.id,
          storeId: store?.id,
          query: customQuery || text || undefined,
        },
      });
      if (res?.suggestedReply) {
        setText(res.suggestedReply);
        toast.success("Sugestão IA carregada com pacotes reais e regras da ANAC!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao consultar IA de turismo.");
    } finally {
      setIsGeneratingAiCopilot(false);
    }
  };

  const [aiAudioPreviewUrl, setAiAudioPreviewUrl] = useState<string | null>(null);
  const [isGeneratingSmartReply, setIsGeneratingSmartReply] = useState(false);
  const [isGeneratingSmartAudio, setIsGeneratingSmartAudio] = useState(false);
  const [isPlayingSmartAudio, setIsPlayingSmartAudio] = useState(false);
  const aiAudioElementRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerateSmartReply = async (isAudio = false, customInstruction?: string) => {
    if (!activeThread?.id) return;
    if (isAudio) setIsGeneratingSmartAudio(true);
    else setIsGeneratingSmartReply(true);

    try {
      const res = await generateSmartContextualAiReply({
        data: {
          threadId: activeThread.id,
          storeId: store?.id,
          customInstruction: customInstruction || text.trim() || undefined,
          generateAudioPreview: isAudio,
        },
      });

      if (res?.suggestedReply) {
        setText(res.suggestedReply);
        if (res.audioPreviewUrl) {
          setAiAudioPreviewUrl(res.audioPreviewUrl);
          toast.success("Áudio sintetizado com sucesso! Ouça antes de enviar ao cliente.");
        } else {
          toast.success("Resposta gerada pela IA com base no histórico do cliente!");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar resposta com IA.");
    } finally {
      setIsGeneratingSmartReply(false);
      setIsGeneratingSmartAudio(false);
    }
  };

  const handleSendAiAudio = async () => {
    if (!aiAudioPreviewUrl || !activeThread?.id || isSending) return;
    setIsSending(true);
    try {
      await sendChatMessage({
        data: {
          threadId: activeThread.id,
          message: "[Áudio]",
          message_type: "audio",
          attachments: [aiAudioPreviewUrl],
          is_internal: false,
          payload: {
            is_ptt: true,
            channel: "whatsapp",
            origin: "waesy_ai_voice",
          },
        },
      });
      setAiAudioPreviewUrl(null);
      setText("");
      toast.success("Nota de voz enviada no WhatsApp!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar áudio.");
    } finally {
      setIsSending(false);
    }
  };

  const togglePlaySmartAudio = () => {
    if (!aiAudioPreviewUrl) return;
    const current = aiAudioElementRef.current;
    if (!current || current.dataset.audioSrc !== aiAudioPreviewUrl) {
      if (current) {
        current.pause();
      }
      const nextAudio = new Audio(aiAudioPreviewUrl);
      nextAudio.dataset.audioSrc = aiAudioPreviewUrl;
      nextAudio.onended = () => setIsPlayingSmartAudio(false);
      aiAudioElementRef.current = nextAudio;
      setIsPlayingSmartAudio(false);
      nextAudio.play().then(() => {
        setIsPlayingSmartAudio(true);
      }).catch(() => setIsPlayingSmartAudio(false));
      return;
    }

    if (isPlayingSmartAudio) {
      current.pause();
      setIsPlayingSmartAudio(false);
    } else {
      current.play().then(() => {
        setIsPlayingSmartAudio(true);
      }).catch(() => setIsPlayingSmartAudio(false));
    }
  };

  const handleToggleThreadStaffVisibility = async () => {
    if (!activeThread?.id || !store?.id) return;
    const isCurrentlyHidden = Boolean(activeThread.metadata?.hidden_from_staff);
    const nextHiddenState = !isCurrentlyHidden;
    setIsTogglingVisibility(true);
    try {
      await toggleChatThreadStaffVisibility({
        data: { threadId: activeThread.id, storeId: store.id, hiddenFromStaff: nextHiddenState },
      });
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThread.id
            ? {
                ...t,
                metadata: {
                  ...(t.metadata || {}),
                  hidden_from_staff: nextHiddenState,
                },
              }
            : t,
        ),
      );
      toast.success(
        nextHiddenState
          ? "Conversa marcada como confidencial (oculta para atendentes comuns)."
          : "Conversa visível para a equipe do setor.",
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alternar visibilidade da conversa.");
    } finally {
      setIsTogglingVisibility(false);
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

  const [messages, setMessages] = useState<any[]>([]);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
        if (res.threads.length === 0 && threadsRef.current.length > 0 && (sf === "all" || sf === "direct" || sf === "open")) {
          console.warn("[atendimento] listChatThreads retornou 0 threads inesperadamente; mantendo lista ativa em cache.");
          return;
        }
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
        if (res.messages.length === 0 && messagesRef.current.length > 0) {
          console.warn("[atendimento] getChatMessages retornou 0 mensagens inesperadamente; mantendo mensagens ativas em cache.");
          return;
        }
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
  const promiseDetection = useMemo(() => {
    return detectStaffFollowUpPromise(messages);
  }, [messages]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [fetchingMediaMap, setFetchingMediaMap] = useState<Record<string, boolean>>({});
  const [voiceStudioModalOpen, setVoiceStudioModalOpen] = useState(false);
  const [transcribingAudioMap, setTranscribingAudioMap] = useState<Record<string, boolean>>({});
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

  const handleFetchMedia = async (msg: any) => {
    const extId = msg.external_message_id || msg.payload?.external_message_id || msg.payload?.id;
    if (!activeThread?.id || !extId) {
      toast.error("Identificador de mensagem não disponível");
      return;
    }
    setFetchingMediaMap((prev) => ({ ...prev, [msg.id]: true }));
    try {
      const res = await getWhatsAppMediaBase64({
        data: {
          threadId: activeThread.id,
          messageId: msg.id,
          externalMessageId: extId,
        },
      });
      if (res?.base64) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  attachments: [res.base64],
                  payload: {
                    ...(m.payload || {}),
                    media: {
                      ...(m.payload?.media || {}),
                      type: m.message_type || "sticker",
                      url: res.base64,
                      mimetype: res.mimetype,
                    },
                  },
                }
              : m,
          ),
        );
        toast.success("Mídia carregada!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao baixar mídia do WhatsApp");
    } finally {
      setFetchingMediaMap((prev) => ({ ...prev, [msg.id]: false }));
    }
  };

  const handleTranscribeAudio = async (msg: any) => {
    if (!activeThread?.id || !msg.id) return;
    setTranscribingAudioMap((prev) => ({ ...prev, [msg.id]: true }));
    try {
      const res = await transcribeWhatsAppAudioMessage({
        data: {
          threadId: activeThread.id,
          messageId: msg.id,
        },
      });
      if (res?.transcript) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  payload: {
                    ...(m.payload || {}),
                    transcript: res.transcript,
                  },
                }
              : m,
          ),
        );
        toast.success("Áudio transcrito com sucesso!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao transcrever áudio.");
    } finally {
      setTranscribingAudioMap((prev) => ({ ...prev, [msg.id]: false }));
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

  // Cálculo de Disponibilidade e Janela WhatsApp (Meta Cloud API exige template após 24h; canais Web/Evolution operam 24/7)
  const isWhatsAppWindowOpen = useMemo(() => {
    const defaultInstance = whatsappInstances.find((i) => i.is_default) || whatsappInstances[0];
    const isUnofficial = defaultInstance?.connection_mode === "unofficial" || defaultInstance?.provider === "evolution_api" || !defaultInstance;
    if (isUnofficial) return true;

    if (!messages || messages.length === 0) return true;
    const customerMsgs = messages.filter((m) => !m.is_staff_reply && m.created_at);
    if (customerMsgs.length === 0) return true;
    const lastCustomerMsg = customerMsgs[customerMsgs.length - 1];
    const diffHours = (Date.now() - new Date(lastCustomerMsg.created_at).getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }, [messages, whatsappInstances]);

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

  // Subscrição Unificada Supabase Realtime (Zero Duplicidade, Reconexão Resiliente e Catch-Up Automático)
  useEffect(() => {
    const activeTenant = typeof window !== "undefined" ? getClientActiveTenant() : null;
    const effectiveStoreId = store?.id || activeTenant;
    if (!effectiveStoreId) return;
    const rt = getRealtimeChannel(`store-chat-${effectiveStoreId}`);
    if (!rt.channel) return;

    let hadDisconnection = false;
    const runCatchUp = () => {
      reloadThreads();
      if (activeThreadIdRef.current) {
        reloadActiveMessages(activeThreadIdRef.current);
      }
      listWorkspaceWhatsAppInstances({ data: { store_id: effectiveStoreId } })
        .then((list) => setWhatsappInstances(list))
        .catch(() => {});
    };

    rt.channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload: any) => {
          const newMsg = payload.new as any;
          if (!newMsg) return;

          const currentActive = activeThreadIdRef.current;
          const isCurrentActive = newMsg.thread_id === currentActive;
          const isInternalMsg = Boolean(
            newMsg.payload?.is_whisper ||
            newMsg.payload?.is_internal ||
            newMsg.message_type === "internal_note" ||
            (newMsg.message_type === "system_event" && newMsg.payload?.is_whisper)
          );

          if (isCurrentActive) {
            if (newMsg.is_encrypted || (typeof newMsg.message === "string" && newMsg.message.startsWith("waesy-msg:"))) {
              reloadActiveMessages(newMsg.thread_id);
            } else {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id || (newMsg.external_message_id && m.external_message_id === newMsg.external_message_id))) {
                  return prev.map((m) => (m.id === newMsg.id ? { ...m, ...newMsg } : m));
                }
                return [...prev, newMsg];
              });
            }

            if (!newMsg.is_staff_reply) {
              playMessageChime();
            }
          } else if (!newMsg.is_staff_reply) {
            playMessageChime();
          }

          const exists = threadsRef.current.some((t) => t.id === newMsg.thread_id);
          if (exists) {
            setThreads((prev) => {
              const target = prev.find((t) => t.id === newMsg.thread_id);
              if (!target) return prev;
              if (isInternalMsg) {
                return [
                  {
                    ...target,
                    updated_at: newMsg.created_at || new Date().toISOString(),
                  },
                  ...prev.filter((t) => t.id !== newMsg.thread_id),
                ];
              }
              const cleanPreview = (typeof newMsg.message === "string" && !newMsg.message.startsWith("waesy-msg:"))
                ? newMsg.message
                : (newMsg.message_type === "image" ? "[Imagem]"
                  : newMsg.message_type === "video" ? "[Vídeo]"
                  : newMsg.message_type === "audio" ? "[Áudio]"
                  : newMsg.message_type === "document" ? "[Documento]"
                  : newMsg.message_type === "sticker" ? "[Figurinha]"
                  : (target.last_message || "Nova mensagem"));
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
                const mergedPayload = { ...(m.payload || {}), ...(updatedMsg.payload || {}) };
                return {
                  ...m,
                  delivery_status: updatedMsg.delivery_status ?? m.delivery_status,
                  external_message_id: updatedMsg.external_message_id ?? m.external_message_id,
                  sent_at: updatedMsg.sent_at ?? m.sent_at,
                  delivered_at: updatedMsg.delivered_at ?? m.delivered_at,
                  read_at: updatedMsg.read_at ?? m.read_at,
                  failed_at: updatedMsg.failed_at ?? m.failed_at,
                  error_code: updatedMsg.error_code ?? m.error_code,
                  error_message: updatedMsg.error_message ?? m.error_message,
                  is_revoked_by_sender: Boolean(mergedPayload.is_revoked_by_sender || m.is_revoked_by_sender),
                  revoked_at: (mergedPayload.revoked_at as string) || m.revoked_at || null,
                  payload: mergedPayload,
                };
              })
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_threads", filter: `store_id=eq.${effectiveStoreId}` },
        (payload: any) => {
          const newThread = payload.new as any;
          if (newThread?.thread_type === "ai_assistant" || newThread?.thread_type === "copilot") {
            return;
          }
          reloadThreads();
          if (newThread?.id && newThread.id === activeThreadIdRef.current) {
            reloadActiveMessages(newThread.id);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_channel_instances", filter: `store_id=eq.${effectiveStoreId}` },
        () => {
          listWorkspaceWhatsAppInstances({ data: { store_id: effectiveStoreId } })
            .then((list) => setWhatsappInstances(list))
            .catch(() => {});
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
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          hadDisconnection = true;
        } else if (status === "SUBSCRIBED" && hadDisconnection) {
          hadDisconnection = false;
          runCatchUp();
        }
      });

    let authSubscription: { unsubscribe: () => void } | null = null;
    try {
      const supabase = getBrowserClient();
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === "TOKEN_REFRESHED" || event === "SIGNED_IN") && session?.access_token) {
          try {
            supabase.realtime.setAuth(session.access_token);
          } catch {
            // noop
          }
          runCatchUp();
        }
      });
      authSubscription = data?.subscription || null;
    } catch {
      // noop
    }

    return () => {
      authSubscription?.unsubscribe();
      rt.unsubscribe();
    };
  }, [store?.id, reloadThreads, reloadActiveMessages]);

  // Listener de Visibilidade, Retomada de Foco e Reconexão de Rede (Zero Lag Mobile/Background)
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
    window.addEventListener("online", handleRevalidation);
    return () => {
      window.removeEventListener("visibilitychange", handleRevalidation);
      window.removeEventListener("focus", handleRevalidation);
      window.removeEventListener("online", handleRevalidation);
    };
  }, [reloadThreads, reloadActiveMessages]);

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
        if (prev.some((m) => m.id === sent.id)) {
          return prev.map((m) => (m.id === sent.id ? { ...m, ...sent } : m));
        }
        return [...prev, sent];
      });
      setText("");
      setIsWhisperMode(false);

      if ((sent as any)?.delivery_status === "failed") {
        toast.error(
          (sent as any)?.error_message ||
            "Mensagem salva no histórico, mas o envio pelo WhatsApp falhou. Verifique a conexão da instância.",
        );
      }

      setThreads((prev) => {
        const target = prev.find((t) => t.id === activeThreadId);
        if (!target) return prev;
        const updatedTarget = {
          ...target,
          ...(isWhisperMode ? {} : {
            last_message: text.trim(),
            is_last_reply_staff: true,
          }),
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

  useEffect(() => {
    if ((searchParams as any)?.channelInstanceId) {
      setChannelFilter((searchParams as any).channelInstanceId);
    }
  }, [(searchParams as any)?.channelInstanceId]);

  // Filtros de busca de threads
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      if (channelFilter !== "all" && t.channel_instance_id !== channelFilter) return false;
      // Filtros de Abas: Todas, Individuais, Grupos, Abertas, Aguardando, Arquivadas
      const isGrp = Boolean(t.is_group || t.is_channel || t.thread_type === "group" || t.thread_type === "channel");
      if (statusFilter === "direct" && isGrp) return false;
      if (statusFilter === "groups" && !isGrp) return false;
      if (statusFilter === "open" && t.status !== "open") return false;
      if (statusFilter === "archived" && t.status !== "archived") return false;
      if (statusFilter === "waiting" && (t.status === "archived" || t.is_last_reply_staff)) return false;
      if ((statusFilter === "all" || statusFilter === "direct" || statusFilter === "groups") && t.status === "archived") return false;
      const matchDept = deptFilter === "all" || t.department === deptFilter;

      if (selectedTagFilter !== "all") {
        const threadTags: string[] = Array.isArray(t.tags) ? t.tags : [];
        if (selectedTagFilter.startsWith("group:")) {
          const groupId = selectedTagFilter.slice(6);
          const groupTagLabels = new Set(
            (storeTagCatalog?.tags || [])
              .filter((tag: any) => tag.groupId === groupId)
              .map((tag: any) => String(tag.label).toLowerCase()),
          );
          if (!threadTags.some((lbl) => groupTagLabels.has(String(lbl).toLowerCase()))) {
            return false;
          }
        } else {
          if (!threadTags.some((lbl) => String(lbl).toLowerCase() === selectedTagFilter.toLowerCase())) {
            return false;
          }
        }
      }

      const matchSearch =
        !searchTerm.trim() ||
        (t.customer?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.customer?.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.last_message || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(t.tags) && t.tags.some((tg: string) => String(tg).toLowerCase().includes(searchTerm.toLowerCase())));
      return matchDept && matchSearch;
    });
  }, [threads, channelFilter, statusFilter, deptFilter, selectedTagFilter, storeTagCatalog?.tags, searchTerm]);

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
      {/* CABEÇALHO ENXUTO DO CHAT AO VIVO (FULL-PAGE — SQUIRCLES COMPACTOS) */}
      <header
        className={cn(
          "shrink-0 border-b border-border/60 bg-card px-3 py-2 flex-col md:flex-row md:items-center justify-between gap-2",
          activeHubTab === "live" && activeThreadId ? "hidden md:flex" : "flex",
        )}
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <RouterLink
              to="/workspace/atendimento"
              className="px-2 py-1 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-2xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <ArrowLeft className="size-3.5" />
              <span>Workspace</span>
            </RouterLink>
            <h1 className="text-sm font-bold text-foreground truncate">Atendimento</h1>

            {whatsappInstances.length > 1 && (
              <Select value={channelFilter} onValueChange={handleChangeChannelFilter}>
                <SelectTrigger
                  aria-label="Filtrar canal WhatsApp"
                  className="px-2 py-1 rounded-lg text-2xs border-border/60 bg-background w-auto max-w-xs"
                >
                  <Smartphone className="size-3 text-muted-foreground mr-1 shrink-0" />
                  <SelectValue placeholder="Todos canais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos canais</SelectItem>
                  {whatsappInstances.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.display_name}
                      {inst.display_phone_number ? ` (${inst.display_phone_number})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Pílulas Compactas de Presença */}
            <div className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
              {(
                [
                  { id: "online", label: "Online", dot: "bg-emerald-500" },
                  { id: "busy", label: "Ocupado", dot: "bg-warning" },
                  { id: "away", label: "Pausa", dot: "bg-muted-foreground" },
                ] as const
              ).map((pres) => (
                <button
                  key={pres.id}
                  type="button"
                  onClick={() => handleChangePresence(pres.id)}
                  className={cn(
                    "px-2 py-1 rounded-md text-2xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                    agentPresence === pres.id
                      ? "bg-card text-foreground shadow-2xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className={cn("size-2 rounded-full shrink-0", pres.dot)} />
                  <span>{pres.label}</span>
                </button>
              ))}
            </div>

            {activeHubTab === "live" && activeThread && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && window.innerWidth < 1024) {
                    setMobileCustomer360Open((prev) => !prev);
                  } else {
                    setShowCustomer360((prev) => !prev);
                  }
                }}
                className={cn(
                  "px-2 py-1 rounded-lg text-2xs font-semibold inline-flex items-center gap-1 border border-border/60 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  showCustomer360 ? "bg-foreground text-background" : "bg-muted/40 text-muted-foreground hover:text-foreground",
                )}
                title="Alternar Ficha 360º do Cliente"
              >
                <UserCheck className="size-3.5" />
                <span className="hidden lg:inline">Ficha 360º</span>
              </button>
            )}
          </div>
        </div>

        {/* RÉGUA ENXUTA DE SUBMODOS E ATALHOS DO ATENDIMENTO (SQUIRCLES FINOS) */}
        <div className="flex items-center gap-1 overflow-x-auto tab-list no-scrollbar pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setActiveHubTab("live")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              activeHubTab === "live"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/60",
            )}
          >
            <MessageSquare className="size-3.5" />
            <span>Conversas</span>
            {(metrics?.open || 0) > 0 && (
              <span className="px-1 rounded text-2xs font-mono bg-background/20">
                {metrics?.open}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveHubTab("intranet")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              activeHubTab === "intranet"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/60",
            )}
          >
            <Hash className="size-3.5" />
            <span>Intranet</span>
            <span className="px-1 rounded text-2xs font-mono opacity-80">
              {intranetChannels.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveHubTab("sdr")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              activeHubTab === "sdr"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/60",
            )}
          >
            <Bot className="size-3.5" />
            <span>Oportunidades</span>
            {sdrMetrics?.total > 0 && (
              <span className="px-1 rounded text-2xs font-mono opacity-80">
                {sdrMetrics.total}
              </span>
            )}
          </button>

          <RouterLink
            to="/workspace/atendimento/whatsapp"
            className="px-3 py-1 rounded-lg text-xs font-medium bg-muted/40 text-muted-foreground hover:text-foreground border border-border/60 inline-flex items-center gap-1 shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Smartphone className="size-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </RouterLink>

          <RouterLink
            to="/workspace/atendimento/filas"
            className="px-3 py-1 rounded-lg text-xs font-medium bg-muted/40 text-muted-foreground hover:text-foreground border border-border/60 inline-flex items-center gap-1 shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Sliders className="size-3.5" />
            <span>Setores</span>
          </RouterLink>

          <RouterLink
            to="/workspace/configuracoes/integracoes"
            className="px-3 py-1 rounded-lg text-xs font-medium bg-muted/40 text-muted-foreground hover:text-foreground border border-border/60 inline-flex items-center gap-1 shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Layers className="size-3.5 text-primary" />
            <span>E-mail & Hub</span>
          </RouterLink>
        </div>
      </header>

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
                  <RefreshCw className={cn("size-4", isSyncingWhatsApp && "animate-spin motion-reduce:animate-none text-primary")} />
                </Button>
              </div>

              
              {/* Chips Rápidos de Abas: Todas / Individuais / Grupos / Abertas / Aguardando / Arquivadas (Squircles Compactos) */}
              <div className="flex items-center gap-1 overflow-x-auto tab-list no-scrollbar py-1">
                {[
                  { id: "all", label: "Todas" },
                  { id: "direct", label: "Individuais" },
                  { id: "groups", label: "Grupos" },
                  { id: "open", label: "Abertas" },
                  { id: "waiting", label: "Aguardando" },
                  { id: "archived", label: "Arquivadas" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setStatusFilter(chip.id as any)}
                    className={cn(
                      "px-2 py-1 rounded-md text-2xs font-semibold transition-colors duration-150 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                      statusFilter === chip.id
                        ? "bg-foreground text-background font-bold shadow-2xs"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border/50"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Filtro por Setor + Filtro por Tags / Pastas de Tags (Umbler Talk / Whaticket Parity) */}
              <div className="flex items-center gap-1 overflow-x-auto tab-list no-scrollbar">
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  aria-label="Filtrar por setor"
                  className="px-2 py-1 rounded-md border border-border/60 bg-muted/40 text-2xs font-semibold text-foreground shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="all">Setor: Todos</option>
                  {Object.entries(departmentLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedTagFilter}
                  onChange={(e) => setSelectedTagFilter(e.target.value)}
                  aria-label="Filtrar por tag ou pasta"
                  className="px-2 py-1 rounded-md border border-border/60 bg-muted/40 text-2xs font-semibold text-foreground shrink-0 max-w-44 truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="all">Tags / Pastas: Todas</option>
                  {(storeTagCatalog?.groups || []).length > 0 && (
                    <optgroup label="Pastas de Tags">
                      {(storeTagCatalog?.groups || []).map((grp: any) => (
                        <option key={grp.id} value={`group:${grp.id}`}>
                          Pasta: {grp.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {(storeTagCatalog?.tags || []).length > 0 && (
                    <optgroup label="Etiquetas">
                      {(storeTagCatalog?.tags || []).map((tg: any) => (
                        <option key={tg.id} value={tg.label}>
                          #{tg.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {selectedTagFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedTagFilter("all")}
                    className="px-2 py-1 rounded-md text-2xs font-bold bg-primary/10 text-primary border border-primary/30 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    Limpar Tag
                  </button>
                )}
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
                  const isGrp = Boolean(t.is_group || t.thread_type === "group");
                  const isChan = Boolean(t.is_channel || t.thread_type === "channel");
                  const avatarSrc = t.avatar_url || t.customer?.avatar_url;

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
                      {/* Avatar com foto real do WhatsApp ou ícone de grupo/iniciais */}
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={t.customer?.full_name || "Conversa"}
                          className="size-10 rounded-full object-cover shrink-0 border border-border/60"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : isGrp ? (
                        <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                          <Users className="size-5" />
                        </div>
                      ) : isChan ? (
                        <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                          <Radio className="size-5" />
                        </div>
                      ) : (
                        <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                          {(t.customer?.full_name || "C")[0].toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-2 min-w-0">
                            {isGrp && <Users className="size-3.5 text-primary shrink-0" />}
                            {isChan && <Radio className="size-3.5 text-emerald-600 shrink-0" />}
                            <span className="font-bold text-xs text-foreground truncate">
                              {t.customer?.full_name || "Cliente"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 font-mono">
                            {formatRelativeTime(t.updated_at)}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-1 leading-snug">
                          {t.is_last_reply_staff && !String(t.last_message || "").startsWith("(") ? "Você: " : ""}
                          {String(t.last_message || "").startsWith("waesy-msg:")
                            ? (t.last_message_type === "image" ? "[Imagem]" : t.last_message_type === "audio" ? "[Áudio]" : "[Mensagem]")
                            : (t.last_message || "Sem mensagens")}
                        </p>

                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          {/* Badge de Canal / Tipo */}
                          {isGrp ? (
                            <Badge
                              variant="outline"
                              className="text-xs px-2 py-0 h-4 bg-primary/10 text-primary border-primary/30 gap-1 font-semibold"
                            >
                              <Users className="size-3" />
                              <span>{t.participants_count ? `Grupo (${t.participants_count})` : "Grupo WhatsApp"}</span>
                            </Badge>
                          ) : isChan ? (
                            <Badge
                              variant="outline"
                              className="text-xs px-2 py-0 h-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold"
                            >
                              <Radio className="size-3" />
                              <span>Canal</span>
                            </Badge>
                          ) : isWhatsApp ? (
                            <Badge
                              variant="outline"
                              className="text-xs px-2 py-0 h-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold"
                            >
                              <Smartphone className="size-3 text-emerald-600" />
                              <span>WhatsApp</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs px-2 py-0 h-4 gap-1">
                              <MessageSquare className="size-3" />
                              <span>Web</span>
                            </Badge>
                          )}
                          {(t.attribution?.campaign || t.attribution?.utm_campaign || t.attribution?.ctwa_clid || t.attribution?.ad_id) && (
                            <Badge
                              variant="outline"
                              className="text-xs px-2 py-0 h-4 bg-primary/10 text-primary border-primary/30 gap-1 font-semibold max-w-40 truncate"
                            >
                              <span className="truncate">
                                {t.attribution.campaign || t.attribution.utm_campaign || "Anúncio Ads"}
                              </span>
                            </Badge>
                          )}

                          <Badge variant="secondary" className="text-2xs px-2 py-0 h-4 uppercase">
                            {departmentLabels[t.department] || t.department}
                          </Badge>

                          {Array.isArray(t.tags) &&
                            t.tags.slice(0, 3).map((tagLabel: string) => (
                              <span
                                key={tagLabel}
                                className={cn(
                                  "px-2 py-0 rounded text-2xs font-bold border leading-4",
                                  resolveTagPillClass(tagLabel, storeTagCatalog?.tags),
                                )}
                              >
                                {tagLabel}
                              </span>
                            ))}

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

                  {/* Avatar do cliente ou grupo com foto real do WhatsApp */}
                  {activeThread.avatar_url || activeThread.customer?.avatar_url ? (
                    <img
                      src={activeThread.avatar_url || activeThread.customer?.avatar_url}
                      alt={activeThread.customer?.full_name || "Conversa"}
                      className="size-10 rounded-full object-cover shrink-0 border border-border/60"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : activeThread.is_group || activeThread.thread_type === "group" ? (
                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                      <Users className="size-5" />
                    </div>
                  ) : activeThread.is_channel || activeThread.thread_type === "channel" ? (
                    <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                      <Radio className="size-5" />
                    </div>
                  ) : (
                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                      {(activeThread.customer?.full_name || "C")[0].toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base text-foreground truncate min-w-0">
                        {activeThread.customer?.full_name || "Conversa"}
                      </h3>
                      {activeThread.is_group || activeThread.thread_type === "group" ? (
                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary shrink-0 border border-primary/20">
                          <Users className="size-3 text-primary" />
                          <span>Grupo WhatsApp</span>
                        </span>
                      ) : activeThread.is_channel || activeThread.thread_type === "channel" ? (
                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0 border border-emerald-500/20">
                          <Radio className="size-3 text-emerald-600" />
                          <span>Canal</span>
                        </span>
                      ) : activeThread.channel === "whatsapp" && (
                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0 border border-emerald-500/20">
                          <span
                            className={cn("size-2 rounded-full shrink-0", isWhatsAppWindowOpen ? "bg-emerald-500" : "bg-muted-foreground")}
                            title={isWhatsAppWindowOpen ? "Canal WhatsApp Ativo" : "Janela Meta Cloud Expirada (Exige Template)"}
                          />
                          <span>WhatsApp</span>
                        </span>
                      )}
                      {(activeThread.attribution?.campaign ||
                        activeThread.attribution?.utm_campaign ||
                        activeThread.attribution?.ad_id ||
                        activeThread.attribution?.ctwa_clid ||
                        activeThread.attribution?.platform) && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary shrink-0 border border-primary/20">
                          <span>
                            {activeThread.attribution.campaign ||
                              activeThread.attribution.utm_campaign ||
                              (activeThread.attribution.ctwa_clid ? "Anúncio CTWA" : activeThread.attribution.platform || "Anúncio")}
                          </span>
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate font-mono select-all">
                      {activeThread.is_group || activeThread.thread_type === "group"
                        ? (activeThread.participants_count > 0
                            ? `${activeThread.participants_count} participantes • Grupo WhatsApp`
                            : "Grupo WhatsApp")
                        : activeThread.customer?.phone || activeThread.customer?.email || "Atendimento Direto"}
                    </p>
                    {/* Tags Semânticas Coloridas (Whaticket / CRM Parity) */}
                    <div className="pt-1">
                      <ThreadTagsPicker
                        threadId={activeThread?.id || ""}
                        storeId={store?.id || undefined}
                        tags={activeThread.tags || []}
                        contactName={activeThread.customer?.full_name || null}
                        contactAvatarUrl={activeThread.avatar_url || activeThread.customer?.avatar_url || null}
                        onTagsChange={(newTags) => {
                          setThreads((prev) =>
                            prev.map((t) => (t.id === activeThread?.id ? { ...t, tags: newTags } : t))
                          );
                        }}
                      />
                    </div>

                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Ação: Encerrar / Reabrir Atendimento (Squircle Compacto) */}
                  <button
                    type="button"
                    disabled={isArchiving}
                    onClick={() =>
                      activeThread?.id && handleArchiveThread(activeThread.id, activeThread.status !== "archived")
                    }
                    className="px-3 py-1 rounded-lg border border-border/80 bg-card hover:bg-muted text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none shrink-0"
                    title={activeThread.status === "archived" ? "Reabrir conversa" : "Encerrar atendimento"}
                  >
                    {activeThread.status === "archived" ? (
                      <>
                        <ArchiveRestore className="size-3.5 shrink-0" />
                        <span className="hidden xl:inline">Reabrir</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                        <span className="hidden xl:inline">Encerrar</span>
                      </>
                    )}
                  </button>

                  {/* Toggle Ficha do Cliente (Perfil 360 — Squircle Compacto) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.innerWidth < 1024) {
                        setMobileCustomer360Open((prev) => !prev);
                      } else {
                        setShowCustomer360((prev) => !prev);
                      }
                    }}
                    className={cn(
                      "px-3 py-1 rounded-lg border border-border/80 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none shrink-0",
                      showCustomer360 ? "bg-muted text-foreground font-bold" : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                    title="Exibir dados e ficha do cliente"
                    aria-label="Ficha do Cliente"
                  >
                    <UserCheck className="size-3.5 shrink-0" />
                    <span className="hidden xl:inline">Ficha</span>
                  </button>

                  {/* Menu Dropdown de Ações Operacionais (Squircle Compacto) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="px-2 py-1 rounded-lg border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center justify-center cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none shrink-0"
                        title="Mais Ações de Atendimento"
                        aria-label="Mais Ações de Atendimento"
                      >
                        <MoreVertical className="size-4" />
                      </button>
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

                      {isSupervisor ? (
                        <>
                          <DropdownMenuSeparator className="my-1 border-border/60" />
                          <DropdownMenuItem
                            onClick={handleToggleThreadStaffVisibility}
                            disabled={isTogglingVisibility}
                            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2"
                          >
                            {activeThread?.metadata?.hidden_from_staff ? (
                              <>
                                <Eye className="size-4 shrink-0 text-primary" />
                                <span>Tornar visível para equipe</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="size-4 shrink-0 text-muted-foreground" />
                                <span>Ocultar da equipe (Confidencial)</span>
                              </>
                            )}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => setDeleteContactModalOpen(true)}
                            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-4 shrink-0" />
                            <span>Excluir contato & dados (Definitivo)</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="my-1 border-border/60" />
                          <DropdownMenuItem
                            onClick={() => {
                              loadPendingDeletionRequests();
                              setSupervisorRequestsModalOpen(true);
                            }}
                            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2 text-primary hover:bg-primary/10"
                          >
                            <ShieldCheck className="size-4 shrink-0" />
                            <span>Solicitações de exclusão da equipe</span>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => setRequestDeletionModalOpen(true)}
                          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2 text-warning-strong hover:bg-warning/10"
                        >
                          <ShieldAlert className="size-4 shrink-0" />
                          <span>Solicitar exclusão ao supervisor</span>
                        </DropdownMenuItem>
                      )}
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
                          {isWhatsAppWindowOpen ? "Canal ativo para envio direto de mensagens" : "Janela Meta Cloud expirada (exige template aprovado)"}
                        </p>
                      </div>
                      <span className="font-mono text-muted-foreground shrink-0">
                        {formatRelativeTime(activeThread.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Alerta de Promessa Pendente / Anti-Esquecimento */}
              {promiseDetection.hasPendingPromise && (
                <div className="bg-warning/10 border-b border-warning/30 px-4 py-2 flex items-center justify-between text-xs shrink-0 transition-colors">
                  <div className="flex items-center gap-2 text-warning-strong min-w-0">
                    <Clock className="size-4 shrink-0 text-warning-strong" />
                    <span className="truncate">
                      Promessa pendente: <strong>&ldquo;{promiseDetection.promiseSnippet}&rdquo;</strong> (há {promiseDetection.elapsedMinutes} min)
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isGeneratingSmartReply}
                    onClick={() => handleGenerateSmartReply(false, "Cumprir a promessa pendente feita ao cliente de forma objetiva e acolhedora.")}
                    className="h-11 min-h-11 px-3 text-xs font-semibold text-warning-strong hover:bg-warning/20 border-warning/40 shrink-0 ml-2 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
                    {isGeneratingSmartReply ? "Gerando..." : "Cumprir com IA"}
                  </Button>
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
                      msg.is_internal ||
                      msg.payload?.is_whisper ||
                      msg.payload?.is_internal ||
                      msg.message_type === "internal_note" ||
                      (msg.message_type === "system_event" && (msg.payload?.is_whisper || msg.payload?.is_internal))
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
                            {isStaff
                              ? msg.payload?.origin === "whatsapp_device"
                                ? "Celular WhatsApp"
                                : "Equipe / Você"
                              : (() => {
                                  const sName = msg.metadata?.sender_name || msg.payload?.sender_name;
                                  const sPhone = msg.metadata?.sender_phone || msg.payload?.sender_phone;
                                  if (activeThread.is_group || activeThread.thread_type === "group") {
                                    if (sName && sPhone) return `${sName} (${sPhone})`;
                                    return sName || sPhone || "Participante";
                                  }
                                  return activeThread.customer?.full_name || sPhone || "Cliente";
                                })()}{" "}
                            •{" "}
                            {formatDate(msg.created_at)}
                            {isStaff && (
                              <MessageDeliveryStatusIcon
                                status={msg.delivery_status}
                                deliveryState={msg.payload?.delivery_state}
                                errorMessage={msg.error_message || msg.payload?.last_error_message}
                              />
                            )}
                          </span>
                        </div>
                      );
                    }

                    // Balão Normal e Mídias estilo WhatsApp Web
                    const mediaInfo = msg.payload?.media || null;
                    const mediaType =
                      msg.message_type === "sticker" || mediaInfo?.type === "sticker"
                        ? "sticker"
                        : msg.message_type === "image" || mediaInfo?.type === "image"
                        ? "image"
                        : msg.message_type === "video" || mediaInfo?.type === "video"
                        ? "video"
                        : msg.message_type === "audio" || mediaInfo?.type === "audio"
                        ? "audio"
                        : msg.message_type === "document" || mediaInfo?.type === "document"
                        ? "document"
                        : null;

                    const mediaUrl =
                      Array.isArray(msg.attachments) && msg.attachments.length > 0 && typeof msg.attachments[0] === "string"
                        ? msg.attachments[0]
                        : mediaInfo?.url || mediaInfo?.base64 || null;

                    const isSticker = mediaType === "sticker";

                    if (isSticker) {
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isStaff ? "items-end" : "items-start"} my-1`}
                        >
                          {Boolean(msg.is_revoked_by_sender || msg.payload?.is_revoked_by_sender) ? (
                            <div className="p-2 rounded-lg bg-muted text-muted-foreground text-xs italic flex items-center gap-2">
                              <Ban className="size-3.5 shrink-0" />
                              <span>Figurinha apagada pelo remetente</span>
                            </div>
                          ) : mediaUrl ? (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(mediaUrl)}
                              className="group relative cursor-pointer p-1 rounded-lg transition-transform hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary"
                              title="Clique para ampliar a figurinha"
                            >
                              <img
                                src={mediaUrl}
                                alt="Figurinha WhatsApp"
                                className="size-32 sm:size-36 object-contain"
                              />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleFetchMedia(msg)}
                              disabled={fetchingMediaMap[msg.id]}
                              className="h-11 min-h-11 px-3 rounded-lg border border-border/80 bg-card text-foreground text-xs font-medium flex items-center gap-2 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
                            >
                              <ImageIcon className="size-4 text-warning-strong shrink-0" />
                              <span>{fetchingMediaMap[msg.id] ? "Baixando figurinha..." : "Carregar figurinha"}</span>
                            </button>
                          )}
                          <span className="text-xs text-muted-foreground mt-1 px-1 flex items-center gap-1 font-mono">
                            {isStaff
                              ? (Boolean(msg.payload?.origin === "whatsapp_device") ? "Celular WhatsApp" : "Você")
                              : (() => {
                                  const sName = msg.metadata?.sender_name || msg.payload?.sender_name;
                                  const sPhone = msg.metadata?.sender_phone || msg.payload?.sender_phone;
                                  if (activeThread?.is_group || activeThread?.thread_type === "group") {
                                    if (sName && sPhone) return `${sName} (${sPhone})`;
                                    return sName || sPhone || "Participante";
                                  }
                                  return activeThread?.customer?.full_name || sPhone || "Cliente";
                                })()}{" "}
                            •{" "}
                            {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {isStaff && (
                              <MessageDeliveryStatusIcon
                                status={msg.delivery_status}
                                deliveryState={msg.payload?.delivery_state}
                                errorMessage={msg.error_message || msg.payload?.last_error_message || null}
                              />
                            )}
                          </span>
                        </div>
                      );
                    }
                    const isRevoked = Boolean(msg.is_revoked_by_sender || msg.payload?.is_revoked_by_sender);
                    const isFromDevice = Boolean(msg.payload?.origin === "whatsapp_device");
                    const msgErrorText = msg.error_message || msg.payload?.last_error_message || null;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={cn(
                            "max-w-md sm:max-w-md rounded-lg p-3 text-xs leading-relaxed shadow-xs",
                            isStaff
                              ? msg.delivery_status === "failed"
                                ? "bg-destructive/15 border border-destructive/50 text-foreground font-medium rounded-tr-xs"
                                : "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                              : "bg-card border border-border/80 text-foreground rounded-tl-xs",
                          )}
                        >
                          {isRevoked && (
                            <div className="flex items-center gap-1 text-xs font-semibold mb-1 pb-1 border-b border-border/40 opacity-80">
                              <Ban className="size-3.5 shrink-0" />
                              <span>Apagada no WhatsApp pelo remetente</span>
                            </div>
                          )}
                          {/* Foto / Imagem */}
                          {mediaType === "image" && (
                            <div className="mb-2">
                              {mediaUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setLightboxUrl(mediaUrl)}
                                  className="relative overflow-hidden rounded-md group cursor-pointer block border border-border/60 focus-visible:ring-2 focus-visible:ring-primary"
                                  title="Clique para ampliar a imagem"
                                >
                                  <img
                                    src={mediaUrl}
                                    alt={mediaInfo?.caption || "Foto WhatsApp"}
                                    className="max-h-60 max-w-full rounded-md object-cover"
                                  />
                                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye className="size-6 text-foreground" />
                                  </div>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleFetchMedia(msg)}
                                  disabled={fetchingMediaMap[msg.id]}
                                  className="h-11 min-h-11 px-3 rounded-md bg-background/20 hover:bg-background/30 text-xs font-medium flex items-center gap-2 cursor-pointer border border-border/40 focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                  <ImageIcon className="size-4 shrink-0" />
                                  <span>{fetchingMediaMap[msg.id] ? "Baixando foto..." : "Carregar foto"}</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Vídeo */}
                          {mediaType === "video" && (
                            <div className="mb-2">
                              {mediaUrl ? (
                                <video
                                  src={mediaUrl}
                                  controls
                                  className="max-w-xs sm:max-w-sm rounded-md border border-border/60"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleFetchMedia(msg)}
                                  disabled={fetchingMediaMap[msg.id]}
                                  className="h-11 min-h-11 px-3 rounded-md bg-background/20 hover:bg-background/30 text-xs font-medium flex items-center gap-2 cursor-pointer border border-border/40 focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                  <Film className="size-4 shrink-0" />
                                  <span>{fetchingMediaMap[msg.id] ? "Baixando vídeo..." : "Carregar vídeo"}</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Áudio */}
                          {mediaType === "audio" && (
                            <div className="my-2 space-y-1">
                              {mediaUrl ? (
                                <>
                                  <audio src={mediaUrl} controls className="w-64 max-w-full h-11" />
                                  {msg.payload?.transcript ? (
                                    <div className="mt-1 p-2 rounded bg-background/30 border border-border/40 text-xs">
                                      <span className="font-semibold block opacity-80 text-xs uppercase tracking-wide">
                                        Transcrição (IA):
                                      </span>
                                      <p className="italic mt-1 whitespace-pre-wrap">{msg.payload.transcript}</p>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleTranscribeAudio(msg)}
                                      disabled={transcribingAudioMap[msg.id]}
                                      className="mt-1 h-11 min-h-11 px-3 rounded text-xs font-medium flex items-center gap-2 text-muted-foreground hover:text-foreground bg-background/20 hover:bg-background/40 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                      <FileText className="size-4 shrink-0" />
                                      <span>{transcribingAudioMap[msg.id] ? "Transcrevendo..." : "Transcrever com IA"}</span>
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleFetchMedia(msg)}
                                  disabled={fetchingMediaMap[msg.id]}
                                  className="h-11 min-h-11 px-3 rounded-md bg-background/20 hover:bg-background/30 text-xs font-medium flex items-center gap-2 cursor-pointer border border-border/40 focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                  <Volume2 className="size-4 shrink-0" />
                                  <span>{fetchingMediaMap[msg.id] ? "Baixando áudio..." : "Ouvir áudio"}</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Documento */}
                          {mediaType === "document" && (
                            <div className="mb-2 p-2 rounded-md bg-background/20 border border-border/40 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="size-5 shrink-0 opacity-80" />
                                <div className="min-w-0">
                                  <p className="font-semibold truncate text-xs">{mediaInfo?.fileName || "Documento"}</p>
                                  <p className="text-2xs opacity-75 truncate">{mediaInfo?.mimetype || "Arquivo"}</p>
                                </div>
                              </div>
                              {mediaUrl ? (
                                <a
                                  href={mediaUrl}
                                  download={mediaInfo?.fileName || "documento"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-md hover:bg-background/30 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                                  title="Baixar arquivo"
                                >
                                  <Download className="size-4" />
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleFetchMedia(msg)}
                                  disabled={fetchingMediaMap[msg.id]}
                                  className="h-11 min-h-11 px-3 rounded-md text-xs font-medium flex items-center gap-2 bg-background/30 hover:bg-background/40 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                  {fetchingMediaMap[msg.id] ? "Baixando..." : "Baixar"}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Texto da mensagem */}
                          {Boolean(
                            msg.message &&
                              !(
                                ["[Imagem]", "[Vídeo]", "[Áudio]", "[Documento]", "[Figurinha]"].includes(msg.message) &&
                                mediaUrl
                              ),
                          ) && (
                            <p className={cn("whitespace-pre-wrap break-words", isRevoked && "italic")}>
                              {String(msg.message).startsWith("waesy-msg:")
                                ? (msg.message_type === "image" ? "[Imagem]"
                                  : msg.message_type === "video" ? "[Vídeo]"
                                  : msg.message_type === "audio" ? "[Áudio]"
                                  : msg.message_type === "document" ? "[Documento]"
                                  : msg.message_type === "sticker" ? "[Figurinha]"
                                  : "[Mensagem recebida]")
                                : msg.message}
                            </p>
                          )}
                          {isStaff && msg.delivery_status === "failed" && msgErrorText && (
                            <div className="mt-2 pt-2 border-t border-destructive/30 text-destructive text-xs flex items-center gap-1">
                              <AlertTriangle className="size-3.5 shrink-0" />
                              <span>{String(msgErrorText)}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 px-1 flex items-center gap-1 font-mono">
                          {isStaff
                            ? (isFromDevice ? "Celular WhatsApp" : "Você")
                            : (() => {
                                const sName = msg.metadata?.sender_name || msg.payload?.sender_name;
                                const sPhone = msg.metadata?.sender_phone || msg.payload?.sender_phone;
                                if (activeThread.is_group || activeThread.thread_type === "group") {
                                  if (sName && sPhone) return `${sName} (${sPhone})`;
                                  return sName || sPhone || "Participante";
                                }
                                return activeThread.customer?.full_name || sPhone || "Cliente";
                              })()}{" "}
                          •{" "}
                          {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {isStaff && (
                            <MessageDeliveryStatusIcon
                              status={msg.delivery_status}
                              deliveryState={msg.payload?.delivery_state}
                              errorMessage={msgErrorText}
                            />
                          )}
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

                {/* Seletor de Modo: Responder ao Cliente vs Nota Interna da Equipe (Squircles Compactos) */}
                <div className="flex items-center justify-between gap-2 pb-1">
                  <div className="inline-flex items-center rounded-lg bg-muted/60 p-1 border border-border/60">
                    <button
                      type="button"
                      onClick={() => setIsWhisperMode(false)}
                      className={cn(
                        "px-3 py-1 rounded-md text-2xs font-semibold flex items-center gap-1 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                        !isWhisperMode
                          ? "bg-background text-foreground font-bold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <MessageSquare className="size-3 text-emerald-600" />
                      <span>Responder (Cliente)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsWhisperMode(true)}
                      className={cn(
                        "px-3 py-1 rounded-md text-2xs font-semibold flex items-center gap-1 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                        isWhisperMode
                          ? "bg-warning/20 text-warning-strong font-bold"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Lock className="size-3 text-warning-strong" />
                      <span>Nota Interna (Equipe)</span>
                    </button>
                  </div>
                </div>

                {/* Banner Modo Nota Interna (Whisper) */}
                {isWhisperMode && (
                  <div className="flex items-center justify-between gap-2 px-3 py-1 rounded-lg bg-warning/15 border border-warning/40 text-warning-strong text-2xs font-medium animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <Lock className="size-3 shrink-0 text-warning-strong" />
                      <span>Nota interna privada: visível apenas para a equipe (não enviada ao WhatsApp).</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsWhisperMode(false)}
                      className="px-2 py-1 rounded-md text-2xs font-semibold text-warning-strong hover:bg-warning/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Trilho de Respostas Rápidas / Macros Compacto (Squircles Finos Estilo Tags) */}
                <div
                  role="tablist"
                  aria-label="Atalhos Rápidos"
                  className="flex items-center gap-1 overflow-x-auto tab-list no-scrollbar py-1"
                >
                  <button
                    type="button"
                    onClick={() => setQuickAnswersModalOpen(true)}
                    className="px-2 py-1 rounded-md text-2xs font-semibold inline-flex items-center gap-1 shrink-0 border border-border/70 bg-card text-foreground hover:bg-muted cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    title="Gerenciar respostas rápidas e atalhos comerciais"
                  >
                    <Zap className="size-3 text-warning-strong" />
                    <span>Atalhos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateSmartReply(false)}
                    disabled={isGeneratingSmartReply}
                    className="px-2 py-1 rounded-md text-2xs font-semibold inline-flex items-center gap-1 shrink-0 border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    title="Escrever resposta sugerida com base no histórico do cliente"
                  >
                    <Zap className="size-3 text-primary" />
                    <span>{isGeneratingSmartReply ? "Escrevendo..." : "Escrever com IA"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateSmartReply(true)}
                    disabled={isGeneratingSmartAudio}
                    className="px-2 py-1 rounded-md text-2xs font-semibold inline-flex items-center gap-1 shrink-0 border border-border bg-muted/60 text-foreground hover:bg-accent cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    title="Gerar áudio e ouvir antes de enviar"
                  >
                    <Volume2 className="size-3 text-foreground" />
                    <span>{isGeneratingSmartAudio ? "Sintetizando..." : "Gerar Áudio IA"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLiveModalOverride("image_card")}
                    className="px-2 py-1 rounded-md text-2xs font-semibold inline-flex items-center gap-1 shrink-0 border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    title="Gerar card visual em imagem para o cliente (Oferta, Voucher PNR, Fatura PIX)"
                  >
                    <ImageIcon className="size-3 text-emerald-600" />
                    <span>Gerar Imagem</span>
                  </button>

                  {(storeMacros.length > 0
                    ? storeMacros.map((m: any) => ({ cmd: m.shortcut, text: m.message, label: m.title }))
                    : semantics.nicheId === "tourism"
                      ? [
                          { cmd: "ola", text: "Olá! Como podemos ajudar na sua próxima viagem?", label: "Saudação" },
                          { cmd: "roteiro", text: "Temos roteiros e pacotes com saídas programadas. Quer receber a programação?", label: "Roteiros" },
                          { cmd: "cotacao", text: "Para preparar sua cotação, informe a data desejada, quantidade de passageiros e acomodação.", label: "Cotação" },
                          { cmd: "embarque", text: "Ponto de embarque, horários e documentos constam no seu comprovante de reserva.", label: "Embarque" },
                          { cmd: "pix", text: "A chave PIX oficial é gerada na reserva com validação automática.", label: "Chave PIX" },
                          { cmd: "horarios", text: "Atendimento de segunda a sexta, das 08h às 18h, e sábado, das 08h às 12h.", label: "Horários" },
                        ]
                      : semantics.nicheId === "gastronomy"
                        ? [
                            { cmd: "ola", text: "Olá! Como podemos atender hoje?", label: "Saudação" },
                            { cmd: "cardapio", text: "Acesse nosso cardápio digital pelo link acima para montar seu pedido.", label: "Cardápio" },
                            { cmd: "pedido", text: "Seu pedido foi recebido e já está em preparação.", label: "Status Pedido" },
                            { cmd: "pix", text: "A chave PIX oficial é gerada no pedido para confirmação automática.", label: "Chave PIX" },
                            { cmd: "horarios", text: "Funcionamento de terça a domingo, das 18h às 23h30.", label: "Horários" },
                          ]
                        : semantics.nicheId === "retail"
                          ? [
                              { cmd: "ola", text: "Olá! Em que podemos ajudar hoje?", label: "Saudação" },
                              { cmd: "catalogo", text: "Acesse nosso catálogo com disponibilidade em tempo real no link acima.", label: "Catálogo" },
                              { cmd: "rastreio", text: "Seu pedido está em separação e você pode acompanhar pelo link de rastreio.", label: "Rastreio" },
                              { cmd: "pix", text: "A chave PIX oficial é gerada diretamente no seu pedido.", label: "Chave PIX" },
                              { cmd: "horarios", text: "Atendimento de segunda a sexta, das 08h às 18h, e sábado, das 08h às 12h.", label: "Horários" },
                            ]
                          : [
                              { cmd: "ola", text: "Olá! Como podemos ajudar?", label: "Saudação" },
                              { cmd: "servicos", text: "Confira nossos serviços e procedimentos disponíveis.", label: "Serviços" },
                              { cmd: "agendamento", text: "Para agendar, informe a data de preferência e o serviço.", label: "Agendamento" },
                              { cmd: "pix", text: "A chave PIX oficial é gerada diretamente no seu pedido.", label: "Chave PIX" },
                              { cmd: "horarios", text: "Atendimento de segunda a sexta, das 08h às 18h, e sábado, das 08h às 12h.", label: "Horários" },
                            ]
                  ).map((macro: any) => (
                    <button
                      key={macro.cmd}
                      type="button"
                      onClick={() => setText(interpolateTemplateVariables(macro.text, { customerName: activeThread.customer?.full_name, customerPhone: activeThread.customer?.phone, storeName: store?.name }))}
                      className="px-2 py-1 rounded-md text-2xs font-mono font-medium bg-muted/60 hover:bg-accent border border-border/70 text-muted-foreground hover:text-foreground shrink-0 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      /{macro.cmd} <span className="text-2xs opacity-75">({macro.label})</span>
                    </button>
                  ))}
                </div>

                {/* Mini Player de Preview de Áudio IA (Ouvir antes de enviar) */}
                {aiAudioPreviewUrl && (
                  <div className="p-3 rounded-lg bg-card border border-border flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={togglePlaySmartAudio}
                        className="size-11 min-h-11 rounded-full shrink-0 border-primary/50 text-primary hover:bg-primary/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                        title={isPlayingSmartAudio ? "Pausar áudio" : "Ouvir áudio antes de enviar"}
                      >
                        {isPlayingSmartAudio ? <Pause className="size-4" /> : <Play className="size-4" />}
                      </Button>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <Volume2 className="size-3.5 text-primary shrink-0" />
                          <span>Prévia de Áudio IA (Ouvir antes de enviar)</span>
                        </span>
                        <span className="text-xs text-muted-foreground block truncate">
                          {isPlayingSmartAudio ? "Reproduzindo áudio..." : "Clique no play para escutar antes de despachar"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (aiAudioElementRef.current) aiAudioElementRef.current.pause();
                          setIsPlayingSmartAudio(false);
                          setAiAudioPreviewUrl(null);
                        }}
                        className="h-11 min-h-11 px-2 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Descartar áudio"
                      >
                        <Trash2 className="size-4 shrink-0" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSending}
                        onClick={handleSendAiAudio}
                        className="h-11 min-h-11 px-3 text-xs font-semibold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Send className="size-3.5 shrink-0" />
                        <span>{isSending ? "Enviando..." : "Enviar Áudio"}</span>
                      </Button>
                    </div>
                  </div>
                )}

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

                    {/* Botão Estúdio de Voz IA (Personas, Sotaques e Ambientes Acústicos) */}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setVoiceStudioModalOpen(true)}
                      className="size-11 rounded-lg shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary text-primary hover:text-primary hover:bg-primary/10"
                      title="Estúdio de Voz IA (Personas, Sotaques e Ambientes Acústicos)"
                      aria-label="Estúdio de Voz IA"
                    >
                      <Mic className="size-4" />
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

          {/* COLUNA 3: Customer 360 (Lateral Direita Recolhível — Identidade no Topo, Seguida de Tags/Notas, IA, Viagens/PNR, Faturas/Imagens e E-mail) */}
          {activeThread && showCustomer360 && (
            <div className="hidden lg:block w-80 xl:w-96 border-l border-border/80 bg-background overflow-y-auto no-scrollbar shrink-0 p-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-3">
                <span className="font-bold text-2xs uppercase tracking-wider text-muted-foreground">
                  {activeThread?.is_group || activeThread?.thread_type === "group"
                    ? "Dossiê do Grupo WhatsApp"
                    : activeThread?.is_channel || activeThread?.thread_type === "channel"
                    ? "Dossiê do Canal"
                    : "Perfil 360º do Cliente"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomer360(false)}
                  className="px-2 py-1 rounded-md text-2xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Fechar
                </button>
              </div>
              <Customer360Sidebar
                customerId={activeThread?.customer?.id}
                storeId={store?.id || ""}
                threadId={activeThread?.id}
                guestName={activeThread?.customer?.full_name}
                guestPhone={activeThread?.customer?.phone}
                niche={semantics.nicheId}
                storeName={store?.name}
                isGroup={Boolean(activeThread?.is_group || activeThread?.thread_type === "group")}
                isChannel={Boolean(activeThread?.is_channel || activeThread?.thread_type === "channel")}
                avatarUrl={activeThread?.avatar_url || activeThread?.customer?.avatar_url}
                department={activeThread?.department || "geral"}
                assignedAgentId={
                  activeThread?.id
                    ? assignedAgentPerThread[activeThread.id] ?? activeThread?.assigned_to_profile_id ?? null
                    : null
                }
                teamMembers={teamMembers}
                departmentLabels={departmentLabels}
                aiAutoReply={activeThread?.id ? aiAutoReplyPerThread[activeThread.id] ?? true : true}
                onToggleAiAutoReply={(checked) => {
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
                onDepartmentChange={handleDepartmentChange}
                onAssignedAgentChange={(val) => {
                  setAssignedAgentPerThread((prev) => ({
                    ...prev,
                    ...(activeThread?.id ? { [activeThread.id]: val } : {}),
                  }));
                  if (activeThread?.id) {
                    assignChatThread({ data: { threadId: activeThread.id, assigned_to_profile_id: val || null } }).catch(() => {});
                  }
                  toast.success("Atendente atribuído à conversa!");
                }}
                onQuickSendMessage={(msgText) => setText(msgText)}
                onOpenTransfer={() => setTransferModalOpen(true)}
                onOpenSchedule={() => setScheduleModalOpen(true)}
                onOpenQuickComposerModal={(modal) =>
                  setLiveModalOverride(modal === "image_card" ? "image_card" : "form")
                }
                onProfileSynced={({ avatarUrl: nextAvatar, fullName: nextName, phone: nextPhone, isGroup: nextIsGroup, attribution: nextAttribution }) => {
                  const targetId = activeThread?.id;
                  if (!targetId) return;
                  setThreads((prev) =>
                    prev.map((t) =>
                      t.id === targetId
                        ? {
                            ...t,
                            ...(nextAvatar !== undefined ? { avatar_url: nextAvatar } : {}),
                            ...(nextIsGroup && nextName ? { group_subject: nextName } : {}),
                            ...(nextAttribution !== undefined ? { attribution: nextAttribution } : {}),
                            customer: {
                              ...(t.customer || {}),
                              ...(nextName ? { full_name: nextName } : {}),
                              ...(nextPhone !== undefined ? { phone: nextPhone || "" } : {}),
                              ...(nextAvatar !== undefined ? { avatar_url: nextAvatar } : {}),
                            },
                          }
                        : t,
                    ),
                  );
                }}
              />
            </div>
          )}

          {/* Drawer Sheet Mobile/Tablet do Perfil 360 */}
          <Sheet open={Boolean(activeThread && mobileCustomer360Open)} onOpenChange={setMobileCustomer360Open}>
            <SheetContent side="right" className="lg:hidden w-full sm:max-w-md p-0 overflow-y-auto">
              <SheetHeader className="p-3 border-b border-border/60">
                <SheetTitle className="text-2xs uppercase tracking-wider text-muted-foreground font-bold">
                  {activeThread?.is_group || activeThread?.thread_type === "group"
                    ? "Dossiê do Grupo WhatsApp"
                    : activeThread?.is_channel || activeThread?.thread_type === "channel"
                    ? "Dossiê do Canal"
                    : "Perfil 360º do Cliente"}
                </SheetTitle>
              </SheetHeader>
              {activeThread?.id && (
                <div className="p-3">
                  <Customer360Sidebar
                    customerId={activeThread?.customer?.id}
                    storeId={store?.id || ""}
                    threadId={activeThread?.id}
                    guestName={activeThread?.customer?.full_name}
                    guestPhone={activeThread?.customer?.phone}
                    niche={semantics.nicheId}
                    storeName={store?.name}
                    isGroup={Boolean(activeThread?.is_group || activeThread?.thread_type === "group")}
                    isChannel={Boolean(activeThread?.is_channel || activeThread?.thread_type === "channel")}
                    avatarUrl={activeThread?.avatar_url || activeThread?.customer?.avatar_url}
                    department={activeThread?.department || "geral"}
                    assignedAgentId={
                      activeThread?.id
                        ? assignedAgentPerThread[activeThread.id] ?? activeThread?.assigned_to_profile_id ?? null
                        : null
                    }
                    teamMembers={teamMembers}
                    departmentLabels={departmentLabels}
                    aiAutoReply={activeThread?.id ? aiAutoReplyPerThread[activeThread.id] ?? true : true}
                    onToggleAiAutoReply={(checked) => {
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
                    onDepartmentChange={handleDepartmentChange}
                    onAssignedAgentChange={(val) => {
                      setAssignedAgentPerThread((prev) => ({
                        ...prev,
                        ...(activeThread?.id ? { [activeThread.id]: val } : {}),
                      }));
                      if (activeThread?.id) {
                        assignChatThread({ data: { threadId: activeThread.id, assigned_to_profile_id: val || null } }).catch(() => {});
                      }
                      toast.success("Atendente atribuído à conversa!");
                    }}
                    onQuickSendMessage={(msgText) => {
                      setText(msgText);
                      setMobileCustomer360Open(false);
                    }}
                    onOpenTransfer={() => {
                      setMobileCustomer360Open(false);
                      setTransferModalOpen(true);
                    }}
                    onOpenSchedule={() => {
                      setMobileCustomer360Open(false);
                      setScheduleModalOpen(true);
                    }}
                    onOpenQuickComposerModal={(modal) => {
                      setMobileCustomer360Open(false);
                      setLiveModalOverride(modal === "image_card" ? "image_card" : "form");
                    }}
                    onProfileSynced={({ avatarUrl: nextAvatar, fullName: nextName, phone: nextPhone, isGroup: nextIsGroup, attribution: nextAttribution }) => {
                      const targetId = activeThread?.id;
                      if (!targetId) return;
                      setThreads((prev) =>
                        prev.map((t) =>
                          t.id === targetId
                            ? {
                                ...t,
                                ...(nextAvatar !== undefined ? { avatar_url: nextAvatar } : {}),
                                ...(nextIsGroup && nextName ? { group_subject: nextName } : {}),
                                ...(nextAttribution !== undefined ? { attribution: nextAttribution } : {}),
                                customer: {
                                  ...(t.customer || {}),
                                  ...(nextName ? { full_name: nextName } : {}),
                                  ...(nextPhone !== undefined ? { phone: nextPhone || "" } : {}),
                                  ...(nextAvatar !== undefined ? { avatar_url: nextAvatar } : {}),
                                },
                              }
                            : t,
                        ),
                      );
                    }}
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
                    <ImageIcon className="size-3.5 text-warning-strong" />
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
                message_type: data.message_type as any,
                payload: data.payload,
                attachments: data.attachments || [],
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
                attachments: data.attachments || [],
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

      {/* Modal Excluir Contato e Histórico Definitivamente */}
      <Dialog open={deleteContactModalOpen} onOpenChange={setDeleteContactModalOpen}>
        <DialogContent className="sm:max-w-md p-6 space-y-4 border-border/80 rounded-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" />
              <span>Excluir Contato</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Esta ação expurga o contato e todo o histórico de conversas do sistema e do CRM da loja. Ideal para números de marketing descartáveis ou inválidos. Ação restrita a administradores.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteContactModalOpen(false)}
              disabled={isDeletingContact}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteContactPermanently}
              disabled={isDeletingContact}
              className="h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer"
            >
              {isDeletingContact && <Loader2 className="size-4 animate-spin" />}
              Confirmar Exclusão Definitiva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Supervisão: Auditoria de Solicitações de Exclusão da Equipe */}
      <Dialog open={supervisorRequestsModalOpen} onOpenChange={setSupervisorRequestsModalOpen}>
        <DialogContent className="sm:max-w-xl p-6 space-y-4 border-border/80 rounded-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <span>Solicitações de Exclusão de Contatos</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Solicitações encaminhadas pelos colaboradores da equipe. Avalie a justificativa antes de autorizar a exclusão permanente do contato e histórico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {isLoadingDeletionRequests ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span>Carregando solicitações pendentes...</span>
              </div>
            ) : pendingDeletionRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground rounded-lg border border-border/60 bg-muted/20">
                <span>Nenhuma solicitação pendente de exclusão no momento.</span>
              </div>
            ) : (
              pendingDeletionRequests.map((req) => (
                <div key={req.id} className="p-3 rounded-lg border border-border/70 bg-card space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground truncate">
                      {req.thread?.guest_name || req.thread?.entity_id || "Contato"}
                    </span>
                    <span className="text-2xs text-muted-foreground font-mono">
                      {new Date(req.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-muted-foreground bg-muted/30 p-2 rounded text-xs italic">
                    "{req.reason}"
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-2xs text-muted-foreground">
                      Solicitado por: <strong className="text-foreground">{req.requester?.full_name || "Colaborador"}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={Boolean(isReviewingRequest)}
                        onClick={() => handleReviewDeletionRequest(req.id, false)}
                        className="h-11 min-h-11 px-3 text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        Recusar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={Boolean(isReviewingRequest)}
                        onClick={() => handleReviewDeletionRequest(req.id, true)}
                        className="h-11 min-h-11 px-3 text-xs font-bold gap-1 cursor-pointer"
                      >
                        {isReviewingRequest === req.id && <Loader2 className="size-3.5 animate-spin" />}
                        Aprovar Exclusão
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="flex flex-row justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSupervisorRequestsModalOpen(false)}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Colaborador: Solicitar Exclusão de Contato ao Supervisor */}
      <Dialog open={requestDeletionModalOpen} onOpenChange={setRequestDeletionModalOpen}>
        <DialogContent className="sm:max-w-md p-6 space-y-4 border-border/80 rounded-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="size-5 text-warning-strong" />
              <span>Solicitar Exclusão ao Supervisor</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Como medida de segurança, a exclusão definitiva de contatos e históricos exige autorização de um supervisor. Informe o motivo abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Justificativa da exclusão <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={requestDeletionReason}
              onChange={(e) => setRequestDeletionReason(e.target.value)}
              placeholder="Ex: Contato inválido/trocado, spam repetitivo, ou solicitação expressa do cliente."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRequestDeletionModalOpen(false)}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSubmittingDeletionRequest || !requestDeletionReason.trim()}
              onClick={handleRequestContactDeletion}
              className="h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer"
            >
              {isSubmittingDeletionRequest && <Loader2 className="size-4 animate-spin" />}
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estúdio de Voz IA (Personas, Sotaques Regionais, Ambientes Acústicos e PTT) */}
      <WhatsAppVoiceStudioModal
        open={voiceStudioModalOpen}
        onOpenChange={setVoiceStudioModalOpen}
        threadId={activeThread?.id || ""}
        storeId={store?.id}
        initialText={text}
        onVoiceSent={() => {
          setText("");
          if (activeThreadId) {
            getChatMessages({ data: { threadId: activeThreadId } })
              .then((res: any) => setMessages(res?.messages || []))
              .catch(() => {});
          }
        }}
      />

      {/* Lightbox para Mídia / Imagens / Figurinhas Expandidas */}
      <Dialog open={Boolean(lightboxUrl)} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="sm:max-w-3xl p-2 bg-background border-border/80 flex flex-col items-center justify-center">
          <DialogHeader className="sr-only">
            <DialogTitle>Visualização de Mídia</DialogTitle>
          </DialogHeader>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Mídia expandida"
              className="max-h-full max-w-full object-contain rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}