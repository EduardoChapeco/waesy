import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Pin,
  Folder,
  FolderPlus,
  FolderKanban,
  MessageSquare,
  Plus,
  Bot,
  Clock,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Check,
  CheckCheck,
  FileText,
  Brain,
  Copy,
  CornerDownLeft,
  X,
  Calendar,
  Trash2,
  Zap,
  Link2,
  TrendingUp,
  SquarePen,
  MoreHorizontal,
  Pencil,
  PanelRight,
  Terminal,
  Activity,
  Globe,
  MapPin,
  ExternalLink,
  Archive,
  Palette,
  Layers,
  LayoutTemplate,
  Presentation,
  FileSpreadsheet,
  Sparkles,
} from "lucide-react";
import {
  CANVA_TEMPLATE_CATEGORIES,
  CANVA_STUDIO_TEMPLATES,
  CANVA_BUILDER_ELEMENTS,
  type CanvaTemplatePreset,
  type CanvaBuilderElementCard,
} from "@/lib/builder/canva-post-templates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/datetime";
import { AIActivityTrail, type AIActivityStep } from "./ai-activity-trail";
import { ChatArtifactCard, type ChatArtifactData } from "./chat-artifact-card";
import { ChatComposer, type QuotedMessage } from "./chat-composer";
import { StructuredMessageView, type AIChatAction } from "./structured-message-view";
import { CopilotMessageRenderer } from "./copilot-message-renderer";
import { CopilotArtifactPanel } from "./copilot-artifact-panel";
import type { CopilotFsmPhase, CopilotFsmExecutionState } from "@/types/copilot-fsm";
import type { ChatSourceItem, CopilotQuickToolMode } from "@/types/chat";
import { CopilotSkillsCenter } from "./copilot-skills-center";
import {
  CopilotBackgroundTasksDrawer,
  type BackgroundTaskItem,
} from "./copilot-background-tasks-drawer";
import { CopilotScheduledTasksView } from "./copilot-scheduled-tasks-view";
import { CopilotConnectorsCenter } from "./copilot-connectors-center";
import { CopilotAnalyticsDashboard } from "./copilot-analytics-dashboard";
import {
  CopilotProjectKnowledgePanel,
  type CopilotProjectKnowledgePanelProps,
} from "./copilot-project-knowledge-panel";
import type {
  CopilotFolderDTO,
  CopilotProjectDTO,
  CopilotProjectFileDTO,
} from "@/services/copilot-projects.functions";

export type ThreadType = "store" | "direct_p2p" | "support" | "project" | "ai_assistant";

export interface ChatThreadItem {
  id: string;
  type: ThreadType;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  lastMessageSnippet?: string;
  lastMessageAt?: string;
  createdAt?: string;
  unreadCount?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  folderId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, any>;
  workingMemory?: Record<string, any>;
}

export interface ChatMessageItem {
  id: string;
  clientMessageId?: string;
  threadId: string;
  executionId?: string;
  senderId?: string;
  senderName: string;
  isStaffOrAI: boolean;
  avatarUrl?: string;
  text: string;
  createdAt: string;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  fsmPhase?: CopilotFsmPhase;
  fsmState?: CopilotFsmExecutionState;
  replyTo?: QuotedMessage;
  activitySteps?: AIActivityStep[];
  artifact?: ChatArtifactData;
  structuredPayload?: Record<string, any>;
  attachments?: string[];
  sources?: ChatSourceItem[];
  reactions?: Record<string, number>;
  toolCalls?: any[];
}

export interface AIChatShellProps {
  threads: ChatThreadItem[];
  activeThreadId?: string;
  messages: ChatMessageItem[];
  onSelectThread: (threadId: string) => void;
  onSendMessage: (
    text: string,
    attachments?: string[],
    replyToId?: string,
    overrideMode?: CopilotQuickToolMode,
  ) => Promise<void> | void;
  onUploadAttachment?: (file: File) => Promise<string | null>;
  onRetryMessage?: (messageId: string) => void;
  onCancelActiveRun?: () => void;
  onCreateThread?: (
    type: ThreadType,
    title: string,
    options?: { folderId?: string | null; projectId?: string | null },
  ) => void;
  onRenameThread?: (threadId: string, newTitle: string) => Promise<void> | void;
  onDeleteThread?: (threadId: string) => void;
  onTogglePinThread?: (threadId: string) => void;
  onToggleArchiveThread?: (threadId: string) => void;
  onStructuredAction?: (action: AIChatAction) => void | Promise<void>;
  folders?: CopilotFolderDTO[];
  projects?: CopilotProjectDTO[];
  selectedFolderId?: string | null;
  selectedProjectId?: string | null;
  onSelectFolder?: (folderId: string | null) => void;
  onSelectProject?: (projectId: string | null) => void;
  onCreateFolder?: (name: string) => Promise<void> | void;
  onCreateProject?: (payload: {
    title: string;
    folderId?: string | null;
  }) => Promise<unknown> | void;
  onAssignThreadHierarchy?: (
    threadId: string,
    hierarchy: { folderId?: string | null; projectId?: string | null },
  ) => Promise<void> | void;
  projectFiles?: CopilotProjectFileDTO[];
  isLoadingProjectFiles?: boolean;
  onUploadProjectFile?: CopilotProjectKnowledgePanelProps["onUploadFile"];
  onDeleteProjectFile?: CopilotProjectKnowledgePanelProps["onDeleteFile"];
  onUpdateProjectInstructions?: CopilotProjectKnowledgePanelProps["onUpdateInstructions"];
  sources?: ChatSourceItem[];
  backgroundTasks?: BackgroundTaskItem[];
  onCancelBackgroundTask?: (taskId: string) => void;
  onRefreshBackgroundTasks?: () => void;
  quickToolMode?: CopilotQuickToolMode;
  onQuickToolModeChange?: (mode: CopilotQuickToolMode) => void;
  onOpenComputer?: () => void;
  computerStepsCount?: number;
  onOpenTelemetry?: () => void;
  extraHeaderActions?: React.ReactNode;
  contextAccessLabel?: string;
  isSending?: boolean;
  isStreaming?: boolean;
  currentUserProfileId?: string;
  mode?: "workspace" | "concierge";
  className?: string;
  mobileTitle?: string;
  mobileSubtitle?: string;
  mobileFallbackHref?: string;
}

const THREAD_TYPE_LABELS: Record<string, string> = {
  ai_assistant: "Assessor IA",
  project: "Projeto Operacional",
  direct: "Conversa Direta",
  support: "Atendimento",
};

const MEMORY_KEY_LABELS: Record<string, string> = {
  last_places_query: "Última busca",
  last_travel_destination: "Destino",
  last_creative_topic: "Tema criativo",
  last_mining_task: "Última mineração",
  last_platform_search: "Busca na plataforma",
  last_interaction_topic: "Tópico recente",
  active_city: "Cidade ativa",
  active_niche: "Vertical ativa",
};

const MEMORY_VALUE_LABELS: Record<string, string> = {
  lodging_tourism: "Hospedagem & Turismo",
  food_service: "Gastronomia & Delivery",
  beauty_wellness: "Beleza & Bem-Estar",
  retail_commerce: "Comércio & Varejo",
  services: "Serviços Profissionais",
  spreadsheet: "Planilha Estruturada",
  document: "Documento Técnico",
};

function formatWorkingMemoryLabel(key: string): string {
  return MEMORY_KEY_LABELS[key] || key.replace(/_/g, " ");
}

function formatWorkingMemoryValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") {
    return MEMORY_VALUE_LABELS[val] || val;
  }
  if (typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }
  if (Array.isArray(val)) {
    return val.map((item) => formatWorkingMemoryValue(item)).filter(Boolean).join(", ") || "—";
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const summary =
      obj.query ||
      obj.term ||
      obj.topic ||
      obj.city ||
      obj.category ||
      obj.niche ||
      obj.title ||
      obj.name ||
      (typeof obj.total === "number" ? `${obj.total} resultados` : null) ||
      (typeof obj.count === "number" ? `${obj.count} itens` : null);
    if (summary) return String(summary);
    const pairs = Object.entries(obj)
      .filter(([, v]) => typeof v === "string" || typeof v === "number")
      .slice(0, 2)
      .map(([, v]) => String(v));
    return pairs.length > 0 ? pairs.join(" · ") : "Sincronizado";
  }
  return String(val);
}

export function AIChatShell({
  threads,
  activeThreadId,
  messages,
  onSelectThread,
  onSendMessage,
  onUploadAttachment,
  onRetryMessage,
  onCancelActiveRun,
  onCreateThread,
  onRenameThread,
  onDeleteThread,
  onTogglePinThread,
  onToggleArchiveThread,
  onStructuredAction,
  folders = [],
  projects = [],
  selectedFolderId,
  selectedProjectId,
  onSelectFolder,
  onSelectProject,
  onCreateFolder,
  onCreateProject,
  onAssignThreadHierarchy,
  projectFiles = [],
  isLoadingProjectFiles = false,
  onUploadProjectFile,
  onDeleteProjectFile,
  onUpdateProjectInstructions,
  sources = [],
  backgroundTasks = [],
  onCancelBackgroundTask,
  onRefreshBackgroundTasks,
  quickToolMode = "default",
  onQuickToolModeChange,
  onOpenComputer,
  computerStepsCount = 0,
  onOpenTelemetry,
  extraHeaderActions,
  contextAccessLabel = "Acesso completo",
  isSending = false,
  isStreaming = false,
  currentUserProfileId: _currentUserProfileId,
  mode = "workspace",
  className,
  mobileTitle,
  mobileSubtitle,
  mobileFallbackHref,
}: AIChatShellProps) {
  // Estados de navegação, Dual-Sidebar (Módulos + Contextual) e inspetor
  const [sidebarSection, setSidebarSection] = useState<"chats" | "studio" | "builders">("chats");
  const [studioCategory, setStudioCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<
    "chat" | "skills" | "schedule" | "connectors" | "analytics"
  >("chat");
  const [tasksDrawerOpen, setTasksDrawerOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "direct" | "projects" | "archived">("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedExpanded, setPinnedExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"summary" | "knowledge">("summary");
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [replyTo, setReplyTo] = useState<QuotedMessage | null>(null);
  const [showMobileChat, setShowMobileChat] = useState<boolean>(Boolean(activeThreadId));
  const [showContextPanel, setShowContextPanel] = useState<boolean>(false);
  const [showDesktopContextPanel, setShowDesktopContextPanel] = useState<boolean>(true);
  const [activeArtifact, setActiveArtifact] = useState<ChatArtifactData | null>(null);
  const [internalFolderId, setInternalFolderId] = useState<string | null>(null);
  const [internalProjectId, setInternalProjectId] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<"folder" | "project" | null>(null);
  const [creationDraft, setCreationDraft] = useState("");
  const { isCompact } = useWindowSizeClass();
  const seenArtifactIdsRef = useRef<Set<string>>(new Set());
  const wasSendingRef = useRef(false);
  const prevActiveThreadRef = useRef<string | undefined>(activeThreadId);

  const activeFolderFilter =
    selectedFolderId !== undefined ? selectedFolderId : internalFolderId;
  const activeProjectFilter =
    selectedProjectId !== undefined ? selectedProjectId : internalProjectId;

  const handleFolderSelect = (folderId: string | null) => {
    if (onSelectFolder) onSelectFolder(folderId);
    else setInternalFolderId(folderId);
  };

  const handleProjectSelect = (projectId: string | null) => {
    if (onSelectProject) onSelectProject(projectId);
    else setInternalProjectId(projectId);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Rolagem suave automática ao receber novas mensagens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  // Reset de artefato ao trocar de thread e registro dos artefatos históricos
  useEffect(() => {
    if (prevActiveThreadRef.current !== activeThreadId) {
      prevActiveThreadRef.current = activeThreadId;
      setActiveArtifact(null);
      wasSendingRef.current = false;
      seenArtifactIdsRef.current = new Set(
        messages.filter((m) => m.artifact?.id).map((m) => m.artifact!.id),
      );
    }
  }, [activeThreadId, messages]);

  // Auto-abertura em tempo real do Split-Screen quando novo artefato é gerado na sessão ativa
  useEffect(() => {
    if (isSending || isStreaming) {
      wasSendingRef.current = true;
    }

    const aiArtifacts = messages
      .filter((m) => m.isStaffOrAI && Boolean(m.artifact))
      .map((m) => m.artifact!);

    const latestArtifact = aiArtifacts[aiArtifacts.length - 1];
    if (!latestArtifact) return;

    const alreadySeen = seenArtifactIdsRef.current.has(latestArtifact.id);
    if (!alreadySeen) {
      seenArtifactIdsRef.current.add(latestArtifact.id);
      if (wasSendingRef.current || !isCompact) {
        setActiveArtifact(latestArtifact);
        setShowDesktopContextPanel(true);
        wasSendingRef.current = false;
      }
    }
  }, [messages, isSending, isStreaming, isCompact]);

  // Atualizar visualização mobile ao trocar thread
  useEffect(() => {
    if (activeThreadId) {
      setShowMobileChat(true);
    }
  }, [activeThreadId]);

  const activeThread = useMemo(() => {
    return threads.find((t) => t.id === activeThreadId) || null;
  }, [threads, activeThreadId]);

  const activeThreadProjectId =
    activeThread?.projectId ??
    (activeThread?.metadata?.project_id as string | undefined) ??
    null;

  const activeProject = useMemo(() => {
    const targetId = activeThreadProjectId || activeProjectFilter;
    if (!targetId) return null;
    return projects.find((p) => p.id === targetId) || null;
  }, [projects, activeThreadProjectId, activeProjectFilter]);

  useEffect(() => {
    if (activeArtifact || activeProject) {
      setShowDesktopContextPanel(true);
    }
  }, [activeArtifact, activeProject]);

  const handleApplyCanvaTemplate = (tpl: CanvaTemplatePreset) => {
    const format =
      tpl.aspectRatio === "9:16"
        ? "story"
        : tpl.aspectRatio === "4:5"
          ? "portrait"
          : tpl.aspectRatio === "16:9"
            ? "landscape"
            : "feed";
    const studioArtifact: ChatArtifactData = {
      id: `studio-tpl-${tpl.id}`,
      type: "creative_post",
      title: tpl.name,
      version: 1,
      totalVersions: 1,
      authorName: "Estúdio Canva Waesy",
      authorRole: tpl.categoryLabel,
      previewSummary: tpl.subheadline,
      data: {
        format,
        aspectRatio: tpl.aspectRatio,
        archetype: tpl.archetype,
        themeId: tpl.themeId,
        badge: tpl.badge,
        headline: tpl.headline,
        subheadline: tpl.subheadline,
        bullets: tpl.bullets,
        offerBadge: tpl.offerBadge,
        offerPrice: tpl.offerPrice,
        installments: tpl.installments,
        ctaText: tpl.ctaText,
        storeName: "Sua Marca",
        locationLabel: tpl.locationLabel,
        hashtags: tpl.hashtags,
      },
    };
    setViewMode("chat");
    setActiveArtifact(studioArtifact);
    setShowDesktopContextPanel(true);
    setShowContextPanel(false);
    onQuickToolModeChange?.("creative_post");
  };

  const handleApplyBuilderElement = (el: CanvaBuilderElementCard) => {
    const baseTemplate = CANVA_STUDIO_TEMPLATES[0];
    const currentIsCreative =
      activeArtifact &&
      (activeArtifact.type === "creative_post" || activeArtifact.type === "social_post");
    const baseData: Record<string, any> = currentIsCreative
      ? { ...(activeArtifact.data || {}) }
      : {
          aspectRatio: baseTemplate.aspectRatio,
          archetype: baseTemplate.archetype,
          themeId: baseTemplate.themeId,
          badge: baseTemplate.badge,
          headline: baseTemplate.headline,
          subheadline: baseTemplate.subheadline,
          bullets: baseTemplate.bullets,
          offerBadge: baseTemplate.offerBadge,
          offerPrice: baseTemplate.offerPrice,
          installments: baseTemplate.installments,
          ctaText: baseTemplate.ctaText,
          storeName: "Sua Marca",
          locationLabel: baseTemplate.locationLabel,
          hashtags: baseTemplate.hashtags,
        };

    const nextRatio = el.applyPatch.aspectRatio || baseData.aspectRatio || "1:1";
    const nextFormat =
      nextRatio === "9:16"
        ? "story"
        : nextRatio === "4:5"
          ? "portrait"
          : nextRatio === "16:9"
            ? "landscape"
            : "feed";

    const nextArtifact: ChatArtifactData = {
      id: currentIsCreative ? activeArtifact!.id : `studio-el-${el.id}`,
      type: "creative_post",
      title: currentIsCreative ? activeArtifact!.title : `Peça com ${el.label}`,
      version: currentIsCreative ? (activeArtifact!.version || 1) + 1 : 1,
      authorName: "Estúdio Canva Waesy",
      authorRole: "Editor Visual em Tempo Real",
      data: {
        ...baseData,
        ...el.applyPatch,
        format: nextFormat,
        aspectRatio: nextRatio,
      },
    };

    setViewMode("chat");
    setActiveArtifact(nextArtifact);
    setShowDesktopContextPanel(true);
    setShowContextPanel(false);
    onQuickToolModeChange?.("creative_post");
  };

  const handleLaunchBuilder = (
    builderKind: "creative_post" | "presentation" | "document" | "spreadsheet" | "website_builder",
  ) => {
    setViewMode("chat");
    if (builderKind === "creative_post") {
      setSidebarSection("studio");
      handleApplyCanvaTemplate(CANVA_STUDIO_TEMPLATES[0]);
      return;
    }
    if (builderKind === "presentation") {
      const slideTpl =
        CANVA_STUDIO_TEMPLATES.find((t) => t.aspectRatio === "16:9") ||
        CANVA_STUDIO_TEMPLATES[0];
      handleApplyCanvaTemplate({ ...slideTpl, aspectRatio: "16:9", archetype: "presentation" });
      return;
    }
    if (builderKind === "document") {
      onQuickToolModeChange?.("document");
      setActiveArtifact({
        id: "builder-doc-preview",
        type: "document",
        title: "Documento & Proposta Executiva",
        version: 1,
        authorName: "Builder Documentos Waesy",
        authorRole: "Estrutura em Tempo Real",
        previewSummary: "Editor estruturado com blocos, cronograma e exportação PDF.",
        data: {
          docType: "document",
          sections: [
            { title: "Objetivo & Escopo", content: "Descreva no chat o cliente, serviço e prazos para gerar automaticamente a proposta completa." },
            { title: "Condições Comerciais", content: "Valores, parcelamento e entrega imediata." },
          ],
        },
      });
      setShowDesktopContextPanel(true);
      setShowContextPanel(false);
      return;
    }
    if (builderKind === "spreadsheet") {
      onQuickToolModeChange?.("document");
      setActiveArtifact({
        id: "builder-sheet-preview",
        type: "spreadsheet",
        title: "Planilha Financeira & Operacional",
        version: 1,
        authorName: "Builder Planilhas Waesy",
        authorRole: "Análise Tabular CSV",
        previewSummary: "Visualização tabular em tempo real pronta para edição e download CSV.",
        data: {
          headers: ["Item / Canal", "Quantidade", "Receita / Valor", "Status"],
          dataRows: [
            ["Vendas Diretas", "12", "R$ 4.800,00", "Ativo"],
            ["Campanhas Canva", "8", "R$ 3.200,00", "Em Destaque"],
          ],
        },
      });
      setShowDesktopContextPanel(true);
      setShowContextPanel(false);
      return;
    }
    onQuickToolModeChange?.("website_builder");
    setActiveArtifact({
      id: "builder-site-preview",
      type: "website",
      title: "Landing Page & Site Conversacional",
      version: 1,
      authorName: "Builder Web Waesy",
      authorRole: "Estrutura de Alta Conversão",
      previewSummary: "Descreva o negócio no chat para gerar seções reais de Hero, Ofertas e WhatsApp.",
      data: {
        docType: "website",
        headline: "Página Comercial de Alta Conversão",
        sections: [
          { title: "Hero Principal", content: "Chamada persuasiva + CTA WhatsApp" },
          { title: "Benefícios & Prova Social", content: "Diferenciais locais com visual limpo" },
        ],
      },
    });
    setShowDesktopContextPanel(true);
    setShowContextPanel(false);
  };

  const handleBlockAction = (action: AIChatAction) => {
    if (action.action_type === "open_artifact") {
      const payload = (action.payload || {}) as Record<string, any>;
      const matched = payload.artifact_id
        ? messages.find((m) => m.artifact?.id === payload.artifact_id)?.artifact
        : undefined;
      if (matched) {
        const mergedData =
          payload.data && typeof payload.data === "object"
            ? { ...(matched.data || {}), ...payload.data }
            : matched.data;
        setActiveArtifact({ ...matched, data: mergedData });
      } else {
        setActiveArtifact({
          id: String(payload.artifact_id || `inline-artifact-${Date.now()}`),
          type: (payload.type || "creative_post") as any,
          title: String(payload.title || "Arte Estúdio Canva"),
          version: 1,
          authorName: "Estúdio Canva Waesy",
          authorRole: "Tempo Real",
          data: (payload.data || payload) as Record<string, any>,
        });
      }
      setShowDesktopContextPanel(true);
      setShowContextPanel(false);
      return;
    }
    onStructuredAction?.(action);
  };

  const visibleProjects = useMemo(() => {
    if (!activeFolderFilter) return projects;
    return projects.filter((p) => p.folder_id === activeFolderFilter);
  }, [projects, activeFolderFilter]);

  // Filtragem e busca de threads (respeita Pasta / Projeto selecionados)
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      const threadFolderId = t.folderId ?? t.metadata?.folder_id ?? null;
      const threadProjectId = t.projectId ?? t.metadata?.project_id ?? null;

      if (activeFolderFilter) {
        const projectMatchesFolder = projects.some(
          (p) => p.id === threadProjectId && p.folder_id === activeFolderFilter,
        );
        if (threadFolderId !== activeFolderFilter && !projectMatchesFolder) {
          return false;
        }
      }

      if (activeProjectFilter && threadProjectId !== activeProjectFilter) {
        return false;
      }

      if (filterTab === "archived") {
        if (Boolean(t.isArchived) === false) return false;
      } else {
        if (Boolean(t.isArchived) === true) return false;
        if (filterTab === "projects" && t.type !== "project" && !threadProjectId) return false;
        if (filterTab === "direct" && (t.type === "project" || Boolean(threadProjectId))) {
          return false;
        }
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          (Boolean(t.lastMessageSnippet) && t.lastMessageSnippet!.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [threads, projects, activeFolderFilter, activeProjectFilter, filterTab, searchQuery]);

  // Agrupamento de threads fixadas vs normais
  const pinnedThreads = useMemo(() => filteredThreads.filter((t) => Boolean(t.isPinned)), [filteredThreads]);
  const standardThreads = useMemo(() => filteredThreads.filter((t) => Boolean(t.isPinned) === false), [filteredThreads]);

  // Agrupamento de mensagens por separador de data
  const messagesWithSeparators = useMemo(() => {
    const list: Array<{ type: "separator" | "message"; date?: string; message?: ChatMessageItem }> = [];
    let lastDateStr = "";

    messages.forEach((msg) => {
      const dateStr = new Date(msg.createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      if (dateStr !== lastDateStr) {
        list.push({ type: "separator", date: dateStr });
        lastDateStr = dateStr;
      }
      list.push({ type: "message", message: msg });
    });

    return list;
  }, [messages]);

  const handleReplyClick = (msg: ChatMessageItem) => {
    setReplyTo({
      id: msg.id,
      senderName: msg.senderName,
      text: msg.text || "Conteúdo interativo",
    });
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  return (
    <div
      className={cn(
        "flex h-full w-full overflow-hidden bg-background font-sans text-foreground",
        className
      )}
    >
      {/* ── COLUNA 1A: RAIL PRINCIPAL DE MÓDULOS (Chat, Canva, Builders, Skills, Tarefas) ── */}
      <nav
        aria-label="Módulos principais do Copilot"
        className="w-16 hidden md:flex flex-col items-center py-3 px-2 gap-2 border-r border-border/40 bg-sidebar/60 shrink-0 overflow-y-auto no-scrollbar"
      >
        {[
          {
            id: "chats",
            label: "Chats",
            icon: MessageSquare,
            action: () => {
              setSidebarSection("chats");
              setViewMode("chat");
            },
          },
          {
            id: "studio",
            label: "Canva",
            icon: Palette,
            action: () => {
              setSidebarSection("studio");
              setViewMode("chat");
            },
          },
          {
            id: "builders",
            label: "Builders",
            icon: Layers,
            action: () => {
              setSidebarSection("builders");
              setViewMode("chat");
            },
          },
          {
            id: "skills",
            label: "Skills",
            icon: Zap,
            action: () => {
              setSidebarSection("chats");
              setViewMode("skills");
            },
          },
          {
            id: "tasks",
            label: "Tarefas",
            icon: Clock,
            action: () => setTasksDrawerOpen(true),
          },
          ...(mode === "workspace"
            ? [
                {
                  id: "schedule",
                  label: "Agenda",
                  icon: Calendar,
                  action: () => {
                    setSidebarSection("chats");
                    setViewMode("schedule");
                  },
                },
                {
                  id: "connectors",
                  label: "Apps",
                  icon: Link2,
                  action: () => {
                    setSidebarSection("chats");
                    setViewMode("connectors");
                  },
                },
                {
                  id: "analytics",
                  label: "Métricas",
                  icon: TrendingUp,
                  action: () => {
                    setSidebarSection("chats");
                    setViewMode("analytics");
                  },
                },
              ]
            : []),
        ].map((mod) => {
          const Icon = mod.icon;
          const isModuleActive =
            (mod.id === "chats" && sidebarSection === "chats" && viewMode === "chat") ||
            (mod.id === "studio" && sidebarSection === "studio") ||
            (mod.id === "builders" && sidebarSection === "builders") ||
            (mod.id === "skills" && viewMode === "skills") ||
            (mod.id === "schedule" && viewMode === "schedule") ||
            (mod.id === "connectors" && viewMode === "connectors") ||
            (mod.id === "analytics" && viewMode === "analytics");
          return (
            <button
              key={mod.id}
              type="button"
              onClick={mod.action}
              aria-current={isModuleActive ? "page" : undefined}
              className={cn(
                "w-full min-h-11 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-2xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isModuleActive
                  ? "bg-background text-foreground border border-border/60 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
              title={mod.label}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate max-w-full leading-none">{mod.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── COLUNA 1B: SIDEBAR CONTEXTUAL (Pastas/Chats, Estúdio Canva ou Builders) ── */}
      <aside
        className={cn(
          "w-full sm:w-72 md:w-72 border-r border-border/40 bg-sidebar/40 flex-col shrink-0 transition-colors",
          showMobileChat ? "hidden md:flex" : "flex"
        )}
      >
        {/* Cabeçalho Nativo Mobile */}
        <div className="md:hidden">
          <NativeMobileHeader
            title={mobileTitle || "Waesy Copilot"}
            subtitle={mobileSubtitle}
            fallbackHref={mobileFallbackHref || "/"}
            mobileOnly
          />
        </div>

        {/* Barra de Módulos no Mobile (< 768px) */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto waesy-tab-strip px-3 py-2 border-b border-border/40 bg-sidebar/50 shrink-0">
          {[
            { id: "chats", label: "Chats", icon: MessageSquare, onPress: () => { setSidebarSection("chats"); setViewMode("chat"); } },
            { id: "studio", label: "Canva Studio", icon: Palette, onPress: () => { setSidebarSection("studio"); setViewMode("chat"); } },
            { id: "builders", label: "Builders", icon: Layers, onPress: () => { setSidebarSection("builders"); setViewMode("chat"); } },
            { id: "skills", label: "Skills", icon: Zap, onPress: () => setViewMode("skills") },
          ].map((tab) => {
            const TabIcon = tab.icon;
            const active =
              (tab.id === "chats" && sidebarSection === "chats" && viewMode === "chat") ||
              (tab.id === "studio" && sidebarSection === "studio") ||
              (tab.id === "builders" && sidebarSection === "builders") ||
              (tab.id === "skills" && viewMode === "skills");
            return (
              <button
                key={tab.id}
                type="button"
                onClick={tab.onPress}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-background text-foreground border border-border/60 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <TabIcon className="size-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {sidebarSection === "studio" ? (
          <CanvaStudioSidebarSection
            activeCategory={studioCategory}
            onCategoryChange={setStudioCategory}
            onSelectTemplate={handleApplyCanvaTemplate}
            onApplyElement={handleApplyBuilderElement}
            onBackToChats={() => setSidebarSection("chats")}
            onAskAiForTemplate={(tpl) => {
              setViewMode("chat");
              setShowMobileChat(true);
              void onSendMessage(
                `Crie uma arte no formato ${tpl.aspectRatio} usando o estilo "${tpl.name}" com oferta e CTA para ${tpl.categoryLabel}`,
              );
            }}
          />
        ) : sidebarSection === "builders" ? (
          <BuildersSidebarSection
            messages={messages}
            onLaunchBuilder={handleLaunchBuilder}
            onOpenArtifact={(art) => {
              setActiveArtifact(art);
              setShowDesktopContextPanel(true);
              setShowContextPanel(false);
            }}
            onBackToChats={() => setSidebarSection("chats")}
          />
        ) : (
          <>
        {/* Topo da Sidebar: Novo chat + busca + ações de pasta/projeto */}
        <div className="p-3 border-b border-border/40 space-y-2">
          <div className="flex items-center gap-1">
            {onCreateThread && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setViewMode("chat");
                  onCreateThread(
                    activeProjectFilter ? "project" : "ai_assistant",
                    activeProjectFilter ? "Conversa do Projeto" : "Novo chat",
                    {
                      folderId: activeFolderFilter,
                      projectId: activeProjectFilter,
                    },
                  );
                }}
                className="flex-1 h-11 min-h-11 px-3 justify-start rounded-xl text-xs font-medium text-foreground hover:bg-muted/60 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Criar novo chat"
              >
                <SquarePen className="size-4 text-muted-foreground shrink-0" />
                <span className="truncate">Novo chat</span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen((prev) => !prev)}
              className={cn(
                "size-11 min-h-11 min-w-11 rounded-xl shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                searchOpen
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
              title="Buscar conversas"
              aria-label="Buscar conversas"
            >
              <Search className="size-4" />
            </Button>

            {onCreateFolder && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setCreationMode((prev) => (prev === "folder" ? null : "folder"));
                  setCreationDraft("");
                }}
                className="size-11 min-h-11 min-w-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Nova Pasta"
                aria-label="Nova Pasta"
              >
                <FolderPlus className="size-4" />
              </Button>
            )}

            {onCreateProject && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setCreationMode((prev) => (prev === "project" ? null : "project"));
                  setCreationDraft("");
                }}
                className="size-11 min-h-11 min-w-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Novo Projeto"
                aria-label="Novo Projeto"
              >
                <FolderKanban className="size-4" />
              </Button>
            )}
          </div>

          {creationMode && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const clean = creationDraft.trim();
                if (clean.length < 2) return;
                if (creationMode === "folder" && onCreateFolder) {
                  await onCreateFolder(clean);
                } else if (creationMode === "project" && onCreateProject) {
                  await onCreateProject({
                    title: clean,
                    folderId: activeFolderFilter,
                  });
                }
                setCreationDraft("");
                setCreationMode(null);
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={creationDraft}
                onChange={(e) => setCreationDraft(e.target.value)}
                placeholder={
                  creationMode === "folder"
                    ? "Nome da pasta..."
                    : "Nome do projeto..."
                }
                className="h-11 min-h-11 text-xs flex-1 rounded-xl bg-background"
              />
              <Button type="submit" className="h-11 min-h-11 px-3 rounded-xl text-xs font-medium">
                Criar
              </Button>
            </form>
          )}

          {searchOpen && (
            <div className="relative pt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar conversas..."
                className="h-11 min-h-11 pl-9 pr-3 rounded-xl bg-background/80 border-border/50 text-xs placeholder:text-muted-foreground"
              />
            </div>
          )}

          {/* Filtros discretos */}
          <div className="flex items-center flex-wrap gap-1 pt-1">
            {[
              { id: "all", label: "Todas" },
              { id: "direct", label: "Chats" },
              ...(mode === "workspace" ? [{ id: "projects", label: "Projetos" }] : []),
              { id: "archived", label: "Arquivo" },
            ].map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant="ghost"
                onClick={() => setFilterTab(tab.id as any)}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filterTab === tab.id
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Lista Rolável Unificada: Fixados + Pastas/Projetos + Conversas */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3 no-scrollbar">
          {/* Seção Fixados */}
          {pinnedThreads.length > 0 && (
            <div className="space-y-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPinnedExpanded((prev) => !prev)}
                className="w-full h-11 min-h-11 px-2 justify-between rounded-xl text-2xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-2">
                  <Pin className="size-3" />
                  <span>Fixados</span>
                </span>
                {pinnedExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              </Button>

              {pinnedExpanded &&
                pinnedThreads.map((thread) => (
                  <ThreadListItem
                    key={thread.id}
                    thread={thread}
                    isActive={thread.id === activeThreadId}
                    isRenaming={renamingThreadId === thread.id}
                    renameDraft={renameDraft}
                    onRenameDraftChange={setRenameDraft}
                    onCommitRename={async (nextTitle) => {
                      if (onRenameThread && nextTitle.trim().length >= 2) {
                        await onRenameThread(thread.id, nextTitle.trim());
                      }
                      setRenamingThreadId(null);
                    }}
                    onCancelRename={() => setRenamingThreadId(null)}
                    onStartRename={
                      onRenameThread
                        ? () => {
                            setRenamingThreadId(thread.id);
                            setRenameDraft(thread.title);
                          }
                        : undefined
                    }
                    onClick={() => {
                      setViewMode("chat");
                      onSelectThread(thread.id);
                      setShowMobileChat(true);
                    }}
                    onTogglePin={onTogglePinThread}
                    onToggleArchive={onToggleArchiveThread}
                    onDelete={onDeleteThread}
                  />
                ))}
            </div>
          )}

          {/* Seção Pastas & Projetos */}
          {(folders.length > 0 || visibleProjects.length > 0) && (
            <div className="space-y-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setProjectsExpanded((prev) => !prev)}
                className="w-full h-11 min-h-11 px-2 justify-between rounded-xl text-2xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-2">
                  <FolderKanban className="size-3" />
                  <span>Projetos</span>
                </span>
                {projectsExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              </Button>

              {projectsExpanded && (
                <div className="space-y-1">
                  {folders.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 px-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          handleFolderSelect(null);
                          handleProjectSelect(null);
                        }}
                        className={cn(
                          "h-11 min-h-11 px-3 rounded-xl text-xs whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          !activeFolderFilter
                            ? "bg-muted text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Todas
                      </Button>
                      {folders.map((folder) => (
                        <Button
                          key={folder.id}
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            const nextFolder = activeFolderFilter === folder.id ? null : folder.id;
                            handleFolderSelect(nextFolder);
                            handleProjectSelect(null);
                          }}
                          className={cn(
                            "h-11 min-h-11 px-3 rounded-xl text-xs whitespace-nowrap gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            activeFolderFilter === folder.id
                              ? "bg-muted text-foreground font-medium"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Folder className="size-3.5" />
                          <span>{folder.name}</span>
                        </Button>
                      ))}
                    </div>
                  )}

                  {(showAllProjects ? visibleProjects : visibleProjects.slice(0, 5)).map((proj) => (
                    <Button
                      key={proj.id}
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        handleProjectSelect(activeProjectFilter === proj.id ? null : proj.id)
                      }
                      className={cn(
                        "w-full h-11 min-h-11 px-3 rounded-xl text-xs font-medium justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        activeProjectFilter === proj.id
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <FolderKanban className="size-3.5 shrink-0" />
                        <span className="truncate">{proj.title}</span>
                      </span>
                      {typeof proj.file_count === "number" && proj.file_count > 0 && (
                        <span className="text-2xs opacity-75 font-mono shrink-0">
                          {proj.file_count}
                        </span>
                      )}
                    </Button>
                  ))}

                  {visibleProjects.length > 5 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowAllProjects((prev) => !prev)}
                      className="w-full h-11 min-h-11 px-3 justify-start rounded-xl text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {showAllProjects
                        ? "Mostrar menos"
                        : `Mostrar mais (${visibleProjects.length - 5})`}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Lista de Conversas */}
          <div className="space-y-1">
            {filteredThreads.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground space-y-2">
                <MessageSquare className="size-7 mx-auto text-muted-foreground/40" />
                <p className="text-xs">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              standardThreads.map((thread) => (
                <ThreadListItem
                  key={thread.id}
                  thread={thread}
                  isActive={thread.id === activeThreadId}
                  isRenaming={renamingThreadId === thread.id}
                  renameDraft={renameDraft}
                  onRenameDraftChange={setRenameDraft}
                  onCommitRename={async (nextTitle) => {
                    if (onRenameThread && nextTitle.trim().length >= 2) {
                      await onRenameThread(thread.id, nextTitle.trim());
                    }
                    setRenamingThreadId(null);
                  }}
                  onCancelRename={() => setRenamingThreadId(null)}
                  onStartRename={
                    onRenameThread
                      ? () => {
                          setRenamingThreadId(thread.id);
                          setRenameDraft(thread.title);
                        }
                      : undefined
                  }
                  onClick={() => {
                    setViewMode("chat");
                    onSelectThread(thread.id);
                    setShowMobileChat(true);
                  }}
                  onTogglePin={onTogglePinThread}
                  onToggleArchive={onToggleArchiveThread}
                  onDelete={onDeleteThread}
                />
              ))
            )}
          </div>
        </div>
          </>
        )}
      </aside>

      {/* ── COLUNA 2: STREAM PRINCIPAL + CABEÇALHO ÚNICO CONSOLIDADO ── */}
      <main
        className={cn(
          "flex-1 flex flex-col h-full min-h-0 bg-background transition-colors min-w-0 overflow-hidden relative",
          showMobileChat === false && "hidden md:flex"
        )}
      >
        {/* Cabeçalho Único Minimalista (1 linha h-14 — zero pilhas duplas) */}
        <header className="min-h-14 px-3 sm:px-4 border-b border-border/40 bg-background flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileChat(false)}
              className="size-11 min-h-11 min-w-11 rounded-xl md:hidden text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
              aria-label="Voltar para a lista de conversas"
            >
              <ChevronLeft className="size-5" />
            </Button>

            {viewMode !== "chat" ? (
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setViewMode("chat")}
                  className="h-11 min-h-11 px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronLeft className="size-4" />
                  <span>Conversa</span>
                </Button>
                <span className="text-sm font-semibold text-foreground truncate">
                  {viewMode === "skills"
                    ? "Habilidades"
                    : viewMode === "schedule"
                      ? "Agendamentos"
                      : viewMode === "connectors"
                        ? "Conectores"
                        : "Métricas"}
                </span>
              </div>
            ) : activeThread ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="size-8 rounded-lg bg-muted/50 text-muted-foreground flex items-center justify-center shrink-0">
                  {activeProject ? (
                    <FolderKanban className="size-4" />
                  ) : (
                    <MessageSquare className="size-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground truncate">
                    {activeThread.title}
                  </h2>
                </div>
              </div>
            ) : (
              <span className="text-sm font-semibold text-foreground truncate">
                Copilot
              </span>
            )}
          </div>

          {/* Ações Discretas à Direita */}
          <div className="flex items-center gap-1 shrink-0">
            {extraHeaderActions}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 min-h-11 min-w-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title="Modos e ferramentas do Copilot"
                  aria-label="Modos do Copilot"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-card border-border">
                <DropdownMenuItem onClick={() => setViewMode("chat")} className="min-h-11 gap-2 cursor-pointer">
                  <MessageSquare className="size-4 text-muted-foreground" />
                  <span>Conversa</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode("skills")} className="min-h-11 gap-2 cursor-pointer">
                  <Zap className="size-4 text-muted-foreground" />
                  <span>Habilidades</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTasksDrawerOpen(true)} className="min-h-11 gap-2 cursor-pointer">
                  <Clock className="size-4 text-muted-foreground" />
                  <span>Tarefas em segundo plano</span>
                </DropdownMenuItem>
                {mode === "workspace" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setViewMode("schedule")} className="min-h-11 gap-2 cursor-pointer">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span>Agendamentos</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode("connectors")} className="min-h-11 gap-2 cursor-pointer">
                      <Link2 className="size-4 text-muted-foreground" />
                      <span>Conectores</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode("analytics")} className="min-h-11 gap-2 cursor-pointer">
                      <TrendingUp className="size-4 text-muted-foreground" />
                      <span>Métricas</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {onOpenComputer && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onOpenComputer}
                className="size-11 min-h-11 min-w-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={
                  computerStepsCount > 0
                    ? `Computador do Copilot (${computerStepsCount})`
                    : "Computador do Copilot"
                }
                aria-label="Abrir Computador do Copilot"
              >
                <Terminal className="size-4" />
              </Button>
            )}

            {onOpenTelemetry && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onOpenTelemetry}
                className="size-11 min-h-11 min-w-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Telemetria da sessão"
                aria-label="Telemetria da sessão"
              >
                <Activity className="size-4" />
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isCompact) {
                  setShowContextPanel((prev) => !prev);
                } else {
                  setShowDesktopContextPanel((prev) => !prev);
                }
              }}
              className={cn(
                "size-11 min-h-11 min-w-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer transition-colors",
                (isCompact ? showContextPanel : showDesktopContextPanel)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
              title="Alternar painel lateral"
              aria-label="Alternar painel lateral"
            >
              <PanelRight className="size-4" />
            </Button>
          </div>
        </header>

        {/* Conteúdo Renderizado conforme o ViewMode Ativo */}
        {viewMode === "skills" ? (
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <CopilotSkillsCenter
              onSelectSkill={(skill) => {
                setViewMode("chat");
                void onSendMessage(`Executar habilidade ${skill.name}: ${skill.description}`);
              }}
            />
          </div>
        ) : viewMode === "schedule" ? (
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <CopilotScheduledTasksView />
          </div>
        ) : viewMode === "connectors" ? (
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <CopilotConnectorsCenter />
          </div>
        ) : viewMode === "analytics" ? (
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <CopilotAnalyticsDashboard />
          </div>
        ) : activeThread ? (
          <>
            {/* Linha do Tempo Editorial + Minimapa Discreto */}
            <div className="relative flex-1 min-h-0 flex">
              {messages.length > 1 && (
                <div
                  aria-hidden="true"
                  className="hidden xl:flex flex-col justify-center gap-2 pl-3 pr-1 select-none shrink-0"
                >
                  {messages.slice(-16).map((m) => (
                    <span
                      key={`tick-${m.id}`}
                      className={cn(
                        "h-0.5 rounded-full transition-colors",
                        m.isStaffOrAI ? "w-2 bg-muted-foreground/30" : "w-3 bg-primary/50"
                      )}
                    />
                  ))}
                </div>
              )}

              <div
                role="log"
                aria-live="polite"
                aria-label="Histórico de mensagens da conversa"
                className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 pt-4 pb-24 no-scrollbar overscroll-contain"
              >
                {messages.length === 0 ? (
                  <div className="mx-auto w-full max-w-2xl py-12 text-center space-y-5">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {activeThread.title || "Como posso ajudar hoje?"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Escolha um modo rápido ou descreva o que deseja criar ou consultar.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onQuickToolModeChange?.("website_builder")}
                        className="h-11 min-h-11 rounded-xl gap-2 text-xs bg-card border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Globe className="size-4 text-muted-foreground" />
                        <span>Criar site</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onQuickToolModeChange?.("interactive_map")}
                        className="h-11 min-h-11 rounded-xl gap-2 text-xs bg-card border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <MapPin className="size-4 text-muted-foreground" />
                        <span>Mapas</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto w-full max-w-3xl space-y-5">
                    {messagesWithSeparators.map((item, idx) => {
                      if (item.type === "separator") {
                        return (
                          <div key={`sep-${idx}`} className="flex justify-center my-2">
                            <span className="px-3 py-1 rounded-full bg-muted/40 text-2xs text-muted-foreground font-mono">
                              {item.date}
                            </span>
                          </div>
                        );
                      }

                      const msg = item.message;
                      if (!msg) return null;
                      const isUser = Boolean(msg.isStaffOrAI) === false;

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex flex-col group",
                            isUser ? "items-end" : "items-start"
                          )}
                        >
                          {msg.replyTo && (
                            <div
                              className={cn(
                                "mb-2 px-3 py-1 rounded-lg text-2xs bg-muted/50 border-l-2 border-primary max-w-md truncate",
                                isUser ? "mr-1 text-right" : "ml-1 text-left"
                              )}
                            >
                              <span className="font-semibold text-foreground block truncate">
                                {msg.replyTo.senderName}
                              </span>
                              <span className="text-muted-foreground truncate block">
                                {msg.replyTo.text}
                              </span>
                            </div>
                          )}

                          {msg.text && (
                            <div
                              className={cn(
                                "relative text-sm leading-relaxed",
                                isUser
                                  ? "max-w-lg px-4 py-3 rounded-2xl bg-card border border-border/60 text-foreground"
                                  : "w-full max-w-3xl text-foreground py-1",
                                msg.status === "failed" && "border border-destructive/50 bg-destructive/10 text-destructive px-4 py-3 rounded-2xl"
                              )}
                            >
                              <CopilotMessageRenderer content={msg.text} isUser={isUser} />

                              {isUser && msg.status === "failed" && (
                                <div className="flex items-center justify-end gap-2 mt-2 text-2xs">
                                  <span>Falha no envio</span>
                                  {onRetryMessage && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      onClick={() => onRetryMessage(msg.id)}
                                      className="h-11 min-h-11 px-3 text-xs text-destructive hover:bg-destructive/10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                      <RotateCcw className="size-3.5 mr-1" />
                                      <span>Tentar novamente</span>
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {msg.structuredPayload && (
                            <div className="w-full max-w-2xl mt-2 mb-1">
                              <StructuredMessageView
                                payload={msg.structuredPayload as any}
                                isStaff={msg.isStaffOrAI}
                                onActionClick={handleBlockAction}
                              />
                            </div>
                          )}

                          {msg.artifact && (
                            <div className="w-full max-w-2xl mt-3 mb-1">
                              <ChatArtifactCard
                                artifact={msg.artifact}
                                onOpenBuilder={(art) => {
                                  setActiveArtifact(art);
                                  setShowContextPanel(true);
                                }}
                              />
                            </div>
                          )}

                          {Array.isArray(msg.sources) && msg.sources.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {msg.sources.slice(0, 4).map((src) => (
                                <span
                                  key={src.id}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-card border border-border/50 text-2xs text-muted-foreground"
                                >
                                  <FileText className="size-3 shrink-0" />
                                  <span className="truncate max-w-44">{src.title}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {msg.activitySteps && msg.activitySteps.length > 0 && (
                            <div className="w-full max-w-2xl my-2">
                              <AIActivityTrail
                                steps={msg.activitySteps}
                                executionId={msg.executionId}
                                isStreaming={isStreaming && idx === messagesWithSeparators.length - 1}
                                onCancel={onCancelActiveRun}
                              />
                            </div>
                          )}

                          <div
                            className={cn(
                              "opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 mt-1 text-2xs text-muted-foreground",
                              isUser ? "justify-end" : "justify-start"
                            )}
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => handleReplyClick(msg)}
                              className="h-11 min-h-11 px-3 rounded-xl text-2xs hover:text-foreground cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              title="Responder mensagem"
                            >
                              <CornerDownLeft className="size-3.5" />
                              <span>Responder</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => handleCopyText(msg.text)}
                              className="h-11 min-h-11 px-3 rounded-xl text-2xs hover:text-foreground cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              title="Copiar texto"
                            >
                              <Copy className="size-3.5" />
                              <span>Copiar</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <ChatComposer
              onSendMessage={onSendMessage}
              onUploadFile={onUploadAttachment}
              isSending={isSending}
              onCancelRun={onCancelActiveRun}
              quickToolMode={quickToolMode}
              onQuickToolModeChange={onQuickToolModeChange}
              contextSummary={contextAccessLabel}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              className="shrink-0 sticky bottom-0 z-20"
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
            <div className="size-12 rounded-2xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground">
              <Bot className="size-6" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Nenhuma conversa selecionada
            </h2>
            <p className="text-xs max-w-sm">
              Escolha uma conversa na barra lateral ou inicie um novo chat com o Copilot.
            </p>
            {onCreateThread && (
              <Button
                type="button"
                onClick={() => onCreateThread(mode === "workspace" ? "project" : "ai_assistant", "Novo chat")}
                className="h-11 min-h-11 px-4 rounded-xl text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Iniciar novo chat
              </Button>
            )}
          </div>
        )}
      </main>

      {/* ── COLUNA 3: PAINEL DIREITO SQUIRCLE (Alterações / Resultados / Fontes + Artefato Split-Screen) ── */}
      {(showDesktopContextPanel || Boolean(activeArtifact)) && (
      <aside className="w-80 xl:w-88 border-l border-border/40 bg-background p-3 space-y-3 overflow-y-auto hidden md:flex flex-col shrink-0 no-scrollbar">
        {activeArtifact ? (
          <ArtifactViewerContent
            artifact={activeArtifact}
            onClose={() => setActiveArtifact(null)}
            onSave={(updated) => setActiveArtifact(updated)}
          />
        ) : activeThread ? (
          <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-4">
            {/* Cabeçalho do Cartão */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-foreground truncate">
                  {activeProject ? activeProject.title : "waesy"}
                </h3>
                <p className="text-2xs text-muted-foreground truncate">
                  {THREAD_TYPE_LABELS[activeThread.type] || activeThread.type}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setInspectorTab((prev) => (prev === "summary" ? "knowledge" : "summary"))
                }
                className="size-11 min-h-11 min-w-11 rounded-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                title="Alternar resumo e base do projeto"
                aria-label="Alternar resumo e base do projeto"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </div>

            {inspectorTab === "knowledge" && activeProject && onUploadProjectFile && onDeleteProjectFile ? (
              <CopilotProjectKnowledgePanel
                project={activeProject}
                files={projectFiles}
                isLoadingFiles={isLoadingProjectFiles}
                onUploadFile={onUploadProjectFile}
                onDeleteFile={onDeleteProjectFile}
                onUpdateInstructions={onUpdateProjectInstructions}
              />
            ) : (
              <>
                {/* Vínculo Hierárquico */}
                {onAssignThreadHierarchy && (projects.length > 0 || folders.length > 0) && activeThread.id !== "00000000-0000-0000-0000-000000000001" && (
                  <div className="space-y-2 pb-2 border-b border-border/40">
                    <label
                      htmlFor="copilot-thread-project-select"
                      className="text-2xs font-medium text-muted-foreground block"
                    >
                      Projeto
                    </label>
                    <select
                      id="copilot-thread-project-select"
                      value={activeThreadProjectId || ""}
                      onChange={(e) => {
                        const nextProjId = e.target.value || null;
                        const targetProj = projects.find((p) => p.id === nextProjId);
                        onAssignThreadHierarchy(activeThread.id, {
                          projectId: nextProjId,
                          folderId:
                            targetProj?.folder_id ??
                            activeThread.folderId ??
                            (activeThread.metadata?.folder_id as string | undefined) ??
                            null,
                        });
                      }}
                      className="h-11 min-h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Conversa avulsa</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Alterações */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <FileText className="size-4 text-muted-foreground" />
                    <span>Alterações</span>
                  </span>
                  <span className="font-mono text-2xs">
                    {messages.filter((m) => Boolean(m.artifact)).length}
                  </span>
                </div>

                {/* Resultados */}
                <div className="space-y-2 border-t border-border/40 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Resultados</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        onQuickToolModeChange?.("document");
                      }}
                      className="size-11 min-h-11 min-w-11 rounded-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="Criar um conteúdo"
                      aria-label="Criar um conteúdo"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>

                  {messages.some((m) => Boolean(m.artifact)) ? (
                    <div className="space-y-2">
                      {messages
                        .filter((m) => Boolean(m.artifact))
                        .map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setActiveArtifact(m.artifact!)}
                            className="w-full min-h-11 text-left px-3 py-2 rounded-xl border border-border/50 bg-background hover:bg-muted/40 transition-colors text-xs space-y-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-foreground truncate">
                                {m.artifact!.title}
                              </span>
                              <span className="text-2xs text-muted-foreground font-mono shrink-0">
                                v{m.artifact!.version}
                              </span>
                            </div>
                            <span className="text-2xs text-muted-foreground block truncate">
                              {MEMORY_VALUE_LABELS[m.artifact!.type] || m.artifact!.type}
                            </span>
                          </button>
                        ))}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onQuickToolModeChange?.("website_builder")}
                      className="w-full h-11 min-h-11 px-3 justify-start rounded-xl text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Criar um conteúdo
                    </Button>
                  )}
                </div>

                {/* Fontes */}
                <div className="space-y-2 border-t border-border/40 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Fontes</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setInspectorTab("knowledge")}
                      className="size-11 min-h-11 min-w-11 rounded-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="Gerenciar fontes do projeto"
                      aria-label="Gerenciar fontes"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>

                  {(() => {
                    const combinedSources: ChatSourceItem[] = [
                      ...sources,
                      ...projectFiles
                        .filter((f) => !sources.some((s) => s.id === f.id))
                        .map((f) => ({
                          id: f.id,
                          title: f.filename,
                          kind: "project_file" as const,
                          detail: f.excerpt || f.file_type,
                          url: f.file_url || undefined,
                        })),
                      ...messages.flatMap((m) => m.sources || []),
                    ];
                    const unique = combinedSources.filter(
                      (item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx,
                    );
                    const visible = showAllSources ? unique : unique.slice(0, 4);

                    if (unique.length === 0) {
                      return (
                        <p className="text-2xs text-muted-foreground">
                          Nenhuma fonte vinculada ainda.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-1">
                        {visible.map((src) =>
                          src.url ? (
                            <a
                              key={src.id}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-11 px-3 py-2 rounded-xl hover:bg-muted/40 flex items-center justify-between gap-2 text-xs text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <span className="truncate">{src.title}</span>
                              <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
                            </a>
                          ) : (
                            <div
                              key={src.id}
                              className="px-3 py-2 rounded-xl bg-background/60 border border-border/40 text-xs text-muted-foreground truncate"
                              title={src.detail || src.title}
                            >
                              {src.title}
                            </div>
                          ),
                        )}
                        {unique.length > 4 && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowAllSources((prev) => !prev)}
                            className="w-full h-11 min-h-11 px-3 justify-start rounded-xl text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {showAllSources ? "Ver menos" : `Ver tudo (${unique.length})`}
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Contexto ativo compacto */}
                {activeThread.workingMemory &&
                  Object.entries(activeThread.workingMemory).filter(
                    ([k]) => !k.startsWith("last_tokens") && !k.startsWith("last_mcp"),
                  ).length > 0 && (
                    <div className="space-y-2 border-t border-border/40 pt-3">
                      <span className="text-2xs font-medium text-muted-foreground">
                        Memória ativa
                      </span>
                      <div className="space-y-1 text-2xs">
                        {Object.entries(activeThread.workingMemory)
                          .filter(([k]) => !k.startsWith("last_tokens") && !k.startsWith("last_mcp"))
                          .slice(0, 4)
                          .map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-2">
                              <span className="text-muted-foreground truncate capitalize">
                                {formatWorkingMemoryLabel(k)}:
                              </span>
                              <span className="font-medium text-foreground truncate">
                                {formatWorkingMemoryValue(v)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        ) : activeProject && onUploadProjectFile && onDeleteProjectFile ? (
          <CopilotProjectKnowledgePanel
            project={activeProject}
            files={projectFiles}
            isLoadingFiles={isLoadingProjectFiles}
            onUploadFile={onUploadProjectFile}
            onDeleteFile={onDeleteProjectFile}
            onUpdateInstructions={onUpdateProjectInstructions}
          />
        ) : (
          <div className="rounded-2xl bg-card border border-border/60 p-6 text-center text-muted-foreground space-y-2">
            <Brain className="size-7 text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-medium text-foreground">Fontes & Resultados</p>
            <p className="text-2xs">Selecione uma conversa para visualizar fontes e entregas.</p>
          </div>
        )}
      </aside>
      )}

      {/* ── PAINEL / SHEET DE ARTEFATO RESPONSIVO EM DISPOSITIVOS MÓVEIS (< 840px / isCompact) ── */}
      <Sheet
        open={Boolean(activeArtifact && isCompact)}
        onOpenChange={(open) => {
          if (!open) setActiveArtifact(null);
        }}
      >
        <SheetContent side="bottom" className="h-5/6 p-4 pt-safe-modal pb-safe overflow-y-auto bg-card border-border rounded-t-xl">
          {activeArtifact && (
            <ArtifactViewerContent
              artifact={activeArtifact}
              onClose={() => setActiveArtifact(null)}
              onSave={(updated) => setActiveArtifact(updated)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* ── PAINEL / SHEET DE CONTEXTO E MEMÓRIA RESPONSIVO EM DISPOSITIVOS MÓVEIS (< 840px / isCompact) ── */}
      <Sheet
        open={Boolean(showContextPanel && isCompact && activeThread && !activeArtifact)}
        onOpenChange={(open) => {
          setShowContextPanel(open);
        }}
      >
        <SheetContent side="bottom" className="h-5/6 p-4 pt-safe-modal pb-safe overflow-y-auto bg-card border-border rounded-t-xl no-scrollbar">
          {activeThread && (
            <div className="space-y-4 pb-safe pb-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Brain className="size-4 text-primary" />
                  <span>Contexto & Conhecimento</span>
                </h3>
              </div>

              {activeProject && onUploadProjectFile && onDeleteProjectFile && (
                <CopilotProjectKnowledgePanel
                  project={activeProject}
                  files={projectFiles}
                  isLoadingFiles={isLoadingProjectFiles}
                  onUploadFile={onUploadProjectFile}
                  onDeleteFile={onDeleteProjectFile}
                  onUpdateInstructions={onUpdateProjectInstructions}
                />
              )}

              {/* Dados do Projeto ou Thread */}
              <div className="space-y-2">
                <span className="text-2xs font-semibold text-muted-foreground uppercase">
                  Tipo de Conversa
                </span>
                <Badge variant="outline" className="text-xs font-medium border-border/60">
                  {THREAD_TYPE_LABELS[activeThread.type] || activeThread.type}
                </Badge>
              </div>

              {/* Contexto e Preferências da Conversa */}
              <div className="space-y-2">
                <span className="text-2xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <Brain className="size-3 text-primary" />
                  <span>Contexto da Conversa</span>
                </span>
                {activeThread.workingMemory &&
                Object.entries(activeThread.workingMemory).filter(([k]) => !k.startsWith("last_tokens") && !k.startsWith("last_mcp")).length > 0 ? (
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-2 space-y-2 text-xs">
                    {Object.entries(activeThread.workingMemory)
                      .filter(([k]) => !k.startsWith("last_tokens") && !k.startsWith("last_mcp"))
                      .map(([k, v]) => {
                        const _legacyLabel =
                          k === "last_places_query" ? "Última busca" :
                          k === "last_travel_destination" ? "Destino" :
                          k === "last_creative_topic" ? "Tema criativo" :
                          k === "last_creative_topic" ? "Tema criativo" : k;
                      const friendlyLabel = formatWorkingMemoryLabel(k);
                        return (
                          <div key={k} className="flex justify-between gap-2">
                            <span className="text-muted-foreground truncate capitalize">{friendlyLabel}:</span>
                            <span className="font-medium text-foreground truncate">
                              {formatWorkingMemoryValue(v)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-2xs text-muted-foreground">
                    Nenhum contexto adicional registrado.
                  </p>
                )}
              </div>

              {/* Artefatos Gerados nesta Conversa */}
              <div className="space-y-2">
                <span className="text-2xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <FileText className="size-3 text-primary" />
                  <span>Artefatos Produzidos</span>
                </span>
                <div className="space-y-2">
                  {messages
                    .filter((m) => Boolean(m.artifact))
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setActiveArtifact(m.artifact!);
                        }}
                        className="w-full text-left p-3 rounded-lg border border-border/40 bg-card hover:border-border transition-colors text-xs space-y-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground truncate">
                            {m.artifact!.title}
                          </span>
                          <Badge variant="outline" className="text-2xs font-mono h-4">
                            v{m.artifact!.version}
                          </Badge>
                        </div>
                        <span className="text-2xs text-muted-foreground block">
                          {MEMORY_VALUE_LABELS[m.artifact!.type] || m.artifact!.type}
                        </span>
                      </button>
                    ))}
                  {messages.filter((m) => Boolean(m.artifact)).length === 0 && (
                    <p className="text-2xs text-muted-foreground">
                      Nenhum documento ou planilha gerada ainda.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      {/* ── GAVETA DE TAREFAS EM SEGUNDO PLANO E LIVE SANDBOX ── */}
      <CopilotBackgroundTasksDrawer
        open={tasksDrawerOpen}
        onOpenChange={setTasksDrawerOpen}
        tasks={backgroundTasks}
        onCancelTask={onCancelBackgroundTask}
        onRefresh={onRefreshBackgroundTasks}
      />
    </div>
  );
}

export function getArtifactTableRows(data: Record<string, any> = {}): unknown[][] {
  const rawRows = Array.isArray(data.dataRows)
    ? data.dataRows
    : Array.isArray(data.rows)
      ? data.rows
      : [];
  const headers = Array.isArray(data.headers) ? data.headers : [];

  return rawRows.map((row: unknown) => {
    if (Array.isArray(row)) return row;
    if (row && typeof row === "object") {
      const record = row as Record<string, unknown>;
      return headers.length ? headers.map((header: string) => record[header] ?? "") : Object.values(record);
    }
    return [row];
  });
}

export function artifactCellToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function buildArtifactCsv(data: Record<string, any> = {}): string {
  const rows = getArtifactTableRows(data);
  const sourceHeaders = Array.isArray(data.headers)
    ? data.headers.map((header: unknown) => artifactCellToText(header))
    : [];
  const columnCount = Math.max(sourceHeaders.length, ...rows.map((row) => row.length), 1);
  const headers = sourceHeaders.length
    ? sourceHeaders
    : Array.from({ length: columnCount }, (_, index) => `Coluna ${index + 1}`);

  const escapeCell = (value: unknown): string => {
    let text = artifactCellToText(value);
    const looksNumeric = /^[-+]?\d+(?:[.,]\d+)?$/.test(text.trim());
    if (!looksNumeric && /^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const matrix = [headers, ...rows.map((row) => Array.from({ length: headers.length }, (_, index) => row[index] ?? ""))];
  return `\uFEFF${matrix.map((row) => row.map(escapeCell).join(";")).join("\r\n")}`;
}

function ArtifactViewerContent({
  artifact,
  onClose,
  onSave,
}: {
  artifact: ChatArtifactData;
  onClose: () => void;
  onSave?: (updated: ChatArtifactData) => void;
}) {
  return <CopilotArtifactPanel artifact={artifact} onClose={onClose} onSave={onSave} />;
}

function ThreadListItem({
  thread,
  isActive,
  isRenaming,
  renameDraft,
  onRenameDraftChange,
  onCommitRename,
  onCancelRename,
  onStartRename,
  onClick,
  onTogglePin,
  onToggleArchive,
  onDelete,
}: {
  thread: ChatThreadItem;
  isActive: boolean;
  isRenaming?: boolean;
  renameDraft?: string;
  onRenameDraftChange?: (val: string) => void;
  onCommitRename?: (nextTitle: string) => Promise<void> | void;
  onCancelRename?: () => void;
  onStartRename?: () => void;
  onClick: () => void;
  onTogglePin?: (id: string) => void;
  onToggleArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  if (isRenaming) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onCommitRename?.(renameDraft || thread.title);
        }}
        className="flex items-center gap-1 px-1 py-1"
      >
        <Input
          value={renameDraft || ""}
          onChange={(e) => onRenameDraftChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancelRename?.();
          }}
          className="h-11 min-h-11 text-xs flex-1 rounded-xl bg-background"
          autoFocus
        />
        <Button type="submit" size="icon" className="size-11 min-h-11 min-w-11 rounded-xl shrink-0" aria-label="Salvar nome">
          <Check className="size-4" />
        </Button>
      </form>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center rounded-xl transition-colors group",
        isActive ? "bg-muted/80" : "hover:bg-muted/40"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 min-h-11 h-11 px-3 flex items-center gap-2 text-left cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-muted-foreground shrink-0 flex items-center justify-center">
          {thread.type === "project" ? (
            <FolderKanban className="size-4" />
          ) : (
            <MessageSquare className="size-4" />
          )}
        </span>
        <span className="text-xs font-medium text-foreground truncate flex-1">
          {thread.title}
        </span>
        {thread.unreadCount && thread.unreadCount > 0 ? (
          <Badge variant="secondary" className="size-5 p-0 flex items-center justify-center rounded-full text-2xs font-mono shrink-0">
            {thread.unreadCount}
          </Badge>
        ) : null}
      </button>

      {(onStartRename || onTogglePin || onToggleArchive || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 min-h-11 min-w-11 shrink-0 rounded-xl opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Opções da conversa"
              aria-label={`Opções de ${thread.title}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-card border-border">
            {onStartRename && (
              <DropdownMenuItem onClick={onStartRename} className="min-h-11 gap-2 cursor-pointer">
                <Pencil className="size-4 text-muted-foreground" />
                <span>Renomear</span>
              </DropdownMenuItem>
            )}
            {onTogglePin && (
              <DropdownMenuItem onClick={() => onTogglePin(thread.id)} className="min-h-11 gap-2 cursor-pointer">
                <Pin className="size-4 text-muted-foreground" />
                <span>{thread.isPinned ? "Desafixar" : "Fixar"}</span>
              </DropdownMenuItem>
            )}
            {onToggleArchive && (
              <DropdownMenuItem onClick={() => onToggleArchive(thread.id)} className="min-h-11 gap-2 cursor-pointer">
                <Archive className="size-4 text-muted-foreground" />
                <span>{thread.isArchived ? "Restaurar" : "Arquivar"}</span>
              </DropdownMenuItem>
            )}
            {onDelete && thread.id !== "00000000-0000-0000-0000-000000000001" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(thread.id)}
                  className="min-h-11 gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" />
                  <span>Excluir</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function CanvaStudioSidebarSection({
  activeCategory,
  onCategoryChange,
  onSelectTemplate,
  onApplyElement,
  onBackToChats,
  onAskAiForTemplate,
}: {
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  onSelectTemplate: (tpl: CanvaTemplatePreset) => void;
  onApplyElement: (el: CanvaBuilderElementCard) => void;
  onBackToChats: () => void;
  onAskAiForTemplate: (tpl: CanvaTemplatePreset) => void;
}) {
  const filteredTemplates = useMemo(() => {
    if (!activeCategory || activeCategory === "all") return CANVA_STUDIO_TEMPLATES;
    return CANVA_STUDIO_TEMPLATES.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="p-3 border-b border-border/40 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="size-4 text-primary shrink-0" />
            <span className="text-xs font-semibold text-foreground truncate">
              Estúdio Canva
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onBackToChats}
            className="h-11 min-h-11 px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="size-4" />
            <span>Chats</span>
          </Button>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto waesy-tab-strip pb-1">
          {CANVA_TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                "h-11 min-h-11 px-3 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeCategory === cat.id
                  ? "bg-muted text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 no-scrollbar">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
            <LayoutTemplate className="size-3.5 shrink-0" />
            <span>Templates Prontos ({filteredTemplates.length})</span>
          </div>

          <div className="space-y-2">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-2xl border border-border/60 bg-card p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {tpl.name}
                  </span>
                  <Badge variant="outline" className="text-2xs font-mono shrink-0">
                    {tpl.aspectRatio}
                  </Badge>
                </div>
                <p className="text-2xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {tpl.headline}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onSelectTemplate(tpl)}
                    className="flex-1 h-11 min-h-11 rounded-xl text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Abrir Canvas
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onAskAiForTemplate(tpl)}
                    className="h-11 min-h-11 px-3 rounded-xl text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Gerar IA
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-border/40 pt-3">
          <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Elementos & Blocos Rápidos
          </span>
          <div className="space-y-2">
            {CANVA_BUILDER_ELEMENTS.map((el) => (
              <button
                key={el.id}
                type="button"
                onClick={() => onApplyElement(el)}
                className="w-full min-h-11 p-3 rounded-2xl border border-border/60 bg-card hover:bg-muted/40 text-left space-y-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-xs font-semibold text-foreground block">
                  {el.label}
                </span>
                <span className="text-2xs text-muted-foreground block leading-relaxed">
                  {el.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BuildersSidebarSection({
  messages,
  onLaunchBuilder,
  onOpenArtifact,
  onBackToChats,
}: {
  messages: ChatMessageItem[];
  onLaunchBuilder: (
    builderKind: "creative_post" | "presentation" | "document" | "spreadsheet" | "website_builder",
  ) => void;
  onOpenArtifact: (artifact: ChatArtifactData) => void;
  onBackToChats: () => void;
}) {
  const sessionArtifacts = useMemo(
    () => messages.filter((m) => Boolean(m.artifact)).map((m) => m.artifact!),
    [messages],
  );

  const builderTools: Array<{
    id: "creative_post" | "presentation" | "document" | "spreadsheet" | "website_builder";
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "creative_post",
      title: "Post & Story Canva",
      subtitle: "Canvas em tempo real 1:1, 4:5 e 9:16 com exportação PNG/PDF/HTML",
      icon: Palette,
    },
    {
      id: "presentation",
      title: "Apresentação 16:9",
      subtitle: "Slides comerciais e institucionais em alta resolução",
      icon: Presentation,
    },
    {
      id: "document",
      title: "Documento & Proposta",
      subtitle: "Escopo, etapas e condições comerciais com PDF estruturado",
      icon: FileText,
    },
    {
      id: "spreadsheet",
      title: "Planilha Inteligente",
      subtitle: "Tabelas financeiras, orçamentos e exportação CSV imediata",
      icon: FileSpreadsheet,
    },
    {
      id: "website_builder",
      title: "Site & Landing Page",
      subtitle: "Páginas locais de alta conversão integradas ao WhatsApp",
      icon: Globe,
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="p-3 border-b border-border/40 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground truncate">
          Builders & Motores
        </span>
        <Button
          type="button"
          variant="ghost"
          onClick={onBackToChats}
          className="h-11 min-h-11 px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="size-4" />
          <span>Chats</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 no-scrollbar">
        <div className="space-y-2">
          {builderTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onLaunchBuilder(tool.id)}
                className="w-full min-h-11 p-3 rounded-2xl border border-border/60 bg-card hover:bg-muted/40 flex items-start gap-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="size-9 rounded-xl bg-muted flex items-center justify-center text-foreground shrink-0">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 space-y-1">
                  <span className="text-xs font-semibold text-foreground block truncate">
                    {tool.title}
                  </span>
                  <span className="text-2xs text-muted-foreground block leading-relaxed">
                    {tool.subtitle}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {sessionArtifacts.length > 0 && (
          <div className="space-y-2 border-t border-border/40 pt-3">
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Peças da Sessão ({sessionArtifacts.length})
            </span>
            <div className="space-y-2">
              {sessionArtifacts.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => onOpenArtifact(art)}
                  className="w-full min-h-11 p-3 rounded-2xl border border-border/60 bg-card hover:bg-muted/40 text-left space-y-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {art.title}
                    </span>
                    <Badge variant="outline" className="text-2xs font-mono shrink-0">
                      v{art.version}
                    </Badge>
                  </div>
                  <span className="text-2xs text-muted-foreground block truncate">
                    {MEMORY_VALUE_LABELS[art.type] || art.type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
