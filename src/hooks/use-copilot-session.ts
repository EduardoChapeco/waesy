import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
  deleteCopilotProjectContextFile,
  listCopilotProjectFiles,
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
import type { ChatArtifactData, ChatSourceItem, CopilotQuickToolMode } from "@/types/chat";

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
        const tool: ManusComputerStep["tool"] =
          lower.includes("web") || lower.includes("busca") || lower.includes("mapa") || act.type === "search"
            ? "browser"
            : lower.includes("artefato") || lower.includes("documento") || lower.includes("site")
              ? "editor"
              : "bash";

        steps.push({
          id: act.id || `step-${seq}`,
          index: seq++,
          title: act.label || "Etapa de execução",
          tool,
          target: act.role || act.type || "copilot-runtime",
          timestamp: act.startedAt || msg.createdAt,
          terminalOutput: tool === "bash" ? act.detail || act.label : undefined,
          browserSummary: tool === "browser" ? act.detail || act.label : undefined,
          fileDiff:
            tool === "editor" && msg.artifact
              ? {
                  filename: `${msg.artifact.title || "artefato"}.md`,
                  original: "",
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
  const activeRunAbortRef = useRef<boolean>(false);
  const threadLoadSeqRef = useRef(0);

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

  const handleSelectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
  }, []);

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
      if (!isAuthenticated || threadId.startsWith("guest-") || threadId === fallbackId) {
        setThreads((prev) => {
          const next = prev.filter((t) => t.id !== threadId);
          if (activeThreadId === threadId) {
            setActiveThreadId(next[0]?.id || fallbackId);
            setMessages([]);
          }
          return next;
        });
        return;
      }
      try {
        await deleteAiConversationThread({ data: { threadId } });
        setThreads((prev) => {
          const next = prev.filter((t) => t.id !== threadId);
          if (activeThreadId === threadId) {
            const nextId = next[0]?.id || fallbackId;
            setActiveThreadId(nextId);
            if (!UUID_REGEX.test(nextId) || nextId === fallbackId) {
              setMessages([]);
            }
          }
          return next;
        });
        toast.success("Conversa excluída.");
      } catch (err: any) {
        toast.error(err?.message || "Erro ao excluir conversa.");
      }
    },
    [activeThreadId, fallbackId, isAuthenticated],
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
      setIsSending(true);

      let targetThreadId = activeThreadId;
      if (isAuthenticated && (!targetThreadId || targetThreadId === fallbackId || targetThreadId.startsWith("guest-"))) {
        const created = await handleCreateThread(
          options.mode === "workspace" ? "project" : "ai_assistant",
          cleanText.slice(0, 48),
          { folderId: selectedFolderId, projectId: selectedProjectId },
        );
        if (created?.id) targetThreadId = created.id;
      }

      const clientMsgId = crypto.randomUUID();
      const optimisticUserMsg: ChatMessageItem = {
        id: clientMsgId,
        clientMessageId: clientMsgId,
        threadId: targetThreadId || fallbackId,
        senderName: "Você",
        senderId: options.userId || "guest",
        isStaffOrAI: false,
        text: cleanText,
        createdAt: new Date().toISOString(),
        status: "sending",
        attachments,
      };
      setMessages((prev) => [...prev, optimisticUserMsg]);

      try {
        if (
          !isAuthenticated ||
          !targetThreadId ||
          targetThreadId === fallbackId ||
          targetThreadId.startsWith("guest-")
        ) {
          const guestRes = await executeGuestCopilotMessage({
            data: {
              message: cleanText,
              quickToolMode: modeToSend,
              userLat: options.userCoords?.lat,
              userLng: options.userCoords?.lng,
              city: options.city,
            },
          });

          if (activeRunAbortRef.current) return;

          setMessages((prev) => [
            ...prev.map((m) => (m.id === clientMsgId ? { ...m, status: "delivered" as const } : m)),
            {
              id: crypto.randomUUID(),
              threadId: targetThreadId || fallbackId,
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

        const uploadedAttachments = await uploadComposerAttachments(
          attachments,
          uploadCopilotMultimodalAttachment as any,
        );

        const res = await sendAiConversationMessage({
          data: {
            threadId: targetThreadId,
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

        if (activeRunAbortRef.current) return;

        setMessages((prev) => [
          ...prev.map((m) =>
            m.id === clientMsgId
              ? { ...m, id: res.userMessageId || m.id, status: "delivered" as const }
              : m,
          ),
          {
            id: res.aiMessage.id,
            threadId: targetThreadId,
            senderName: options.senderName || "Waesy Copilot",
            senderId: "copilot-ai",
            isStaffOrAI: true,
            text: res.aiMessage.text,
            createdAt: res.aiMessage.createdAt,
            status: res.aiMessage.status as ChatMessageItem["status"],
            activitySteps: res.aiMessage.activitySteps,
            executionId: res.aiMessage.executionId,
            artifact: res.aiMessage.artifact,
            structuredPayload: res.aiMessage.structuredPayload,
            sources: res.aiMessage.sources,
            fsmPhase: res.aiMessage.fsmPhase,
            fsmState: res.aiMessage.fsmState,
            toolCalls: res.aiMessage.toolCalls,
          },
        ]);

        setThreads((prev) =>
          prev.map((t) =>
            t.id === targetThreadId
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
        if (!activeRunAbortRef.current) {
          setMessages((prev) =>
            prev.map((m) => (m.id === clientMsgId ? { ...m, status: "failed" as const } : m)),
          );
          toast.error(err?.message || "Falha ao processar mensagem com o Copilot.");
        }
      } finally {
        setIsSending(false);
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
      const target = messages.find((m) => m.id === messageId);
      if (!target || !target.text) return;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      await handleSendMessage(target.text, target.attachments || []);
    },
    [handleSendMessage, messages],
  );

  const handleCancelActiveRun = useCallback(() => {
    activeRunAbortRef.current = true;
    setIsSending(false);
    toast.info("Geração cancelada no cliente.");
  }, []);

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

  const handleAssignThreadHierarchy = useCallback(
    async (input: { threadId: string; folderId?: string | null; projectId?: string | null }) => {
      try {
        await assignThreadHierarchy({ data: input });
        setThreads((prev) =>
          prev.map((t) =>
            t.id === input.threadId
              ? {
                  ...t,
                  folder_id: input.folderId ?? null,
                  project_id: input.projectId ?? null,
                }
              : t,
          ),
        );
        toast.success("Organização da conversa atualizada.");
      } catch (err: any) {
        toast.error(err?.message || "Não foi possível mover a conversa.");
      }
    },
    [],
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
        threadCreatedAt: activeThread?.created_at,
      }),
    [activeThread?.created_at, backgroundTasks, messages],
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
    handleUploadAttachment,
    handleStructuredAction,
    handleCreateFolder,
    handleCreateProject,
    handleAssignThreadHierarchy,
    handleUploadProjectFile,
    handleDeleteProjectFile,
    handleUpdateProjectInstructions,
    handleCancelBackgroundTask,
  };
}
