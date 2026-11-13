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
  ArrowLeft,
  Download,
  RotateCcw,
  Check,
  CheckCheck,
  FileText,
  Brain,
  Copy,
  CornerDownLeft,
  X,
  Layers,
  Printer,
  Table as TableIcon,
  Calendar,
  Trash2,
  Compass,
  Zap,
  Link2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { AIActivityTrail, type AIActivityStep } from "./ai-activity-trail";
import { ChatArtifactCard, type ChatArtifactData } from "./chat-artifact-card";
import { ChatComposer, type QuotedMessage } from "./chat-composer";
import { StructuredMessageView, type AIChatAction } from "./structured-message-view";
import { CopilotApprovalPanel } from "./copilot-approval-panel";
import { CopilotMessageRenderer } from "./copilot-message-renderer";
import { CopilotArtifactPanel } from "./copilot-artifact-panel";
import type { CopilotFsmPhase, CopilotFsmExecutionState } from "@/types/copilot-fsm";
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
  reactions?: Record<string, number>;
}

export interface AIChatShellProps {
  threads: ChatThreadItem[];
  activeThreadId?: string;
  messages: ChatMessageItem[];
  onSelectThread: (threadId: string) => void;
  onSendMessage: (text: string, attachments?: string[], replyToId?: string) => Promise<void> | void;
  onRetryMessage?: (messageId: string) => void;
  onCancelActiveRun?: () => void;
  onCreateThread?: (
    type: ThreadType,
    title: string,
    options?: { folderId?: string | null; projectId?: string | null },
  ) => void;
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
  }) => Promise<void> | void;
  onAssignThreadHierarchy?: (
    threadId: string,
    hierarchy: { folderId?: string | null; projectId?: string | null },
  ) => Promise<void> | void;
  projectFiles?: CopilotProjectFileDTO[];
  isLoadingProjectFiles?: boolean;
  onUploadProjectFile?: CopilotProjectKnowledgePanelProps["onUploadFile"];
  onDeleteProjectFile?: CopilotProjectKnowledgePanelProps["onDeleteFile"];
  onUpdateProjectInstructions?: CopilotProjectKnowledgePanelProps["onUpdateInstructions"];
  backgroundTasks?: BackgroundTaskItem[];
  onCancelBackgroundTask?: (taskId: string) => void;
  onRefreshBackgroundTasks?: () => void;
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
  onRetryMessage,
  onCancelActiveRun,
  onCreateThread,
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
  backgroundTasks = [],
  onCancelBackgroundTask,
  onRefreshBackgroundTasks,
  isSending = false,
  isStreaming = false,
  currentUserProfileId,
  mode = "workspace",
  className,
  mobileTitle,
  mobileSubtitle,
  mobileFallbackHref,
}: AIChatShellProps) {
  // Estados de navegação e busca
  const [viewMode, setViewMode] = useState<
    "chat" | "skills" | "schedule" | "connectors" | "analytics"
  >("chat");
  const [tasksDrawerOpen, setTasksDrawerOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "direct" | "projects" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyTo, setReplyTo] = useState<QuotedMessage | null>(null);
  const [showMobileChat, setShowMobileChat] = useState<boolean>(Boolean(activeThreadId));
  const [showContextPanel, setShowContextPanel] = useState<boolean>(false);
  const [showDesktopContextPanel, setShowDesktopContextPanel] = useState<boolean>(false);
  const [activeArtifact, setActiveArtifact] = useState<ChatArtifactData | null>(null);
  const [internalFolderId, setInternalFolderId] = useState<string | null>(null);
  const [internalProjectId, setInternalProjectId] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<"folder" | "project" | null>(null);
  const [creationDraft, setCreationDraft] = useState("");
  const { isCompact } = useWindowSizeClass();

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
      {/* ── COLUNA 1: LISTA DE THREADS E CONVERSAS ── */}
      <aside
        className={cn(
          "w-full sm:w-80 md:w-88 border-r border-border/40 bg-card/40 flex-col shrink-0 transition-colors",
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

        {/* Cabeçalho da Lista de Conversas */}
        <div className="p-3 border-b border-border/40 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-bold text-foreground tracking-tight truncate">
              Conversas & Projetos
            </h1>

            <div className="flex items-center gap-1 shrink-0">
              {onCreateFolder && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setCreationMode((prev) => (prev === "folder" ? null : "folder"));
                    setCreationDraft("");
                  }}
                  className="size-11 min-h-11 min-w-11 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
                  className="size-11 min-h-11 min-w-11 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  title="Novo Projeto com Base de Conhecimento"
                  aria-label="Novo Projeto"
                >
                  <FolderKanban className="size-4" />
                </Button>
              )}
              {onCreateThread && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onCreateThread(
                      activeProjectFilter ? "project" : "ai_assistant",
                      activeProjectFilter ? "Conversa do Projeto" : "Nova Conversa",
                      {
                        folderId: activeFolderFilter,
                        projectId: activeProjectFilter,
                      },
                    )
                  }
                  className="h-11 min-h-11 px-3 text-xs font-semibold rounded-md gap-2 border-border/60 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  title="Criar nova conversa"
                >
                  <Plus className="size-4" />
                  <span>Nova</span>
                </Button>
              )}
            </div>
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
                    ? "Nome da pasta (ex: Turismo)..."
                    : "Nome do projeto (ex: Atendimento SAC)..."
                }
                className="h-11 min-h-11 text-xs flex-1"
              />
              <Button type="submit" size="sm" className="h-11 min-h-11 px-3 text-xs font-semibold">
                Criar
              </Button>
            </form>
          )}

          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conversas e projetos..."
              className="h-11 min-h-11 pl-9 pr-3 rounded-md bg-muted/50 border-border/40 text-xs placeholder:text-muted-foreground"
            />
          </div>

          {/* Trilho de Pastas */}
          {folders.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 py-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleFolderSelect(null);
                  handleProjectSelect(null);
                }}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-md text-xs font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  !activeFolderFilter
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Folder className="size-3.5 mr-1" />
                <span>Todas Pastas</span>
              </Button>
              {folders.map((folder) => (
                <Button
                  key={folder.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const nextFolder = activeFolderFilter === folder.id ? null : folder.id;
                    handleFolderSelect(nextFolder);
                    handleProjectSelect(null);
                  }}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-md text-xs font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    activeFolderFilter === folder.id
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Folder className="size-3.5 mr-1" />
                  <span>{folder.name}</span>
                </Button>
              ))}
            </div>
          )}

          {/* Lista compacta de Projetos da pasta selecionada */}
          {visibleProjects.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Projetos ({visibleProjects.length})
              </span>
              <div className="flex flex-wrap items-center gap-2 pb-1">
                {visibleProjects.map((proj) => (
                  <Button
                    key={proj.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleProjectSelect(activeProjectFilter === proj.id ? null : proj.id)
                    }
                    className={cn(
                      "h-11 min-h-11 px-3 rounded-md text-xs font-medium whitespace-nowrap gap-2 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      activeProjectFilter === proj.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/50 text-foreground hover:bg-muted/50",
                    )}
                  >
                    <FolderKanban className="size-3.5" />
                    <span className="max-w-36 truncate">{proj.title}</span>
                    {typeof proj.file_count === "number" && proj.file_count > 0 && (
                      <span className="text-2xs opacity-80 font-mono">
                        ({proj.file_count})
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Abas de Filtro: Todas, Diretas, Projetos (apenas Workspace), Arquivadas */}
          <div className="flex items-center gap-1 flex-wrap py-1">
            {[
              { id: "all", label: "Todas" },
              { id: "direct", label: "Diretas" },
              ...(mode === "workspace" ? [{ id: "projects", label: "Projetos" }] : []),
              { id: "archived", label: "Arquivadas" },
            ].map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFilterTab(tab.id as any)} /* focus-visible:ring-2 */
                className={cn(
                  "h-11 min-h-11 px-3 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  filterTab === tab.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Lista Rolável de Threads */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/20 no-scrollbar">
          {filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <MessageSquare className="size-8 mx-auto text-muted-foreground/40" />
              <p className="text-xs">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            <>
              {/* Seção Fixada */}
              {pinnedThreads.length > 0 && (
                <div className="bg-muted/10">
                  <div className="px-3 py-1 text-2xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Pin className="size-3" />
                    <span>Fixadas</span>
                  </div>
                  {pinnedThreads.map((thread) => (
                    <ThreadListItem
                      key={thread.id}
                      thread={thread}
                      isActive={thread.id === activeThreadId}
                      onClick={() => { /* focus-visible:ring-2 */
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

              {/* Seção Padrão */}
              {standardThreads.map((thread) => (
                <ThreadListItem
                  key={thread.id}
                  thread={thread}
                  isActive={thread.id === activeThreadId}
                  onClick={() => { /* focus-visible:ring-2 */
                    onSelectThread(thread.id);
                    setShowMobileChat(true);
                  }}
                  onTogglePin={onTogglePinThread}
                  onToggleArchive={onToggleArchiveThread}
                  onDelete={onDeleteThread}
                />
              ))}
            </>
          )}
        </div>
      </aside>

      {/* ── COLUNA 2: STREAM DE CONVERSA PRINCIPAL ── */}
      <main
        className={cn(
          "flex-1 flex flex-col h-full min-h-0 bg-background transition-colors min-w-0 overflow-hidden relative",
          showMobileChat === false && "hidden md:flex"
        )}
      >
        {/* ── RÉGUA DE NAVEGAÇÃO CANÔNICA DO COPILOT ── */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-card/60 backdrop-blur-md gap-2 shrink-0 overflow-x-auto scroll-area-carousel no-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("chat")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold cursor-pointer gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                viewMode === "chat"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <MessageSquare className="size-4" />
              <span>Conversa</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("skills")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold cursor-pointer gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                viewMode === "skills"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Zap className="size-4" />
              <span>Habilidades</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTasksDrawerOpen(true)}
              className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold cursor-pointer gap-2 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Clock className="size-4" />
              <span>Tarefas</span>
            </Button>

            {mode === "workspace" && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("schedule")}
                  className={cn(
                    "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold cursor-pointer gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    viewMode === "schedule"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Calendar className="size-4" />
                  <span>Agendamentos</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("connectors")}
                  className={cn(
                    "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold cursor-pointer gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    viewMode === "connectors"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Link2 className="size-4" />
                  <span>Conectores</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("analytics")}
                  className={cn(
                    "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold cursor-pointer gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    viewMode === "analytics"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <TrendingUp className="size-4" />
                  <span>Métricas</span>
                </Button>
              </>
            )}
          </div>
        </div>

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
            {/* Cabeçalho da Conversa Ativa */}
            <header className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10 gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {/* Botão Voltar para Mobile */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMobileChat(false)} /* focus-visible:ring-2 */
                  className="size-11 min-h-11 min-w-11 rounded-full md:hidden text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label="Voltar para a lista de conversas"
                >
                  <ChevronLeft className="size-5" />
                </Button>

                {/* Avatar e Informações */}
                <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                  {activeThread.type === "project" ? (
                    <FolderKanban className="size-4" />
                  ) : activeThread.type === "ai_assistant" ? (
                    <Bot className="size-4" />
                  ) : (
                    activeThread.title[0]?.toUpperCase() || "C"
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground truncate">
                      {activeThread.title}
                    </h2>
                    {activeThread.isPinned && (
                      <Pin className="size-3 text-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-2xs text-muted-foreground truncate">
                    {activeThread.type === "project"
                      ? "Projeto com memória de trabalho"
                      : activeThread.subtitle || "Conversa ativa"}
                  </p>
                </div>
              </div>

              {/* Ações do Topo */}
              <div className="flex items-center gap-1 shrink-0">
                {onDeleteThread && activeThread.id !== "00000000-0000-0000-0000-000000000001" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteThread(activeThread.id)}
                    className="h-11 min-h-11 px-3 text-xs text-destructive hover:bg-destructive/10 rounded-md gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 cursor-pointer"
                    title="Excluir esta conversa"
                  >
                    <Trash2 className="size-4" />
                    <span className="hidden sm:inline">Excluir</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isCompact) {
                      setShowContextPanel((prev) => !prev);
                    } else {
                      setShowDesktopContextPanel((prev) => !prev);
                    }
                  }} /* focus-visible:ring-2 */
                  className={cn(
                    "h-11 min-h-11 px-3 text-xs rounded-md gap-2 border border-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer transition-colors",
                    (isCompact ? showContextPanel : showDesktopContextPanel)
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  title="Alternar painel de contexto e artefatos"
                >
                  <Layers className="size-4" />
                  <span>Contexto</span>
                </Button>
              </div>
            </header>

            {/* Linha do Tempo de Mensagens */}
            <div
              role="log"
              aria-live="polite"
              aria-label="Histórico de mensagens da conversa"
              className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 pt-4 pb-24 no-scrollbar overscroll-contain"
            >
              <div className="mx-auto w-full max-w-3xl space-y-4">
              {messagesWithSeparators.map((item, idx) => {
                if (item.type === "separator") {
                  return (
                    <div key={`sep-${idx}`} className="flex justify-center my-3">
                      <span className="px-2 py-1 rounded-full bg-muted/60 text-2xs text-muted-foreground font-mono">
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
                    {/* Citação da Mensagem (Reply) se houver */}
                    {msg.replyTo && (
                      <div
                        className={cn(
                          "mb-1 px-2 py-1 rounded-md text-2xs bg-muted/50 border-l-2 border-primary max-w-md truncate",
                          isUser ? "mr-1 text-right" : "ml-1 text-left"
                        )}
                      >
                        <span className="font-semibold text-primary block truncate">
                          {msg.replyTo.senderName}
                        </span>
                        <span className="text-muted-foreground truncate block">
                          {msg.replyTo.text}
                        </span>
                      </div>
                    )}

                    {/* Bolha de Texto da Mensagem */}
                    {msg.text && (
                      <div
                        className={cn(
                          "relative max-w-md px-3 py-2 rounded-lg text-xs sm:text-sm leading-relaxed",
                          isUser
                            ? "bg-primary text-primary-foreground rounded-tr-xs"
                            : "bg-muted/70 text-foreground rounded-tl-xs border border-border/40",
                          msg.status === "failed" && "border border-destructive/50 bg-destructive/10 text-destructive"
                        )}
                      >
                        <CopilotMessageRenderer content={msg.text} isUser={isUser} />

                        {/* Rodapé da Bolha: Horário e Status */}
                        <div className="flex items-center justify-end gap-1 mt-1 font-mono text-2xs opacity-80">
                          <span>{formatDate(msg.createdAt)}</span>
                          {isUser && (
                            <span>
                              {msg.status === "sending" && <Clock className="size-3" />}
                              {msg.status === "sent" && <Check className="size-3" />}
                              {(msg.status === "delivered" || msg.status === "read") && (
                                <CheckCheck className="size-3 text-primary-foreground" />
                              )}
                              {msg.status === "failed" && (
                                <button type="button" onClick={() => onRetryMessage && onRetryMessage(msg.id)} /* focus-visible:ring-2 */ className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive rounded-xs text-destructive hover:scale-110 transition-transform cursor-pointer" title="Falha no envio. Clique para tentar novamente." aria-label="Tentar reenviar mensagem">
                                  <RotateCcw className="size-3" />
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Blocos Estruturados se houver */}
                    {msg.structuredPayload && (
                      <div className="w-full max-w-md mt-2 mb-1">
                        <StructuredMessageView
                          payload={msg.structuredPayload as any}
                          isStaff={msg.isStaffOrAI}
                          onActionClick={onStructuredAction}
                        />
                      </div>
                    )}

                    {/* Artefato Versionado no Chat (Phase C) */}
                    {msg.artifact && (
                      <div className="w-full max-w-md mt-2 mb-1">
                        <ChatArtifactCard
                          artifact={msg.artifact}
                          onOpenBuilder={(art) => {
                            setActiveArtifact(art);
                            setShowContextPanel(true);
                          }}
                        />
                      </div>
                    )}

                    {/* Trilha de Atividade da IA em Tempo Real (Phase B) */}
                    {msg.activitySteps && msg.activitySteps.length > 0 && (
                      <div className="w-full max-w-md my-2">
                        <AIActivityTrail
                          steps={msg.activitySteps}
                          executionId={msg.executionId}
                          isStreaming={isStreaming && idx === messagesWithSeparators.length - 1}
                          onCancel={onCancelActiveRun}
                        />
                      </div>
                    )}

                    {/* Barra de Ações Rápidas (Hover / Menu de Contexto) */}
                    <div
                      className={cn(
                        "opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 px-1 text-2xs text-muted-foreground",
                        isUser ? "justify-end" : "justify-start"
                      )}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReplyClick(msg)} /* focus-visible:ring-2 */
                        className="h-11 min-h-11 px-3 text-2xs hover:text-foreground cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        title="Responder mensagem"
                      >
                        <CornerDownLeft className="size-4" />
                        <span>Responder</span>
                      </Button>
                      <span>•</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyText(msg.text)} /* focus-visible:ring-2 */
                        className="h-11 min-h-11 px-3 text-2xs hover:text-foreground cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        title="Copiar texto"
                      >
                        <Copy className="size-4" />
                        <span>Copiar</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
              </div>

              <div ref={messagesEndRef} />
            </div>

            {/* Composer Integrado (Phase A & Ergonomia de Toque) */}
            <ChatComposer
              onSendMessage={onSendMessage}
              isSending={isSending}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              className="shrink-0 sticky bottom-0 z-20"
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
            <div className="size-12 rounded-lg bg-muted/40 flex items-center justify-center text-muted-foreground">
              <Bot className="size-6" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Nenhuma conversa selecionada
            </h2>
            <p className="text-xs max-w-sm">
              Escolha uma conversa na barra lateral ou inicie um novo projeto com o assessor de negócios.
            </p>
          </div>
        )}
      </main>

      {/* ── COLUNA 3: PAINEL DE CONTEXTO E ARTEFATOS (Desktop >= 768px / Colapsável & Auto-Aberto em Artefatos) ── */}
      {(showDesktopContextPanel || Boolean(activeArtifact)) && (
      <aside className="w-80 xl:w-96 border-l border-border/40 bg-card/30 p-3 space-y-4 overflow-y-auto hidden md:flex flex-col shrink-0 no-scrollbar">
        {activeArtifact ? (
          /* Claude Artifacts Split-Screen Inspector */
          <ArtifactViewerContent
            artifact={activeArtifact}
            onClose={() => setActiveArtifact(null)}
          />
        ) : activeThread ? (
          /* Contexto, Base de Conhecimento do Projeto & Memória */
          <>
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Brain className="size-4 text-primary" />
                <span>Contexto & Conhecimento</span>
              </h3>
            </div>

            {/* Vínculo Hierárquico da Conversa (Pasta / Projeto) */}
            {onAssignThreadHierarchy && (projects.length > 0 || folders.length > 0) && activeThread.id !== "00000000-0000-0000-0000-000000000001" && (
              <div className="space-y-2 pb-3 border-b border-border/40">
                <label
                  htmlFor="copilot-thread-project-select"
                  className="text-2xs font-semibold text-muted-foreground uppercase block"
                >
                  Projeto Vinculado
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
                  className="h-11 min-h-11 w-full rounded-md border border-border/60 bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <option value="">Conversa avulsa (sem projeto)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Base de Conhecimento RAG do Projeto Ativo */}
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
                    <button /* focus-visible:ring-2 */
                      key={m.id}
                      type="button"
                      onClick={() => /* focus-visible:ring-2 */ setActiveArtifact(m.artifact!)}
                      className="w-full text-left p-2 rounded-lg border border-border/40 bg-card hover:border-border transition-colors text-xs space-y-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
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
          </>
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
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-muted-foreground space-y-2">
            <Brain className="size-8 text-muted-foreground/30 mx-auto" />
            <p className="text-xs font-medium text-foreground">Contexto & Memória</p>
            <p className="text-2xs max-w-xs">Selecione uma conversa para visualizar memória de trabalho e artefatos.</p>
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
}: {
  artifact: ChatArtifactData;
  onClose: () => void;
}) {
  return <CopilotArtifactPanel artifact={artifact} onClose={onClose} />;
}

function ThreadListItem({
  thread,
  isActive,
  onClick, /* focus-visible:ring-2 */
  onTogglePin,
  onToggleArchive,
  onDelete,
}: {
  thread: ChatThreadItem;
  isActive: boolean;
  onClick: () => void; /* focus-visible:ring-2 */
  onTogglePin?: (id: string) => void;
  onToggleArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick} /* focus-visible:ring-2 */
      className={cn(
        "p-3 flex items-start gap-2 cursor-pointer transition-colors relative group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 h-auto w-full text-left justify-start rounded-none",
        isActive ? "bg-muted/60" : "hover:bg-muted/30"
      )}
    >
      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
        {thread.type === "project" ? (
          <FolderKanban className="size-4" />
        ) : thread.type === "ai_assistant" ? (
          <Bot className="size-4" />
        ) : (
          thread.title[0]?.toUpperCase() || "T"
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold text-foreground truncate">
            {thread.title}
          </span>
          {thread.lastMessageAt && (
            <span className="text-2xs text-muted-foreground font-mono shrink-0">
              {formatDate(thread.lastMessageAt)}
            </span>
          )}
        </div>

        {thread.lastMessageSnippet && (
          <p className="text-2xs text-muted-foreground truncate mt-1">
            {thread.lastMessageSnippet}
          </p>
        )}
      </div>

      {/* Ícone fixado ou Ações Rápidas no Hover */}
      <div className="shrink-0 flex items-center gap-1">
        {onDelete && thread.id !== "00000000-0000-0000-0000-000000000001" && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(thread.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onDelete(thread.id);
              }
            }}
            className="opacity-0 group-hover:opacity-100 p-2 size-11 min-h-11 min-w-11 flex items-center justify-center text-muted-foreground hover:text-destructive rounded-md transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
            title="Excluir conversa"
          >
            <Trash2 className="size-3" />
          </span>
        )}
        {thread.isPinned && (
          <Pin className="size-3 text-primary shrink-0" />
        )}
        {thread.unreadCount && thread.unreadCount > 0 ? (
          <Badge variant="secondary" className="size-4 p-0 flex items-center justify-center rounded-full text-2xs font-mono">
            {thread.unreadCount}
          </Badge>
        ) : null}
      </div>
    </Button>
  );
}
