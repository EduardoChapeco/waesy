import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import {
  AIChatShell,
  type ChatThreadItem,
  type ChatMessageItem,
  type ThreadType,
} from "@/components/chat/ai-chat-shell";
import {
  listAiConversationThreads,
  getAiConversationThread,
  createAiConversationThread,
  sendAiConversationMessage,
  executeGuestCopilotMessage,
  dispatchAiChatAction,
  deleteAiConversationThread,
  toggleAiThreadPinned,
  toggleAiThreadArchived,
  uploadCopilotMultimodalAttachment,
} from "@/services/ai-conversations.functions";
import { uploadComposerAttachments } from "@/lib/copilot-attachments";
import type { AIChatAction } from "@/components/chat/structured-message-view";
import {
  listUserDurableAiTasks,
  cancelDurableAiTask,
} from "@/services/ai-tasks-durability.functions";
import {
  listCopilotHierarchy,
  createCopilotFolder,
  createCopilotProject,
  updateCopilotProject,
  assignThreadHierarchy,
  listCopilotProjectFiles,
  uploadCopilotProjectContextFile,
  deleteCopilotProjectContextFile,
  type CopilotFolderDTO,
  type CopilotProjectDTO,
  type CopilotProjectFileDTO,
} from "@/services/copilot-projects.functions";
import { getUserSession } from "@/services/auth.functions";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { ManusComputerDrawer, type ManusComputerStep } from "@/components/chat/manus-computer-drawer";
import {
  ManusTaskTelemetrySheet,
  computeCopilotSessionTelemetry,
} from "@/components/chat/manus-task-telemetry-sheet";
import {
  CopilotBackgroundTasksDrawer,
  type BackgroundTaskItem,
} from "@/components/chat/copilot-background-tasks-drawer";
import { Button } from "@/components/ui/button";
import { Monitor, Info, CheckCircle2, Clock, Maximize2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(str: string): boolean {
  return UUID_REGEX.test(str);
}

const DEFAULT_WORKSPACE_THREAD_ID = "00000000-0000-0000-0000-000000000002";

export const Route = createFileRoute("/workspace/copilot")({
  head: () => ({
    meta: [
      { title: "Assessor de Negócios | Painel Waesy" },
      {
        name: "description",
        content: "Assessor executivo para apoio à gestão comercial, pedidos, estoque, campanhas e finanças da loja.",
      },
    ],
  }),
  loader: async () => {
    try {
      let threadLoadError = false;
      const [session, threads, initialTasks] = await Promise.all([
        getUserSession().catch(() => null),
        listAiConversationThreads().catch(() => {
          threadLoadError = true;
          return [];
        }),
        listUserDurableAiTasks({ data: { status: "all", limit: 30 } }).catch(() => []),
      ]);

      let resolvedThreads = threads || [];
      const effectiveUserId = session?.id || session?.user?.id || null;
      const activeStoreId = session?.store_id || session?.memberships?.[0]?.store_id || null;
      const initialHierarchy = effectiveUserId
        ? await listCopilotHierarchy({
            data: activeStoreId ? { storeId: activeStoreId } : undefined,
          }).catch(() => ({ folders: [], projects: [] }))
        : { folders: [], projects: [] };

      // Se o usuário corporativo não possui threads de workspace, cria a primeira thread de projeto
      if (effectiveUserId && resolvedThreads.length === 0) {
        try {
          const newThread = await createAiConversationThread({
            data: {
              type: "project",
              title: "Gestão Operacional",
              storeId: activeStoreId || undefined,
              metadata: { workspaceContext: true, storeId: activeStoreId },
              workingMemory: {},
            },
          });
          if (newThread?.id) {
            resolvedThreads = [newThread as any];
          }
        } catch (e) {
          threadLoadError = true;
          console.warn("[workspace.copilot] Falha ao criar thread inicial:", e);
        }
      }

      return {
        session,
        activeStoreId,
        initialThreads: resolvedThreads,
        initialFolders: initialHierarchy.folders || [],
        initialProjects: initialHierarchy.projects || [],
        initialTasks: (initialTasks || []) as BackgroundTaskItem[],
        initialLoadError: threadLoadError && Boolean(effectiveUserId),
      };
    } catch {
      return {
        session: null,
        activeStoreId: null,
        initialThreads: [],
        initialFolders: [],
        initialProjects: [],
        initialTasks: [],
        initialLoadError: false,
      };
    }
  },
  component: WorkspaceCopilotPage,
});

function deriveManusComputerSteps(messages: ChatMessageItem[]): ManusComputerStep[] | undefined {
  const derived: ManusComputerStep[] = [];
  let idx = 1;

  for (const msg of messages) {
    if (msg.activitySteps && msg.activitySteps.length > 0) {
      for (const step of msg.activitySteps) {
        const isBrowser =
          step.type === "search" ||
          (step.type === "tool" &&
            (step.label.toLowerCase().includes("web") ||
              step.label.toLowerCase().includes("pesquisa") ||
              step.label.toLowerCase().includes("leitura")));
        const isEditor =
          step.type === "planner" ||
          Boolean(msg.artifact && idx === msg.activitySteps.length);

        derived.push({
          id: step.id || `step-${idx}`,
          index: idx++,
          title: step.label,
          tool: isBrowser ? "browser" : isEditor ? "editor" : "bash",
          target: step.role || "waesy-copilot-engine",
          timestamp: step.startedAt
            ? new Date(step.startedAt).toLocaleTimeString("pt-BR")
            : "Agora",
          terminalOutput:
            step.detail ||
            `Passo de processamento [${step.type}] executado com sucesso (${step.tokensUsed || 0} tokens).`,
          browserUrl: isBrowser
            ? step.detail?.match(/https?:\/\/[^\s]+/)?.[0] || "https://waesy.app"
            : undefined,
          browserSummary: isBrowser ? step.detail : undefined,
          fileDiff: msg.artifact
            ? {
                filename: `${msg.artifact.type}_${msg.artifact.title.replace(/\s+/g, "_").toLowerCase()}.json`,
                original: "// Estado anterior do artefato\n{}",
                modified: JSON.stringify(msg.artifact.data || {}, null, 2),
              }
            : undefined,
        });
      }
    }
  }

  return derived.length > 0 ? derived : undefined;
}

function WorkspaceCopilotPage() {
  const {
    session,
    activeStoreId,
    initialThreads,
    initialFolders,
    initialProjects,
    initialTasks,
    initialLoadError,
  } = Route.useLoaderData();
  const effectiveUserId = session?.id || session?.user?.id || null;
  const navigate = useNavigate();
  const [userCoords, setUserCoords] = useState<{ lat?: number; lng?: number }>({});
  const [folders, setFolders] = useState<CopilotFolderDTO[]>(initialFolders || []);
  const [projects, setProjects] = useState<CopilotProjectDTO[]>(initialProjects || []);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<CopilotProjectFileDTO[]>([]);
  const [isLoadingProjectFiles, setIsLoadingProjectFiles] = useState(false);
  const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTaskItem[]>(initialTasks || []);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 },
      );
    }
  }, []);

  const [threads, setThreads] = useState<ChatThreadItem[]>(() => {
    if (initialLoadError && effectiveUserId) return [];
    if (!initialThreads || initialThreads.length === 0) {
      return [
        {
          id: DEFAULT_WORKSPACE_THREAD_ID,
          type: "project",
          title: "Assessor de Negócios",
          isPinned: true,
          lastMessageSnippet: "Como posso apoiar a gestão do seu negócio hoje?",
          workingMemory: {},
        },
      ];
    }
    return initialThreads.map((t: any) => ({
      id: t.id,
      type: t.type || "project",
      title: t.title || t.subject || "Gestão Operacional",
      isPinned: t.is_pinned || false,
      isArchived: t.status === "archived",
      assignedToProfileId: t.assigned_to_profile_id,
      folderId: t.folder_id ?? t.metadata?.folder_id ?? null,
      projectId: t.project_id ?? t.metadata?.project_id ?? null,
      metadata: t.metadata || {},
      workingMemory: t.working_memory || {},
      updatedAt: t.updated_at,
    }));
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(
    threads[0]?.id || DEFAULT_WORKSPACE_THREAD_ID,
  );

  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: "workspace-welcome-msg",
      threadId: activeThreadId,
      senderName: "Assessor de Negócios",
      isStaffOrAI: true,
      text: "Olá! Sou o seu assessor executivo de negócios no Waesy. Posso te ajudar a acompanhar o faturamento do dia, conferir produtos com saldo baixo no estoque, gerar propostas comerciais, conectar novas oportunidades e clientes locais ou organizar o fechamento do caixa. O que você gostaria de executar agora?",
      createdAt: new Date().toISOString(),
      status: "delivered",
    },
  ]);

  const [isSending, setIsSending] = useState(false);
  const [computerDrawerOpen, setComputerDrawerOpen] = useState(false);
  const [telemetrySheetOpen, setTelemetrySheetOpen] = useState(false);
  const [backgroundTasksOpen, setBackgroundTasksOpen] = useState(false);
  const activeRunRef = useRef(0);
  const threadLoadRef = useRef(0);
  const activeThreadRef = useRef(activeThreadId);

  const activeThreadObj = React.useMemo(
    () => threads.find((t) => t.id === activeThreadId) || null,
    [threads, activeThreadId],
  );
  const resolvedActiveProjectId =
    activeThreadObj?.projectId ??
    (activeThreadObj?.metadata?.project_id as string | undefined) ??
    selectedProjectId ??
    null;

  useEffect(() => {
    if (!effectiveUserId || !resolvedActiveProjectId) {
      setProjectFiles([]);
      return;
    }
    let cancelled = false;
    setIsLoadingProjectFiles(true);
    listCopilotProjectFiles({ data: { projectId: resolvedActiveProjectId } })
      .then((files) => {
        if (!cancelled) setProjectFiles(files || []);
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
  }, [effectiveUserId, resolvedActiveProjectId]);

  const refreshBackgroundTasks = async () => {
    if (!effectiveUserId) return;
    try {
      const next = await listUserDurableAiTasks({ data: { status: "all", limit: 30 } });
      setBackgroundTasks((next || []) as BackgroundTaskItem[]);
    } catch {
      toast.error("Não foi possível atualizar as tarefas em segundo plano.");
    }
  };

  const handleCancelBackgroundTask = async (taskId: string) => {
    try {
      await cancelDurableAiTask({ data: { taskId, reason: "Cancelado no Copilot" } });
      setBackgroundTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "cancelled" } : t)),
      );
      toast.success("Tarefa cancelada.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao cancelar tarefa.");
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      const created = await createCopilotFolder({
        data: { name, storeId: activeStoreId || undefined },
      });
      setFolders((prev) => [...prev, created]);
      setSelectedFolderId(created.id);
      toast.success("Pasta criada.");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao criar pasta.");
    }
  };

  const handleCreateProject = async (payload: {
    title: string;
    folderId?: string | null;
  }) => {
    try {
      const created = await createCopilotProject({
        data: {
          title: payload.title,
          folderId: payload.folderId ?? selectedFolderId,
          storeId: activeStoreId || undefined,
        },
      });
      setProjects((prev) => [created, ...prev]);
      setSelectedProjectId(created.id);
      toast.success("Projeto criado.");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao criar projeto.");
    }
  };

  const handleAssignThreadHierarchy = async (
    threadId: string,
    hierarchy: { folderId?: string | null; projectId?: string | null },
  ) => {
    try {
      await assignThreadHierarchy({
        data: {
          threadId,
          folderId: hierarchy.folderId ?? null,
          projectId: hierarchy.projectId ?? null,
        },
      });
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? { ...t, folderId: hierarchy.folderId ?? null, projectId: hierarchy.projectId ?? null }
            : t,
        ),
      );
      toast.success("Conversa vinculada ao projeto.");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao mover conversa.");
    }
  };

  const handleUploadProjectFile = async (payload: {
    projectId: string;
    filename: string;
    fileType: string;
    fileSize: number;
    contentText: string;
  }) => {
    const uploaded = await uploadCopilotProjectContextFile({ data: payload });
    setProjectFiles((prev) => [uploaded, ...prev]);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === payload.projectId ? { ...p, file_count: (p.file_count || 0) + 1 } : p,
      ),
    );
    toast.success("Arquivo indexado na base do projeto.");
  };

  const handleDeleteProjectFile = async (fileId: string) => {
    try {
      await deleteCopilotProjectContextFile({ data: { fileId } });
      setProjectFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (resolvedActiveProjectId) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === resolvedActiveProjectId
              ? { ...p, file_count: Math.max(0, (p.file_count || 1) - 1) }
              : p,
          ),
        );
      }
      toast.success("Arquivo removido da base de conhecimento.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover arquivo.");
    }
  };

  const handleUpdateProjectInstructions = async (projectId: string, instructions: string) => {
    const updated = await updateCopilotProject({
      data: { projectId, systemInstructions: instructions },
    });
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, ...updated } : p)),
    );
  };

  useEffect(() => {
    activeThreadRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    const requestId = ++threadLoadRef.current;
    setMessages([]);
    if (activeThreadId && isUuid(activeThreadId) && activeThreadId !== DEFAULT_WORKSPACE_THREAD_ID) {
      getAiConversationThread({ data: { threadId: activeThreadId } })
        .then((res) => {
          if (requestId === threadLoadRef.current && activeThreadId === res?.thread?.id) {
            setMessages((res?.messages || []) as any);
          }
        })
        .catch(() => {
          if (requestId === threadLoadRef.current)
            toast.error("Não foi possível carregar esta conversa.");
        });
    }
  }, [activeThreadId]);

  const computerSteps = React.useMemo(() => deriveManusComputerSteps(messages), [messages]);

  const handleSendMessage = async (
    text: string,
    attachments: string[] = [],
    replyToId?: string,
    stableClientMessageId?: string,
  ) => {
    if (!text.trim() || isSending) return;
    if (effectiveUserId && !isUuid(activeThreadId)) {
      toast.error(
        "A conversa ainda não está pronta. Tente recarregar ou criar uma nova thread.",
      );
      return;
    }

    const requestThreadId = activeThreadId;
    const userMessageItem: ChatMessageItem = {
      id:
        stableClientMessageId ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `00000000-0000-0000-0000-${Date.now().toString().slice(-12).padStart(12, "0")}`),
      threadId: requestThreadId,
      senderName:
        (session as any)?.user?.user_metadata?.full_name ||
        (session as any)?.user_metadata?.full_name ||
        "Gestor",
      isStaffOrAI: false,
      text,
      createdAt: new Date().toISOString(),
      status: "sending",
      attachments,
    };

    const runId = ++activeRunRef.current;
    setMessages((prev) => [...prev, userMessageItem]);
    setIsSending(true);

    try {
      let targetThreadId = requestThreadId;
      if (effectiveUserId && (!isUuid(targetThreadId) || targetThreadId === DEFAULT_WORKSPACE_THREAD_ID)) {
        try {
          const created = await createAiConversationThread({
            data: {
              type: "project",
              title: text.slice(0, 48) || "Gestão Operacional",
              storeId: activeStoreId || undefined,
              folderId: selectedFolderId ?? null,
              projectId: selectedProjectId ?? null,
              metadata: {
                workspaceContext: true,
                storeId: activeStoreId,
              },
              workingMemory: {},
            },
          });
          if (created?.id) {
            targetThreadId = created.id;
            activeThreadRef.current = created.id;
            setActiveThreadId(created.id);
            setThreads((prev) => [
              {
                id: created.id,
                type: (created.thread_type as any) || "project",
                title: created.subject || "Gestão Operacional",
                folderId: selectedFolderId ?? null,
                projectId: selectedProjectId ?? null,
                isPinned: true,
              },
              ...prev.filter((t) => t.id !== DEFAULT_WORKSPACE_THREAD_ID),
            ]);
          } else {
            throw new Error("Não foi possível inicializar uma conversa autenticada.");
          }
        } catch (threadErr: any) {
          throw new Error(
            threadErr?.message || "Falha ao criar thread persistida do Copilot no workspace.",
          );
        }
      }

      if (effectiveUserId) {
        if (!isUuid(targetThreadId) || targetThreadId === DEFAULT_WORKSPACE_THREAD_ID) {
          throw new Error("Conversa autenticada inválida. Crie ou selecione uma thread para continuar.");
        }
        const uploadedAttachments = await uploadComposerAttachments(
          attachments,
          uploadCopilotMultimodalAttachment as any,
        );
        const result = await sendAiConversationMessage({
          data: {
            threadId: targetThreadId,
            clientMessageId: userMessageItem.id,
            message: text,
            replyToId,
            attachments: uploadedAttachments,
            userLat: userCoords.lat,
            userLng: userCoords.lng,
          },
        });
        if (runId !== activeRunRef.current || activeThreadRef.current !== targetThreadId) return;
        setMessages((prev) => {
          const executionFailed =
            result?.aiMessage?.status === "failed" ||
            result?.aiMessage?.fsmPhase === "FAILED_RETRYABLE" ||
            result?.aiMessage?.fsmPhase === "FAILED_FINAL";
          const deliveredUser = prev.map((item) =>
            item.id === userMessageItem.id
              ? {
                  ...item,
                  status: executionFailed ? ("failed" as const) : ("delivered" as const),
                  fsmPhase: result?.aiMessage?.fsmPhase,
                }
              : item,
          );
          const aiMessage = result?.aiMessage;
          if (!aiMessage) return deliveredUser;
          return [
            ...deliveredUser,
            {
              id: aiMessage.id,
              threadId: targetThreadId,
              executionId: aiMessage.executionId,
              senderName: "Copilot Operacional",
              isStaffOrAI: true,
              text: aiMessage.text,
              createdAt: aiMessage.createdAt,
              status: aiMessage.status || "delivered",
              fsmPhase: aiMessage.fsmPhase,
              fsmState: aiMessage.fsmState,
              activitySteps: aiMessage.activitySteps,
              toolCalls: aiMessage.toolCalls,
              artifact: aiMessage.artifact,
              structuredPayload: aiMessage.structuredPayload,
            } as ChatMessageItem,
          ];
        });
        if (result?.updatedWorkingMemory) {
          setThreads((prev) =>
            prev.map((thread) =>
              thread.id === targetThreadId
                ? { ...thread, workingMemory: result.updatedWorkingMemory }
                : thread,
            ),
          );
        }
      } else {
        const execution = await executeGuestCopilotMessage({
          data: {
            message: text,
            userLat: userCoords.lat,
            userLng: userCoords.lng,
          },
        });
        const executionFailed =
          execution.fsmPhase === "FAILED_RETRYABLE" || execution.fsmPhase === "FAILED_FINAL";
        const aiMessageItem: ChatMessageItem = {
          id: `ai-${Date.now()}`,
          threadId: targetThreadId,
          executionId: execution.executionId,
          senderName: "Copilot Operacional",
          isStaffOrAI: true,
          text: execution.responseMessage,
          createdAt: new Date().toISOString(),
          status: executionFailed ? "failed" : "delivered",
          fsmPhase: execution.fsmPhase,
          fsmState: execution.fsmState,
          activitySteps: execution.activitySteps,
          artifact: execution.artifact,
          structuredPayload: execution.structuredPayload,
        };
        if (runId === activeRunRef.current && activeThreadRef.current === targetThreadId) {
          setMessages((prev) => [
            ...prev.map((item) =>
              item.id === userMessageItem.id
                ? { ...item, status: executionFailed ? ("failed" as const) : ("delivered" as const) }
                : item,
            ),
            aiMessageItem,
          ]);
        }
      }
    } catch (err: any) {
      if (runId === activeRunRef.current) {
        setMessages((prev) =>
          prev.map((item) =>
            item.id === userMessageItem.id ? { ...item, status: "failed" as const } : item,
          ),
        );
        toast.error(err?.message || "Erro ao processar instrução do Copilot.");
      }
    } finally {
      if (runId === activeRunRef.current) setIsSending(false);
    }
  };

  const handleRetryMessage = (messageId: string) => {
    const failed = messages.find((message) => message.id === messageId);
    if (failed?.fsmPhase && failed.fsmPhase !== "FAILED_RETRYABLE") {
      toast.error("Esta instrução não pode ser repetida automaticamente.");
      return;
    }
    if (failed?.text) {
      const stableClientMessageId = (failed as ChatMessageItem).clientMessageId || failed.id;
      void handleSendMessage(
        failed.text,
        failed.attachments || undefined,
        failed.replyTo?.id,
        stableClientMessageId,
      );
    }
  };

  const handleCancelActiveRun = () => {
    activeRunRef.current += 1;
    setIsSending(false);
    setMessages((prev) =>
      prev.map((item) =>
        item.status === "sending" ? { ...item, status: "failed" as const, text: item.text } : item,
      ),
    );
    toast.info("Execução cancelada.");
  };

  const handleSelectThread = (threadId: string) => {
    if (threadId === activeThreadRef.current) return;
    activeRunRef.current += 1;
    activeThreadRef.current = threadId;
    setIsSending(false);
    setActiveThreadId(threadId);
  };

  const handleCreateThread = async (
    type: ThreadType,
    title: string,
    options?: { folderId?: string | null; projectId?: string | null },
  ) => {
    try {
      if (effectiveUserId) {
        const targetFolderId = options?.folderId ?? selectedFolderId ?? null;
        const targetProjectId = options?.projectId ?? selectedProjectId ?? null;
        const created = await createAiConversationThread({
          data: {
            type,
            title,
            storeId: activeStoreId || undefined,
            folderId: targetFolderId,
            projectId: targetProjectId,
            metadata: {
              workspaceContext: true,
              storeId: activeStoreId,
              ...(targetFolderId ? { folder_id: targetFolderId } : {}),
              ...(targetProjectId ? { project_id: targetProjectId } : {}),
            },
            workingMemory: {},
          },
        });
        const newThreadItem: ChatThreadItem = {
          id: created.id,
          type: (created.thread_type as any) || type,
          title: created.subject || title,
          folderId: targetFolderId,
          projectId: targetProjectId,
          isPinned: false,
        };
        setThreads((prev) => [newThreadItem, ...prev]);
        setActiveThreadId(created.id);
        setMessages([]);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar nova thread.");
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      if (effectiveUserId && isUuid(threadId) && threadId !== DEFAULT_WORKSPACE_THREAD_ID) {
        await deleteAiConversationThread({ data: { threadId } });
      }
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (activeThreadId === threadId) {
        const remaining = threads.filter((t) => t.id !== threadId);
        setActiveThreadId(remaining[0]?.id || DEFAULT_WORKSPACE_THREAD_ID);
        setMessages([]);
      }
      toast.success("Conversa excluída.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir conversa.");
    }
  };

  const handleStructuredAction = async (action: AIChatAction) => {
    const payload = action?.payload || {};
    const actionType = action?.action_type;
    const dispatchable = [
      "add_to_cart",
      "request_travel_quote",
      "submit_legal_demand",
      "publish_ad",
    ] as const;

    if ((dispatchable as readonly string[]).includes(actionType)) {
      try {
        const result = await dispatchAiChatAction({
          data: {
            action_type: actionType as (typeof dispatchable)[number],
            payload,
          },
        });
        if ((result as { status?: string } | null)?.status === "needs_approval") {
          toast.info("Ação registrada e aguardando aprovação humana.");
          return result;
        }
        toast.success("Ação executada com sucesso.");
        return result;
      } catch (error: any) {
        toast.error(error?.message || "Não foi possível executar esta ação.");
        return;
      }
    }

    if (actionType === "navigate") {
      const href = payload.href || payload.url;
      if (typeof href === "string" && href.startsWith("/") && !href.startsWith("//")) {
        navigate({ to: href as any });
        return;
      }
    }

    toast.info("Esta ação não possui executor disponível no Workspace.");
  };

  const handleTogglePinThread = async (threadId: string) => {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread) return;
    try {
      await toggleAiThreadPinned({ data: { threadId, isPinned: !thread.isPinned } });
      setThreads((prev) =>
        prev.map((item) => (item.id === threadId ? { ...item, isPinned: !item.isPinned } : item)),
      );
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível fixar a conversa.");
    }
  };

  const handleToggleArchiveThread = async (threadId: string) => {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread) return;
    try {
      await toggleAiThreadArchived({ data: { threadId, isArchived: !thread.isArchived } });
      setThreads((prev) =>
        prev.map((item) =>
          item.id === threadId ? { ...item, isArchived: !item.isArchived } : item,
        ),
      );
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível arquivar a conversa.");
    }
  };

  const runningBackgroundCount = React.useMemo(
    () =>
      backgroundTasks.filter((t) =>
        ["queued", "planning", "running", "waiting_user", "validating"].includes(t.status),
      ).length,
    [backgroundTasks],
  );

  const sessionTelemetry = React.useMemo(
    () =>
      computeCopilotSessionTelemetry({
        messages,
        backgroundTasks,
      }),
    [messages, backgroundTasks],
  );

  return (
    <div className="size-full flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/70 bg-card shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button asChild variant="ghost" size="sm" className="h-11 min-h-11 px-3 gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary">
            <Link to="/workspace">
              <ArrowLeft className="size-4" />
              <span>Workspace</span>
            </Link>
          </Button>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5" />
            Waesy Copilot
          </span>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            Orquestrador Multi-Agente · Computador & Navegador Cloud
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setComputerDrawerOpen(true)}
            className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 text-muted-foreground hover:text-foreground focus-visible:ring-2"
            title="Inspecionar terminal, navegador e editor do Computador Waesy"
          >
            <Monitor className="size-4 text-primary" />
            <span className="hidden sm:inline">Computador</span>
            {computerSteps && computerSteps.length > 0 && (
              <span className="rounded bg-muted px-2 py-0 font-mono text-xs">
                {computerSteps.length}
              </span>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setTelemetrySheetOpen(true)}
            className="size-11 min-h-11 focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Informações da tarefa"
          >
            <Info className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (typeof window !== "undefined") {
                const isEmbedded = new URLSearchParams(window.location.search).get("view") === "embedded";
                const url = new URL(window.location.href);
                if (isEmbedded) {
                  url.searchParams.delete("view");
                  window.location.href = url.toString();
                } else {
                  url.searchParams.set("view", "embedded");
                  window.location.href = url.toString();
                }
              }
            }}
            className="size-11 min-h-11 focus-visible:ring-2 focus-visible:ring-primary"
            title="Alternar modo Tela Cheia / Painel com Sidebar"
            aria-label="Alternar modo tela cheia"
          >
            <Maximize2 className="size-4" />
          </Button>
        </div>
      </div>
      <AIChatShell
        mode="workspace"
        threads={threads}
        activeThreadId={activeThreadId}
        messages={messages}
        mobileTitle="Copilot Operacional"
        mobileSubtitle="Workspace Waesy"
        mobileFallbackHref="/workspace"
        onSelectThread={handleSelectThread}
        onSendMessage={handleSendMessage}
        onRetryMessage={handleRetryMessage}
        onCancelActiveRun={handleCancelActiveRun}
        onCreateThread={handleCreateThread}
        onDeleteThread={handleDeleteThread}
        onTogglePinThread={handleTogglePinThread}
        onToggleArchiveThread={handleToggleArchiveThread}
        onStructuredAction={handleStructuredAction}
        folders={folders}
        projects={projects}
        selectedFolderId={selectedFolderId}
        selectedProjectId={selectedProjectId}
        onSelectFolder={setSelectedFolderId}
        onSelectProject={setSelectedProjectId}
        onCreateFolder={handleCreateFolder}
        onCreateProject={handleCreateProject}
        onAssignThreadHierarchy={handleAssignThreadHierarchy}
        projectFiles={projectFiles}
        isLoadingProjectFiles={isLoadingProjectFiles}
        onUploadProjectFile={handleUploadProjectFile}
        onDeleteProjectFile={handleDeleteProjectFile}
        onUpdateProjectInstructions={handleUpdateProjectInstructions}
        backgroundTasks={backgroundTasks}
        onCancelBackgroundTask={handleCancelBackgroundTask}
        onRefreshBackgroundTasks={refreshBackgroundTasks}
        isSending={isSending}
        isStreaming={isSending}
        currentUserProfileId={effectiveUserId || undefined}
        className="h-full min-h-0 border-none rounded-none"
      />
      <ManusComputerDrawer
        open={computerDrawerOpen}
        onOpenChange={setComputerDrawerOpen}
        taskTitle={threads.find((t) => t.id === activeThreadId)?.title || "Sessão Ativa"}
        steps={computerSteps}
      />
      <ManusTaskTelemetrySheet
        open={telemetrySheetOpen}
        onOpenChange={setTelemetrySheetOpen}
        {...sessionTelemetry}
      />
      <CopilotBackgroundTasksDrawer
        open={backgroundTasksOpen}
        onOpenChange={setBackgroundTasksOpen}
        tasks={backgroundTasks}
        onCancelTask={handleCancelBackgroundTask}
        onRefresh={refreshBackgroundTasks}
      />
    </div>
  );
}
