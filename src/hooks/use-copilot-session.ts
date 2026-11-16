import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getBrowserClient } from "@/lib/supabase";
import type {
  ChatMessageItem,
  ChatThreadItem,
  ThreadType,
} from "@/components/chat/ai-chat-shell";
import type { AIChatAction } from "@/components/chat/structured-message-view";
import type { ManusComputerStep } from "@/components/chat/manus-computer-drawer";
import { computeCopilotSessionTelemetry } from "@/components/chat/manus-task-telemetry-sheet";
import { dispatchCopilotClientAction } from "@/lib/copilot-action-dispatcher";
import { uploadComposerAttachments } from "@/lib/copilot-attachments";
import {
  controlCopilotExecutionFn,
  createAiConversationThread,
  deleteAiConversationThread,
  executeGuestCopilotMessage,
  getAiConversationThread,
  renameAiConversationThread,
  sendAiConversationMessage,
  toggleAiThreadArchived,
  toggleAiThreadPinned,
  uploadCopilotMultimodalAttachment,
  type AiConversationThreadDTO,
} from "@/services/ai-conversations.functions";
import {
  assignThreadHierarchy,
  createCopilotFolder,
  createCopilotProject,
  deleteCopilotFolder,
  deleteCopilotProject,
  deleteCopilotProjectContextFile,
  listCopilotProjectFiles,
  updateCopilotFolder,
  updateCopilotProject,
  uploadCopilotProjectContextFile,
  type CopilotFolderDTO,
  type CopilotProjectDTO,
  type CopilotProjectFileDTO,
} from "@/services/copilot-projects.functions";
import {
  cancelDurableAiTask,
  listUserDurableAiTasks,
} from "@/services/ai-tasks-durability.functions";
import type {
  ChatArtifactData,
  ChatSourceItem,
  CopilotQuickToolMode,
  ExecutionPlanStep,
  WorkspaceVfsFileEntry,
} from "@/types/chat";
import type { AiSseEvent } from "@/lib/ai/sse";

export interface UseCopilotSessionOptions {
  mode: "workspace" | "concierge";
  initialThreads: AiConversationThreadDTO[];
  initialThreadDetail?: {
    thread?: any;
    messages?: ChatMessageItem[];
    artifacts?: any[];
  } | null;
  initialFolders?: CopilotFolderDTO[];
  initialProjects?: CopilotProjectDTO[];
  initialTasks?: any[];
  initialQuickToolMode?: CopilotQuickToolMode;
  defaultFallbackThreadId?: string;
  defaultFallbackTitle?: string;
  senderName?: string;
  welcomeText?: string;
  storeId?: string | null;
  userId?: string | null;
  isAuthenticated?: boolean;
  userCoords?: { lat: number; lng: number } | null;
  city?: string;
  navigate: (opts: { to: string; search?: Record<string, any> }) => void;
  onAddedToCart?: () => Promise<void> | void;
  onBeforeNavigate?: () => void;
}

const DEFAULT_FALLBACK_WORKSPACE_ID = "00000000-0000-0000-0000-000000000002";
const DEFAULT_FALLBACK_GUEST_ID = "00000000-0000-0000-0000-000000000001";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeThreadItem(t: any): ChatThreadItem {
  return {
    id: t.id,
    type: t.type || "ai_assistant",
    title: t.title || t.subject || "Conversa",
    isPinned: Boolean(t.is_pinned ?? t.isPinned ?? t.pinned),
    isArchived: t.status === "archived" || Boolean(t.isArchived ?? t.archived),
    folderId: t.folder_id ?? t.folderId ?? t.metadata?.folder_id ?? null,
    projectId: t.project_id ?? t.projectId ?? t.metadata?.project_id ?? null,
    lastMessageSnippet: t.last_message_snippet ?? t.lastMessageSnippet,
    lastMessageAt: t.last_message_at ?? t.lastMessageAt ?? t.updated_at,
    createdAt: t.created_at ?? t.createdAt,
    metadata: t.metadata || {},
    workingMemory: t.working_memory ?? t.workingMemory ?? {},
  };
}

function readFileAsBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Falha ao codificar arquivo para envio."));
      }
    };
    reader.onerror = () => reject(new Error("Erro na leitura do arquivo."));
    reader.readAsDataURL(file);
  });
}

export function deriveManusComputerSteps(
  messages: ChatMessageItem[],
  backgroundTasks: any[] = [],
): ManusComputerStep[] {
  const steps: ManusComputerStep[] = [];
  let seq = 1;

  for (const msg of messages) {
    if (Array.isArray(msg.activitySteps)) {
      for (const act of msg.activitySteps) {
        const lower = `${act.label || ""} ${act.detail || ""}`.toLowerCase();
        const hasBrowserTelemetry = Boolean(act.browserUrl || act.screenshotUrl);
        const hasEditorTelemetry = Boolean(act.fileDiff);
        const tool: ManusComputerStep["tool"] =
          hasBrowserTelemetry ||
          lower.includes("web") ||
          lower.includes("busca") ||
          lower.includes("mapa") ||
          lower.includes("naveg") ||
          act.type === "search"
            ? "browser"
            : hasEditorTelemetry ||
                lower.includes("artefato") ||
                lower.includes("documento") ||
                lower.includes("site")
              ? "editor"
              : "bash";

        steps.push({
          id: act.id || `step-${seq}`,
          index: seq++,
          title: act.label || "Etapa de execução",
          tool,
          target: act.role || act.type || "copilot-runtime",
          timestamp: act.startedAt || msg.createdAt,
          terminalOutput:
            act.terminalOutput || (tool === "bash" ? act.detail || act.label : undefined),
          browserUrl: act.browserUrl,
          browserSummary: tool === "browser" ? act.detail || act.label : undefined,
          screenshotUrl: act.screenshotUrl,
          liveViewerUrl: act.liveViewerUrl,
          driver: act.driver,
          toolLogs: act.toolLogs,
          fileDiff:
            act.fileDiff
              ? {
                  filename: act.fileName || `${msg.artifact?.title || "artefato"}.md`,
                  original: act.fileOriginal || "",
                  modified: act.fileDiff,
                }
              : tool === "editor" && msg.artifact
                ? {
                    filename: act.fileName || `${msg.artifact.title || "artefato"}.md`,
                    original: act.fileOriginal || "",
                    modified: act.detail || msg.artifact.previewSummary || msg.text.slice(0, 320),
                  }
                : undefined,
        });
      }
    }
  }

  for (const task of backgroundTasks) {
    if (task && task.title) {
      steps.push({
        id: `task-${task.id}`,
        index: seq++,
        title: String(task.title),
        tool: "bash",
        target: String(task.task_type || "background-worker"),
        timestamp: String(task.created_at || new Date().toISOString()),
        terminalOutput: `[${String(task.status || "running").toUpperCase()}] ${task.current_step || "Em execução"} (${task.progress_percent ?? 0}%)`,
      });
    }
  }

  return steps;
}

export function extractAggregatedSources(
  messages: ChatMessageItem[],
  projectFiles: CopilotProjectFileDTO[],
): ChatSourceItem[] {
  const seen = new Set<string>();
  const collected: ChatSourceItem[] = [];

  for (const file of projectFiles) {
    const key = `file:${file.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      collected.push({
        id: file.id,
        title: file.filename,
        kind: "project_file",
        detail: file.excerpt || file.file_type,
        url: file.file_url || undefined,
      });
    }
  }

  for (const msg of messages) {
    if (Array.isArray(msg.sources)) {
      for (const src of msg.sources) {
        const key = src.url || src.id || src.title;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        collected.push(src);
      }
    }
  }

  return collected;
}

export function useCopilotSession(options: UseCopilotSessionOptions) {
  const isAuthenticated = options.isAuthenticated ?? true;
  const fallbackId =
    options.defaultFallbackThreadId ||
    (options.mode === "workspace" ? DEFAULT_FALLBACK_WORKSPACE_ID : DEFAULT_FALLBACK_GUEST_ID);
  const [threads, setThreads] = useState<ChatThreadItem[]>(() => {
    const normalized = (options.initialThreads || []).map(normalizeThreadItem);
    if (normalized.length > 0) return normalized;
    return [
      {
        id: fallbackId,
        type: options.mode === "workspace" ? "project" : "ai_assistant",
        title:
          options.defaultFallbackTitle ||
          (options.mode === "workspace" ? "Assessor de Negócios" : "Assessor Local"),
        isPinned: true,
        isArchived: false,
        metadata: {},
        workingMemory: {},
      },
    ];
  });
  const [activeThreadId, setActiveThreadId] = useState<string>(
    options.initialThreadDetail?.thread?.id || threads[0]?.id || fallbackId,
  );
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    if (options.initialThreadDetail?.messages?.length) {
      return options.initialThreadDetail.messages;
    }
    if (options.welcomeText) {
      return [
        {
          id: `${options.mode}-welcome-msg`,
          threadId: options.initialThreadDetail?.thread?.id || threads[0]?.id || fallbackId,
          senderName: options.senderName || "Waesy Copilot",
          isStaffOrAI: true,
          text: options.welcomeText,
          createdAt: new Date().toISOString(),
          status: "delivered",
        },
      ];
    }
    return [];
  });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [folders, setFolders] = useState<CopilotFolderDTO[]>(options.initialFolders || []);
  const [projects, setProjects] = useState<CopilotProjectDTO[]>(options.initialProjects || []);
  const [projectFiles, setProjectFiles] = useState<CopilotProjectFileDTO[]>([]);
  const [isLoadingProjectFiles, setIsLoadingProjectFiles] = useState(false);
  const [backgroundTasks, setBackgroundTasks] = useState<any[]>(options.initialTasks || []);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [quickToolMode, setQuickToolMode] = useState<CopilotQuickToolMode>(
    options.initialQuickToolMode || "default",
  );
  const [liveBrowserFrame, setLiveBrowserFrame] = useState<{
    stepId?: string;
    url: string;
    screenshotUrl?: string;
    liveViewerUrl?: string;
    sessionId?: string;
    driver?: string;
    title?: string;
  } | null>(null);
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlanStep[]>([]);
  const [vfsFilesMap, setVfsFilesMap] = useState<Record<string, WorkspaceVfsFileEntry>>({});
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [isExecutionPaused, setIsExecutionPaused] = useState(false);
  const activeThreadRef = useRef<string>(activeThreadId);
  const activeRunRef = useRef(0);
  const activeRunAbortRef = useRef<boolean>(false);
  const pausedByUserRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const threadLoadSeqRef = useRef(0);
  const guestMessagesRef = useRef<Record<string, ChatMessageItem[]>>({});

  const vfsFiles = useMemo(
    () => Object.values(vfsFilesMap).sort((a, b) => a.path.localeCompare(b.path)),
    [vfsFilesMap],
  );

  useEffect(() => {
    activeThreadRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      activeThreadId.startsWith("guest-") ||
      activeThreadId === fallbackId
    ) {
      guestMessagesRef.current[activeThreadId] = messages;
    }
  }, [activeThreadId, fallbackId, isAuthenticated, messages]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) || null,
    [threads, activeThreadId],
  );

  const resolvedProjectId =
    activeThread?.projectId ??
    (activeThread?.metadata?.project_id as string | undefined) ??
    selectedProjectId ??
    null;

  const activeProject = useMemo(
    () => (resolvedProjectId ? projects.find((p) => p.id === resolvedProjectId) || null : null),
    [resolvedProjectId, projects],
  );

  // Carrega mensagens da thread ativa automaticamente (se UUID persistido)
  useEffect(() => {
    if (
      !isAuthenticated ||
      !activeThreadId ||
      !UUID_REGEX.test(activeThreadId) ||
      activeThreadId === DEFAULT_FALLBACK_WORKSPACE_ID ||
      activeThreadId === DEFAULT_FALLBACK_GUEST_ID
    ) {
      return;
    }
    const seq = ++threadLoadSeqRef.current;
    setIsLoadingThread(true);
    getAiConversationThread({ data: { threadId: activeThreadId } })
      .then((detail) => {
        if (seq === threadLoadSeqRef.current && detail?.thread?.id === activeThreadId) {
          setMessages((detail.messages || []) as ChatMessageItem[]);
        }
      })
      .catch(() => {
        if (seq === threadLoadSeqRef.current) {
          toast.error("Não foi possível carregar esta conversa.");
        }
      })
      .finally(() => {
        if (seq === threadLoadSeqRef.current) {
          setIsLoadingThread(false);
        }
      });
  }, [activeThreadId, isAuthenticated]);

  // Carrega arquivos RAG quando o projeto ativo muda
  useEffect(() => {
    if (!resolvedProjectId || !isAuthenticated) {
      setProjectFiles([]);
      return;
    }
    let cancelled = false;
    setIsLoadingProjectFiles(true);
    listCopilotProjectFiles({ data: { projectId: resolvedProjectId } })
      .then((rows) => {
        if (!cancelled) setProjectFiles(rows || []);
      })
      .catch(() => {
        if (!cancelled) setProjectFiles([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProjectFiles(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedProjectId, isAuthenticated]);

  const refreshBackgroundTasks = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const list = await listUserDurableAiTasks({ data: { limit: 30 } });
      setBackgroundTasks(list || []);
    } catch {
      toast.error("Não foi possível atualizar as tarefas em segundo plano.");
    }
  }, [isAuthenticated]);

  // Sincronização em tempo real (Supabase Realtime) para mensagens em background, crons e tarefas duráveis
  useEffect(() => {
    if (!isAuthenticated) return;
    let supabase: ReturnType<typeof getBrowserClient>;
    try {
      supabase = getBrowserClient();
    } catch {
      return;
    }

    const isPersistedThread =
      Boolean(activeThreadId) &&
      UUID_REGEX.test(activeThreadId) &&
      activeThreadId !== DEFAULT_FALLBACK_WORKSPACE_ID &&
      activeThreadId !== DEFAULT_FALLBACK_GUEST_ID;

    const channelName = `copilot-live-${isPersistedThread ? activeThreadId : "global"}`;
    let channel = supabase.channel(channelName);

    if (isPersistedThread) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ai_messages",
          filter: `thread_id=eq.${activeThreadId}`,
        },
        () => {
          if (activeRunRef.current > 0 && abortControllerRef.current) return;
          getAiConversationThread({ data: { threadId: activeThreadId } })
            .then((detail) => {
              if (detail?.thread?.id === activeThreadId && Array.isArray(detail.messages)) {
                setMessages(detail.messages as ChatMessageItem[]);
              }
            })
            .catch(() => {});
        },
      );
    }

    channel = channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_tasks" },
        () => {
          void refreshBackgroundTasks();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "copilot_executions" },
        (payload: any) => {
          const row = payload?.new;
          if (!row || (activeExecutionId && row.id !== activeExecutionId)) return;
          if (Array.isArray(row.plan)) {
            setExecutionPlan(row.plan as ExecutionPlanStep[]);
          }
          if (row.state?.vfsFiles && typeof row.state.vfsFiles === "object") {
            setVfsFilesMap(row.state.vfsFiles as Record<string, WorkspaceVfsFileEntry>);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeThreadId, isAuthenticated, refreshBackgroundTasks]);

  const handleSelectThread = useCallback(
    (threadId: string) => {
      activeThreadRef.current = threadId;
      activeRunAbortRef.current = true;
      activeRunRef.current += 1;
      setIsSending(false);
      setActiveThreadId(threadId);
      if (
        !isAuthenticated ||
        !UUID_REGEX.test(threadId) ||
        threadId.startsWith("guest-") ||
        threadId === fallbackId
      ) {
        setMessages(guestMessagesRef.current[threadId] || []);
      }
    },
    [fallbackId, isAuthenticated],
  );

  const handleCreateThread = useCallback(
    async (
      type?: ThreadType,
      title?: string,
      opts?: { folderId?: string | null; projectId?: string | null },
    ) => {
      const defaultTitle =
        options.mode === "workspace" ? "Novo atendimento Copilot" : "Nova conversa";
      const targetType: ThreadType =
        type || (options.mode === "workspace" ? "project" : "ai_assistant");
      const safeType = targetType === "project" ? "project" : "ai_assistant";

      if (!isAuthenticated) {
        const localId = `guest-${crypto.randomUUID()}`;
        const guestThread = normalizeThreadItem({
          id: localId,
          type: safeType,
          title: title || defaultTitle,
          status: "open",
          is_pinned: false,
          metadata: {},
          working_memory: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setThreads((prev) => [guestThread, ...prev]);
        setActiveThreadId(localId);
        setMessages([]);
        return guestThread;
      }

      try {
        const created = await createAiConversationThread({
          data: {
            type: safeType,
            title: title || defaultTitle,
            folderId: opts?.folderId ?? undefined,
            projectId: opts?.projectId ?? undefined,
            storeId: safeType === "project" ? undefined : options.storeId || undefined,
          },
        });
        const normalized = normalizeThreadItem({
          ...(created as any),
          type: (created as any).type || safeType,
          title: (created as any).title || title || defaultTitle,
        });
        setThreads((prev) => [normalized, ...prev]);
        setActiveThreadId(normalized.id);
        setMessages([]);
        return normalized;
      } catch (err: any) {
        toast.error(err?.message || "Não foi possível criar uma nova conversa.");
        return null;
      }
    },
    [isAuthenticated, options.mode, options.storeId],
  );

  const handleRenameThread = useCallback(
    async (threadId: string, newTitle: string) => {
      const cleanTitle = newTitle.trim();
      if (cleanTitle.length < 2) {
        toast.error("Informe um título com pelo menos 2 caracteres.");
        return;
      }
      if (!isAuthenticated || threadId.startsWith("guest-") || threadId === fallbackId) {
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, title: cleanTitle } : t)),
        );
        return;
      }
      try {
        await renameAiConversationThread({ data: { threadId, title: cleanTitle } });
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, title: cleanTitle } : t)),
        );
        toast.success("Conversa renomeada.");
      } catch (err: any) {
        toast.error(err?.message || "Erro ao renomear conversa.");
      }
    },
    [fallbackId, isAuthenticated],
  );

  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      const remaining = threads.filter((t) => t.id !== threadId);
      const nextActiveId = remaining[0]?.id || fallbackId;
      const shouldResetMessages =
        activeThreadId === threadId &&
        (!UUID_REGEX.test(nextActiveId) ||
          nextActiveId === fallbackId ||
          nextActiveId.startsWith("guest-"));

      if (!isAuthenticated || threadId.startsWith("guest-") || threadId === fallbackId) {
        setThreads(remaining);
        if (activeThreadId === threadId) {
          setActiveThreadId(nextActiveId);
          if (shouldResetMessages) setMessages([]);
        }
        toast.success("Conversa removida.");
        return;
      }

      try {
        await deleteAiConversationThread({ data: { threadId } });
        setThreads(remaining);
        if (activeThreadId === threadId) {
          setActiveThreadId(nextActiveId);
          if (shouldResetMessages) setMessages([]);
        }
        toast.success("Conversa excluída.");
      } catch (err: any) {
        toast.error(err?.message || "Erro ao excluir conversa.");
      }
    },
    [activeThreadId, fallbackId, isAuthenticated, threads],
  );

  const handleTogglePinThread = useCallback(
    async (threadId: string) => {
      const target = threads.find((t) => t.id === threadId);
      const nextPinned = !Boolean(target?.isPinned);
      if (!isAuthenticated || threadId.startsWith("guest-") || threadId === fallbackId) {
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, isPinned: nextPinned } : t)),
        );
        return;
      }
      try {
        await toggleAiThreadPinned({ data: { threadId, isPinned: nextPinned } });
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, isPinned: nextPinned } : t)),
        );
      } catch (err: any) {
        toast.error(err?.message || "Não foi possível fixar esta conversa.");
      }
    },
    [fallbackId, isAuthenticated, threads],
  );

  const handleToggleArchiveThread = useCallback(
    async (threadId: string) => {
      const target = threads.find((t) => t.id === threadId);
      const nextArchived = !Boolean(target?.isArchived);
      if (!isAuthenticated || threadId.startsWith("guest-") || threadId === fallbackId) {
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, isArchived: nextArchived } : t)),
        );
        return;
      }
      try {
        await toggleAiThreadArchived({ data: { threadId, isArchived: nextArchived } });
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, isArchived: nextArchived } : t)),
        );
        toast.success(nextArchived ? "Conversa arquivada." : "Conversa restaurada.");
      } catch (err: any) {
        toast.error(err?.message || "Erro ao arquivar conversa.");
      }
    },
    [fallbackId, isAuthenticated, threads],
  );

  const handleSendMessage = useCallback(
    async (
      text: string,
      attachments: string[] = [],
      replyToId?: string,
      overrideMode?: CopilotQuickToolMode,
    ) => {
      const cleanText = text.trim();
      if (!cleanText || isSending) return;

      const modeToSend = overrideMode ?? quickToolMode;
      activeRunAbortRef.current = false;
      abortControllerRef.current?.abort();
      const runAbortController = new AbortController();
      abortControllerRef.current = runAbortController;
      setLiveBrowserFrame(null);
      setIsSending(true);

      let targetThreadId = activeThreadId;
      if (isAuthenticated && (!targetThreadId || targetThreadId === fallbackId || targetThreadId.startsWith("guest-"))) {
        const created = await handleCreateThread(
          options.mode === "workspace" ? "project" : "ai_assistant",
          cleanText.slice(0, 48),
          { folderId: selectedFolderId, projectId: selectedProjectId },
        );
        if (created?.id) {
          targetThreadId = created.id;
          activeThreadRef.current = created.id;
        }
      }

      const requestThreadId = targetThreadId || fallbackId;
      const runId = ++activeRunRef.current;
      const clientMsgId = crypto.randomUUID();
      const streamingAiId = `stream-${clientMsgId}`;

      const optimisticUserMsg: ChatMessageItem = {
        id: clientMsgId,
        clientMessageId: clientMsgId,
        threadId: requestThreadId,
        senderName: "Você",
        senderId: options.userId || "guest",
        isStaffOrAI: false,
        text: cleanText,
        createdAt: new Date().toISOString(),
        status: "sending",
        attachments,
      };
      setMessages((prev) => [...prev, optimisticUserMsg]);

      const isGuestFlow =
        !isAuthenticated ||
        !targetThreadId ||
        targetThreadId === fallbackId ||
        targetThreadId.startsWith("guest-");

      let uploadedAttachments: string[] = [];
      let receivedStreamPayload = false;
      let pendingCheckpointExecutionId: string | null = null;
      pausedByUserRef.current = false;
      setIsExecutionPaused(false);
      setExecutionPlan([]);
      setVfsFilesMap({});

      const applyStreamEvent = (ev: AiSseEvent) => {
        if (
          activeRunAbortRef.current ||
          activeRunRef.current !== runId ||
          activeThreadRef.current !== requestThreadId
        ) {
          return;
        }
        receivedStreamPayload = true;

        const upsertStreamingAi = (updater: (cur: ChatMessageItem) => ChatMessageItem) => {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === streamingAiId);
            const base: ChatMessageItem = exists
              ? (prev.find((m) => m.id === streamingAiId) as ChatMessageItem)
              : {
                  id: streamingAiId,
                  threadId: requestThreadId,
                  senderName: options.senderName || "Waesy Copilot",
                  senderId: "copilot-ai",
                  isStaffOrAI: true,
                  text: "",
                  createdAt: new Date().toISOString(),
                  status: "sending",
                  activitySteps: [],
                };
            const updated = updater(base);
            if (!exists) {
              return [...prev, updated];
            }
            return prev.map((m) => (m.id === streamingAiId ? updated : m));
          });
        };

        switch (ev.type) {
          case "run_started": {
            setActiveExecutionId(ev.executionId);
            upsertStreamingAi((cur) => ({ ...cur, executionId: ev.executionId }));
            break;
          }
          case "plan_updated": {
            setExecutionPlan(Array.isArray(ev.steps) ? ev.steps : []);
            break;
          }
          case "file_updated": {
            if (ev.file?.path) {
              setVfsFilesMap((prev) => ({
                ...prev,
                [ev.file.path]: ev.file,
              }));
            }
            break;
          }
          case "checkpoint": {
            if (ev.canAutoContinue && ev.executionId) {
              pendingCheckpointExecutionId = ev.executionId;
            }
            break;
          }
          case "status": {
            upsertStreamingAi((cur) => ({
              ...cur,
              fsmPhase: ev.phase === "planning" ? "UNDERSTANDING" : ev.phase === "verifying" ? "VALIDATING" : "RUNNING",
            }));
            break;
          }
          case "step_started":
          case "step_completed": {
            upsertStreamingAi((cur) => {
              const list = [...(cur.activitySteps || [])];
              const idx = list.findIndex((s) => s.id === ev.step.id);
              if (idx >= 0) list[idx] = { ...list[idx], ...ev.step };
              else list.push(ev.step);
              return { ...cur, activitySteps: list };
            });
            break;
          }
          case "step_updated": {
            upsertStreamingAi((cur) => ({
              ...cur,
              activitySteps: (cur.activitySteps || []).map((s) =>
                s.id === ev.stepId ? { ...s, ...ev.patch } : s,
              ),
            }));
            break;
          }
          case "browser_frame": {
            setLiveBrowserFrame({
              stepId: ev.stepId,
              url: ev.url,
              screenshotUrl: ev.screenshotUrl,
              liveViewerUrl: ev.liveViewerUrl,
              sessionId: ev.sessionId,
              driver: ev.driver,
              title: ev.title,
            });
            upsertStreamingAi((cur) => ({
              ...cur,
              activitySteps: (cur.activitySteps || []).map((s) =>
                !ev.stepId || s.id === ev.stepId
                  ? {
                      ...s,
                      browserUrl: ev.url,
                      screenshotUrl: ev.screenshotUrl || s.screenshotUrl,
                      liveViewerUrl: ev.liveViewerUrl || s.liveViewerUrl,
                      driver: ev.driver || s.driver,
                    }
                  : s,
              ),
            }));
            break;
          }
          case "artifact_draft": {
            upsertStreamingAi((cur) =>
              cur.artifact
                ? cur
                : {
                    ...cur,
                    artifact: {
                      id: `draft-${streamingAiId}`,
                      type: ev.artifactType as ChatArtifactData["type"],
                      title: ev.title,
                      version: 1,
                      totalVersions: 1,
                      previewSummary: "Gerando artefato em tempo real...",
                      data: ev.partialPayload || {},
                    },
                  },
            );
            break;
          }
          case "artifact_ready": {
            upsertStreamingAi((cur) => ({
              ...cur,
              artifact: ev.artifact as unknown as ChatArtifactData,
            }));
            break;
          }
          case "widget": {
            upsertStreamingAi((cur) => {
              const prevWidgets = Array.isArray(cur.structuredPayload?.widgets)
                ? cur.structuredPayload.widgets
                : [];
              return {
                ...cur,
                structuredPayload: {
                  ...(cur.structuredPayload || {}),
                  widgets: [...prevWidgets, { widgetType: ev.widgetType, payload: ev.payload }],
                },
              };
            });
            break;
          }
          case "structured": {
            upsertStreamingAi((cur) => ({
              ...cur,
              structuredPayload: {
                ...(cur.structuredPayload || {}),
                ...(ev.payload || {}),
              },
            }));
            break;
          }
          case "delta": {
            if (ev.text) {
              upsertStreamingAi((cur) => ({
                ...cur,
                text: `${cur.text || ""}${ev.text}`,
              }));
            }
            break;
          }
          case "done": {
            const finalAi = ev.aiMessage as Record<string, any> | undefined;
            if (Array.isArray(finalAi?.plan)) {
              setExecutionPlan(finalAi.plan);
            }
            if (Array.isArray(finalAi?.vfsFiles) && finalAi.vfsFiles.length > 0) {
              setVfsFilesMap((prev) => {
                const next = { ...prev };
                for (const vf of finalAi.vfsFiles) {
                  if (vf?.path) next[vf.path] = vf;
                }
                return next;
              });
            }
            if (pendingCheckpointExecutionId || finalAi?.checkpoint?.hasMore) {
              break;
            }
            setIsExecutionPaused(false);
            setMessages((prev) => {
              const withoutStream = prev.filter((m) => m.id !== streamingAiId);
              const existingStream = prev.find((m) => m.id === streamingAiId);
              const deliveredUser = withoutStream.map((m) =>
                m.id === clientMsgId ? { ...m, status: "delivered" as const } : m,
              );
              const finalItem: ChatMessageItem = finalAi
                ? {
                    id: String(finalAi.id || crypto.randomUUID()),
                    threadId: requestThreadId,
                    senderName: options.senderName || "Waesy Copilot",
                    senderId: "copilot-ai",
                    isStaffOrAI: true,
                    text: String(finalAi.text || existingStream?.text || ""),
                    createdAt: String(finalAi.createdAt || new Date().toISOString()),
                    status: (finalAi.status as ChatMessageItem["status"]) || "delivered",
                    activitySteps: finalAi.activitySteps || existingStream?.activitySteps || [],
                    executionId: finalAi.executionId || ev.executionId,
                    artifact: (finalAi.artifact || existingStream?.artifact) ?? undefined,
                    structuredPayload:
                      (finalAi.structuredPayload || existingStream?.structuredPayload) ?? undefined,
                    sources: finalAi.sources || existingStream?.sources || [],
                    fsmPhase: finalAi.fsmPhase,
                    fsmState: finalAi.fsmState,
                    toolCalls: finalAi.toolCalls || [],
                  }
                : {
                    ...(existingStream || {
                      id: crypto.randomUUID(),
                      threadId: requestThreadId,
                      senderName: options.senderName || "Waesy Copilot",
                      senderId: "copilot-ai",
                      isStaffOrAI: true,
                      text: "",
                      createdAt: new Date().toISOString(),
                      status: "delivered",
                    }),
                    id: crypto.randomUUID(),
                    status: "delivered",
                  };
              return [...deliveredUser, finalItem];
            });
            if (!isGuestFlow && ev.updatedWorkingMemory) {
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === requestThreadId
                    ? {
                        ...t,
                        workingMemory: ev.updatedWorkingMemory || t.workingMemory,
                        lastMessageSnippet: String(finalAi?.text || "").slice(0, 140),
                        lastMessageAt: String(finalAi?.createdAt || new Date().toISOString()),
                      }
                    : t,
                ),
              );
            }
            break;
          }
          case "error": {
            throw new Error(ev.message || "Falha no streaming do Copilot.");
          }
        }
      };

      try {
        if (!isGuestFlow && attachments.length > 0) {
          uploadedAttachments = await uploadComposerAttachments(
            attachments,
            uploadCopilotMultimodalAttachment as any,
          );
        }

        // Tenta streaming progressivo SSE (/api/ai/stream) antes do fallback RPC síncrono
        let streamCompleted = false;
        try {
          const response = await fetch("/api/ai/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            signal: runAbortController.signal,
            body: JSON.stringify({
              task: "chat",
              copilotMode: true,
              guest: isGuestFlow,
              threadId: isGuestFlow ? undefined : requestThreadId,
              clientMessageId: clientMsgId,
              message: cleanText,
              prompt: cleanText,
              replyToId,
              attachments: uploadedAttachments,
              quickToolMode: modeToSend,
              storeId: options.storeId || undefined,
              folderId: selectedFolderId,
              projectId: selectedProjectId,
              userLat: options.userCoords?.lat,
              userLng: options.userCoords?.lng,
              city: options.city,
            }),
          });

          const contentType = response.headers.get("content-type") || "";
          if (response.ok && response.body && contentType.includes("text/event-stream")) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let sseBuffer = "";
            let sawDone = false;

            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              sseBuffer += decoder.decode(value, { stream: true });
              const frames = sseBuffer.split("\n\n");
              sseBuffer = frames.pop() ?? "";

              for (const frame of frames) {
                const dataLine = frame
                  .split("\n")
                  .find((line) => line.startsWith("data:"));
                if (!dataLine) continue;
                const jsonStr = dataLine.slice(5).trim();
                if (!jsonStr) continue;
                const parsed = JSON.parse(jsonStr) as AiSseEvent;
                if (parsed.type === "done") sawDone = true;
                applyStreamEvent(parsed);
              }
            }
            if (sawDone) {
              streamCompleted = true;
            }
          } else if (response.status >= 400 && response.status < 500) {
            const errBody = await response.json().catch(() => null);
            if (errBody?.error) {
              throw new Error(String(errBody.error));
            }
          }

          // Continuação automática transparente entre chunks quando houver checkpoint salvo
          let autoChainTurns = 0;
          while (
            streamCompleted &&
            pendingCheckpointExecutionId &&
            !pausedByUserRef.current &&
            !activeRunAbortRef.current &&
            !runAbortController.signal.aborted &&
            autoChainTurns < 4
          ) {
            const nextContinueId = pendingCheckpointExecutionId;
            pendingCheckpointExecutionId = null;
            autoChainTurns += 1;

            const contRes = await fetch("/api/ai/stream", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              signal: runAbortController.signal,
              body: JSON.stringify({
                task: "chat",
                copilotMode: true,
                threadId: isGuestFlow ? undefined : requestThreadId,
                continueExecutionId: nextContinueId,
                quickToolMode: modeToSend,
                city: options.city,
              }),
            });

            const contType = contRes.headers.get("content-type") || "";
            if (!contRes.ok || !contRes.body || !contType.includes("text/event-stream")) {
              break;
            }
            const contReader = contRes.body.getReader();
            const contDecoder = new TextDecoder();
            let contBuffer = "";
            while (true) {
              const { value, done } = await contReader.read();
              if (done) break;
              contBuffer += contDecoder.decode(value, { stream: true });
              const frames = contBuffer.split("\n\n");
              contBuffer = frames.pop() ?? "";
              for (const frame of frames) {
                const dataLine = frame
                  .split("\n")
                  .find((line) => line.startsWith("data:"));
                if (!dataLine) continue;
                const jsonStr = dataLine.slice(5).trim();
                if (!jsonStr) continue;
                applyStreamEvent(JSON.parse(jsonStr) as AiSseEvent);
              }
            }
          }
        } catch (streamErr: any) {
          if (runAbortController.signal.aborted || activeRunAbortRef.current) {
            return;
          }
          if (receivedStreamPayload) {
            throw streamErr;
          }
          // Falha pré-stream (ex: ambiente de teste sem rota SSR ou conexão inicial) — prossegue ao fallback síncrono
        }

        if (streamCompleted) {
          return;
        }

        if (isGuestFlow) {
          const guestRes = await executeGuestCopilotMessage({
            data: {
              message: cleanText,
              quickToolMode: modeToSend,
              userLat: options.userCoords?.lat,
              userLng: options.userCoords?.lng,
              city: options.city,
            },
          });

          if (
            activeRunAbortRef.current ||
            activeRunRef.current !== runId ||
            activeThreadRef.current !== requestThreadId
          ) {
            return;
          }

          setMessages((prev) => [
            ...prev.filter((m) => m.id !== streamingAiId).map((m) =>
              m.id === clientMsgId ? { ...m, status: "delivered" as const } : m,
            ),
            {
              id: crypto.randomUUID(),
              threadId: requestThreadId,
              senderName: options.senderName || "Waesy Copilot",
              senderId: "copilot-ai",
              isStaffOrAI: true,
              text: guestRes.responseMessage,
              createdAt: new Date().toISOString(),
              status: "delivered",
              activitySteps: guestRes.activitySteps,
              executionId: guestRes.executionId,
              artifact: guestRes.artifact,
              structuredPayload: guestRes.structuredPayload,
              sources: guestRes.sources,
              fsmPhase: guestRes.fsmPhase,
              fsmState: guestRes.fsmState,
              toolCalls: guestRes.toolCalls,
            },
          ]);
          return;
        }

        const res = await sendAiConversationMessage({
          data: {
            threadId: requestThreadId,
            clientMessageId: clientMsgId,
            message: cleanText,
            replyToId,
            attachments: uploadedAttachments,
            quickToolMode: modeToSend,
            userLat: options.userCoords?.lat,
            userLng: options.userCoords?.lng,
            city: options.city,
          },
        });

        if (
          activeRunAbortRef.current ||
          activeRunRef.current !== runId ||
          activeThreadRef.current !== requestThreadId
        ) {
          return;
        }

        setMessages((prev) => [
          ...prev.filter((m) => m.id !== streamingAiId).map((m) =>
            m.id === clientMsgId
              ? { ...m, id: res.userMessageId || m.id, status: "delivered" as const }
              : m,
          ),
          {
            id: res.aiMessage.id,
            threadId: requestThreadId,
            senderName: options.senderName || "Waesy Copilot",
            senderId: "copilot-ai",
            isStaffOrAI: true,
            text: res.aiMessage.text,
            createdAt: res.aiMessage.createdAt,
            status: res.aiMessage.status as ChatMessageItem["status"],
            activitySteps: res.aiMessage.activitySteps,
            executionId: res.aiMessage.executionId,
            artifact: res.aiMessage.artifact ?? undefined,
            structuredPayload: res.aiMessage.structuredPayload,
            sources: res.aiMessage.sources,
            fsmPhase: res.aiMessage.fsmPhase,
            fsmState: res.aiMessage.fsmState,
            toolCalls: res.aiMessage.toolCalls,
          },
        ]);

        setThreads((prev) =>
          prev.map((t) =>
            t.id === requestThreadId
              ? {
                  ...t,
                  workingMemory: res.updatedWorkingMemory || t.workingMemory,
                  lastMessageSnippet: res.aiMessage.text?.slice(0, 140),
                  lastMessageAt: res.aiMessage.createdAt,
                }
              : t,
          ),
        );
      } catch (err: any) {
        if (
          !activeRunAbortRef.current &&
          activeRunRef.current === runId &&
          activeThreadRef.current === requestThreadId
        ) {
          setMessages((prev) =>
            prev
              .filter((m) => m.id !== streamingAiId)
              .map((m) => (m.id === clientMsgId ? { ...m, status: "failed" as const } : m)),
          );
          toast.error(err?.message || "Falha ao processar mensagem com o Copilot.");
        }
      } finally {
        if (abortControllerRef.current === runAbortController) {
          abortControllerRef.current = null;
        }
        if (activeRunRef.current === runId) {
          setIsSending(false);
        }
      }
    },
    [
      activeThreadId,
      fallbackId,
      handleCreateThread,
      isAuthenticated,
      isSending,
      options.city,
      options.mode,
      options.senderName,
      options.storeId,
      options.userCoords?.lat,
      options.userCoords?.lng,
      options.userId,
      quickToolMode,
      selectedFolderId,
      selectedProjectId,
    ],
  );

  const handleRetryMessage = useCallback(
    async (messageId: string) => {
      const failed = messages.find((m) => m.id === messageId);
      if (!failed || !failed.text) return;
      if (failed.fsmPhase && failed.fsmPhase !== "FAILED_RETRYABLE") {
        toast.error("Esta execução não pode ser repetida automaticamente.");
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      await handleSendMessage(failed.text, failed.attachments || []);
    },
    [handleSendMessage, messages],
  );

  const handleCancelActiveRun = useCallback(() => {
    pausedByUserRef.current = true;
    activeRunAbortRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsSending(false);
    if (isAuthenticated && activeExecutionId) {
      void controlCopilotExecutionFn({
        data: { executionId: activeExecutionId, action: "cancel" },
      }).catch(() => {});
    }
    toast.info("Execução interrompida pelo usuário.");
  }, [activeExecutionId, isAuthenticated]);

  const handlePauseExecution = useCallback(async () => {
    pausedByUserRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsSending(false);
    setIsExecutionPaused(true);
    if (isAuthenticated && activeExecutionId) {
      await controlCopilotExecutionFn({
        data: { executionId: activeExecutionId, action: "pause" },
      }).catch(() => {});
    }
    toast.info("Agente pausado. Envie orientação ou retome quando desejar.");
  }, [activeExecutionId, isAuthenticated]);

  const handleResumeExecution = useCallback(
    async (guidance?: string) => {
      if (!isAuthenticated || !activeExecutionId) {
        toast.info("Nenhuma execução pausada para retomar.");
        return;
      }
      pausedByUserRef.current = false;
      activeRunAbortRef.current = false;
      setIsExecutionPaused(false);
      setIsSending(true);
      const runId = ++activeRunRef.current;
      const runAbortController = new AbortController();
      abortControllerRef.current = runAbortController;

      try {
        await controlCopilotExecutionFn({
          data: {
            executionId: activeExecutionId,
            action: guidance?.trim() ? "inject_guidance" : "resume",
            guidance: guidance?.trim() || undefined,
          },
        });

        let currentContinueId: string | null = activeExecutionId;
        let safetyLoops = 0;
        const streamingResumeId = `resume-${activeExecutionId}`;
        while (currentContinueId && safetyLoops < 4 && !runAbortController.signal.aborted) {
          const nextId: string = currentContinueId;
          currentContinueId = null;
          safetyLoops += 1;

          const response = await fetch("/api/ai/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            signal: runAbortController.signal,
            body: JSON.stringify({
              task: "chat",
              copilotMode: true,
              threadId: activeThreadId,
              continueExecutionId: nextId,
              userGuidance: safetyLoops === 1 ? guidance?.trim() || undefined : undefined,
              quickToolMode,
              city: options.city,
            }),
          });
          if (!response.ok || !response.body) {
            throw new Error("Falha ao retomar execução do Copilot.");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const frames = buf.split("\n\n");
            buf = frames.pop() ?? "";
            for (const frame of frames) {
              const dataLine = frame
                .split("\n")
                .find((line) => line.startsWith("data:"));
              if (!dataLine) continue;
              const rawJson = dataLine.slice(5).trim();
              if (!rawJson) continue;
              const ev = JSON.parse(rawJson) as AiSseEvent;
              if (ev.type === "plan_updated") {
                setExecutionPlan(ev.steps || []);
              } else if (ev.type === "file_updated" && ev.file?.path) {
                setVfsFilesMap((prev) => ({ ...prev, [ev.file.path]: ev.file }));
              } else if (ev.type === "browser_frame") {
                setLiveBrowserFrame({
                  stepId: ev.stepId,
                  url: ev.url,
                  screenshotUrl: ev.screenshotUrl,
                  liveViewerUrl: ev.liveViewerUrl,
                  sessionId: ev.sessionId,
                  driver: ev.driver,
                  title: ev.title,
                });
              } else if (ev.type === "checkpoint" && ev.canAutoContinue) {
                currentContinueId = ev.executionId;
              } else if (
                ev.type === "done" &&
                ev.aiMessage &&
                !(ev.aiMessage.checkpoint as { hasMore?: boolean } | undefined)?.hasMore
              ) {
                const finalItem = ev.aiMessage as unknown as ChatMessageItem;
                setMessages((prev) => [
                  ...prev.filter((m) => m.id !== streamingResumeId && m.id !== finalItem.id),
                  finalItem,
                ]);
              } else if (ev.type === "delta" && ev.text) {
                setMessages((prev) => {
                  const exists = prev.some((m) => m.id === streamingResumeId);
                  if (!exists) {
                    return [
                      ...prev,
                      {
                        id: streamingResumeId,
                        threadId: activeThreadId,
                        senderName: options.senderName || "Waesy Copilot",
                        senderId: "copilot-ai",
                        isStaffOrAI: true,
                        text: ev.text,
                        createdAt: new Date().toISOString(),
                        status: "sending",
                        executionId: activeExecutionId,
                      },
                    ];
                  }
                  return prev.map((m) =>
                    m.id === streamingResumeId ? { ...m, text: `${m.text || ""}${ev.text}` } : m,
                  );
                });
              }
            }
          }
        }
      } catch (err: any) {
        if (!runAbortController.signal.aborted) {
          toast.error(err?.message || "Não foi possível retomar a tarefa.");
        }
      } finally {
        if (abortControllerRef.current === runAbortController) {
          abortControllerRef.current = null;
        }
        if (activeRunRef.current === runId) {
          setIsSending(false);
        }
      }
    },
    [activeExecutionId, activeThreadId, isAuthenticated, options.city, options.senderName, quickToolMode],
  );

  const handleTakeBrowserControl = useCallback(
    (targetUrl: string) => {
      if (targetUrl && targetUrl.startsWith("http")) {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      }
      if (isSending) {
        void handlePauseExecution();
      } else {
        toast.info("Sessão aberta para controle manual. Envie orientação para o agente continuar.");
      }
    },
    [handlePauseExecution, isSending],
  );

  const handleUploadAttachment = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const base64Data = await readFileAsBase64DataUrl(file);
        const uploaded = await uploadCopilotMultimodalAttachment({
          data: {
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            base64Data,
            tenantId: options.storeId || undefined,
          },
        });
        toast.success(`Anexo "${uploaded.fileName}" carregado.`);
        return uploaded.url;
      } catch (err: any) {
        toast.error(err?.message || "Falha ao anexar arquivo.");
        return null;
      }
    },
    [options.storeId],
  );

  const handleStructuredAction = useCallback(
    async (action: AIChatAction) => {
      await dispatchCopilotClientAction(action, {
        mode: options.mode,
        navigate: options.navigate,
        onAddedToCart: options.onAddedToCart,
        onBeforeNavigate: options.onBeforeNavigate,
        notify: {
          success: (msg) => toast.success(msg),
          info: (msg) => toast.info(msg),
          error: (msg) => toast.error(msg),
        },
      });
    },
    [options.mode, options.navigate, options.onAddedToCart, options.onBeforeNavigate],
  );

  const handleCreateFolder = useCallback(
    async (name: string) => {
      const cleanName = name.trim();
      if (cleanName.length < 2) return;
      try {
        const folder = await createCopilotFolder({
          data: {
            name: cleanName,
            storeId: options.storeId || undefined,
          },
        });
        setFolders((prev) => [...prev, folder]);
        toast.success(`Pasta "${folder.name}" criada.`);
      } catch (err: any) {
        toast.error(err?.message || "Erro ao criar pasta.");
      }
    },
    [options.storeId],
  );

  const handleRenameFolder = useCallback(
    async (folderId: string, name: string) => {
      const cleanName = name.trim();
      if (cleanName.length < 2) {
        toast.error("Informe um nome com pelo menos 2 caracteres.");
        return;
      }
      try {
        const updated = await updateCopilotFolder({
          data: { folderId, name: cleanName },
        });
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? { ...f, ...updated } : f)),
        );
        toast.success(`Pasta "${updated.name}" atualizada.`);
      } catch (err: any) {
        toast.error(err?.message || "Erro ao renomear pasta.");
      }
    },
    [],
  );

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      try {
        await deleteCopilotFolder({ data: { folderId } });
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        setProjects((prev) =>
          prev.map((p) => (p.folder_id === folderId ? { ...p, folder_id: null } : p)),
        );
        setThreads((prev) =>
          prev.map((t) =>
            t.folderId === folderId || t.metadata?.folder_id === folderId
              ? {
                  ...t,
                  folderId: null,
                  metadata: { ...(t.metadata || {}), folder_id: null },
                }
              : t,
          ),
        );
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
        }
        toast.success("Pasta excluída. Suas conversas e projetos foram mantidos.");
      } catch (err: any) {
        toast.error(err?.message || "Erro ao excluir pasta.");
      }
    },
    [selectedFolderId],
  );

  const handleCreateProject = useCallback(
    async (input: {
      title: string;
      description?: string;
      systemInstructions?: string;
      folderId?: string | null;
    }) => {
      try {
        const project = await createCopilotProject({
          data: {
            title: input.title,
            description: input.description,
            systemInstructions: input.systemInstructions,
            folderId: input.folderId,
            storeId: options.storeId || undefined,
          },
        });
        setProjects((prev) => [project, ...prev]);
        toast.success(`Projeto "${project.title}" criado.`);
        return project;
      } catch (err: any) {
        toast.error(err?.message || "Erro ao criar projeto.");
        return null;
      }
    },
    [options.storeId],
  );

  const handleUpdateProject = useCallback(
    async (
      projectId: string,
      patch: {
        title?: string;
        description?: string | null;
        systemInstructions?: string | null;
        folderId?: string | null;
      },
    ) => {
      try {
        const updated = await updateCopilotProject({
          data: { projectId, ...patch },
        });
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, ...updated, file_count: p.file_count ?? updated.file_count }
              : p,
          ),
        );
        toast.success(`Projeto "${updated.title}" atualizado.`);
      } catch (err: any) {
        toast.error(err?.message || "Erro ao atualizar projeto.");
      }
    },
    [],
  );

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      try {
        await deleteCopilotProject({ data: { projectId } });
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        setThreads((prev) =>
          prev.map((t) =>
            t.projectId === projectId || t.metadata?.project_id === projectId
              ? {
                  ...t,
                  projectId: null,
                  metadata: { ...(t.metadata || {}), project_id: null },
                }
              : t,
          ),
        );
        if (selectedProjectId === projectId) {
          setSelectedProjectId(null);
        }
        if (resolvedProjectId === projectId) {
          setProjectFiles([]);
        }
        toast.success("Projeto excluído. As conversas vinculadas foram preservadas.");
      } catch (err: any) {
        toast.error(err?.message || "Erro ao excluir projeto.");
      }
    },
    [resolvedProjectId, selectedProjectId],
  );

  const handleAssignThreadHierarchy = useCallback(
    async (
      threadId: string,
      hierarchy: { folderId?: string | null; projectId?: string | null },
    ) => {
      const targetProject = hierarchy.projectId
        ? projects.find((p) => p.id === hierarchy.projectId)
        : undefined;
      const resolvedFolderId =
        hierarchy.folderId !== undefined
          ? hierarchy.folderId
          : (targetProject?.folder_id ?? null);
      const resolvedProjectIdValue = hierarchy.projectId ?? null;

      try {
        await assignThreadHierarchy({
          data: {
            threadId,
            folderId: resolvedFolderId,
            projectId: resolvedProjectIdValue,
          },
        });
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  type: resolvedProjectIdValue ? "project" : t.type,
                  folderId: resolvedFolderId,
                  projectId: resolvedProjectIdValue,
                  metadata: {
                    ...(t.metadata || {}),
                    folder_id: resolvedFolderId,
                    project_id: resolvedProjectIdValue,
                  },
                }
              : t,
          ),
        );
        toast.success("Organização da conversa atualizada.");
      } catch (err: any) {
        toast.error(err?.message || "Não foi possível mover a conversa.");
      }
    },
    [projects],
  );

  const handleUploadProjectFile = useCallback(
    async (payload: {
      projectId: string;
      filename: string;
      fileType: string;
      fileSize: number;
      contentText: string;
    }) => {
      try {
        const uploaded = await uploadCopilotProjectContextFile({ data: payload });
        setProjectFiles((prev) => [uploaded, ...prev]);
        toast.success(`Fonte "${uploaded.filename}" indexada.`);
      } catch (err: any) {
        toast.error(err?.message || "Falha ao carregar arquivo do projeto.");
      }
    },
    [],
  );

  const handleDeleteProjectFile = useCallback(async (fileId: string) => {
    try {
      await deleteCopilotProjectContextFile({ data: { fileId } });
      setProjectFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success("Fonte removida do projeto.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover fonte.");
    }
  }, []);

  const handleUpdateProjectInstructions = useCallback(
    async (projectId: string, instructions: string) => {
      try {
        const updated = await updateCopilotProject({
          data: { projectId, systemInstructions: instructions },
        });
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, system_instructions: updated.system_instructions } : p,
          ),
        );
        toast.success("Instruções do projeto salvas.");
      } catch (err: any) {
        toast.error(err?.message || "Erro ao atualizar instruções do projeto.");
      }
    },
    [],
  );

  const handleCancelBackgroundTask = useCallback(async (taskId: string) => {
    try {
      await cancelDurableAiTask({ data: { taskId, reason: "Cancelado no painel" } });
      setBackgroundTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, status: "cancelled" } : task)),
      );
      toast.info("Tarefa em segundo plano cancelada.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao cancelar tarefa.");
    }
  }, []);

  const computerSteps = useMemo(
    () => deriveManusComputerSteps(messages, backgroundTasks),
    [messages, backgroundTasks],
  );

  const aggregatedSources = useMemo(
    () => extractAggregatedSources(messages, projectFiles),
    [messages, projectFiles],
  );

  const telemetrySummary = useMemo(
    () =>
      computeCopilotSessionTelemetry({
        messages,
        backgroundTasks,
        threadCreatedAt: activeThread?.createdAt,
      }),
    [activeThread?.createdAt, backgroundTasks, messages],
  );

  const latestArtifact: ChatArtifactData | null = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].artifact) return messages[i].artifact || null;
    }
    return null;
  }, [messages]);

  return {
    threads,
    setThreads,
    activeThreadId,
    setActiveThreadId,
    activeThread,
    activeProject,
    selectedFolderId,
    setSelectedFolderId,
    selectedProjectId,
    setSelectedProjectId,
    messages,
    setMessages,
    isLoadingThread,
    isSending,
    quickToolMode,
    setQuickToolMode,
    folders,
    projects,
    projectFiles,
    isLoadingProjectFiles,
    backgroundTasks,
    computerSteps,
    aggregatedSources,
    telemetrySummary,
    latestArtifact,
    liveBrowserFrame,
    executionPlan,
    vfsFiles,
    activeExecutionId,
    isExecutionPaused,
    refreshBackgroundTasks,
    handleSelectThread,
    handleCreateThread,
    handleRenameThread,
    handleDeleteThread,
    handleTogglePinThread,
    handleToggleArchiveThread,
    handleSendMessage,
    handleRetryMessage,
    handleCancelActiveRun,
    handlePauseExecution,
    handleResumeExecution,
    handleTakeBrowserControl,
    handleUploadAttachment,
    handleStructuredAction,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleCreateProject,
    handleUpdateProject,
    handleDeleteProject,
    handleAssignThreadHierarchy,
    handleUploadProjectFile,
    handleDeleteProjectFile,
    handleUpdateProjectInstructions,
    handleCancelBackgroundTask,
  };
}
