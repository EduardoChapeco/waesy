import React, { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  dispatchAiChatAction,
  deleteAiConversationThread,
  toggleAiThreadPinned,
  toggleAiThreadArchived,
  uploadCopilotMultimodalAttachment,
} from "@/services/ai-conversations.functions";
import { uploadComposerAttachments } from "@/lib/copilot-attachments";
import type { AIChatAction } from "@/components/chat/structured-message-view";
import { getUserSession } from "@/services/auth.functions";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
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
      const [session, threads] = await Promise.all([
        getUserSession().catch(() => null),
        listAiConversationThreads().catch(() => {
          threadLoadError = true;
          return [];
        }),
      ]);

      let resolvedThreads = threads || [];
      const effectiveUserId = session?.id || session?.user?.id || null;
      const activeStoreId = session?.store_id || session?.memberships?.[0]?.store_id || null;

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
        initialLoadError: threadLoadError && Boolean(effectiveUserId),
      };
    } catch {
      return { session: null, activeStoreId: null, initialThreads: [], initialLoadError: false };
    }
  },
  component: WorkspaceCopilotPage,
});

function WorkspaceCopilotPage() {
  const { session, activeStoreId, initialThreads, initialLoadError } = Route.useLoaderData();
  const effectiveUserId = session?.id || session?.user?.id || null;
  const navigate = useNavigate();
  const [userCoords, setUserCoords] = useState<{ lat?: number; lng?: number }>({});

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
  const activeRunRef = useRef(0);
  const threadLoadRef = useRef(0);
  const activeThreadRef = useRef(activeThreadId);

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
      if (effectiveUserId && isUuid(activeThreadId) && activeThreadId !== DEFAULT_WORKSPACE_THREAD_ID) {
        const uploadedAttachments = await uploadComposerAttachments(
          attachments,
          uploadCopilotMultimodalAttachment as any,
        );
        const result = await sendAiConversationMessage({
          data: {
            threadId: requestThreadId,
            clientMessageId: userMessageItem.id,
            message: text,
            replyToId,
            attachments: uploadedAttachments,
            userLat: userCoords.lat,
            userLng: userCoords.lng,
          },
        });
        if (runId !== activeRunRef.current || activeThreadRef.current !== requestThreadId) return;
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
              threadId: requestThreadId,
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
              thread.id === requestThreadId
                ? { ...thread, workingMemory: result.updatedWorkingMemory }
                : thread,
            ),
          );
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

  const handleCreateThread = async (type: ThreadType, title: string) => {
    try {
      if (effectiveUserId) {
        const created = await createAiConversationThread({
          data: {
            type,
            title,
            storeId: activeStoreId || undefined,
            metadata: { workspaceContext: true, storeId: activeStoreId },
            workingMemory: {},
          },
        });
        const newThreadItem: ChatThreadItem = {
          id: created.id,
          type: (created.thread_type as any) || type,
          title: created.subject || title,
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

  return (
    <div className="size-full flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      <AIChatShell
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
        isSending={isSending}
        isStreaming={isSending}
        currentUserProfileId={effectiveUserId || undefined}
        className="h-full min-h-0 border-none rounded-none"
      />
    </div>
  );
}
