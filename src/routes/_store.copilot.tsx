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
  executeGuestCopilotMessage,
  dispatchAiChatAction,
  deleteAiConversationThread,
  toggleAiThreadPinned,
  toggleAiThreadArchived,
} from "@/services/ai-conversations.functions";
import type { AIChatAction } from "@/components/chat/structured-message-view";
import { getUserSession } from "@/services/auth.functions";
import { toast } from "sonner";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(str: string): boolean {
  return UUID_REGEX.test(str);
}

const DEFAULT_GUEST_THREAD_ID = "00000000-0000-0000-0000-000000000001";

export const Route = createFileRoute("/_store/copilot")({
  head: () => ({
    meta: [
      { title: "Waesy Copilot | Assistente Central Inteligente" },
      {
        name: "description",
        content:
          "Assistente inteligente para consultas locais, planejamento de viagens, recomendação de produtos e criação de propostas.",
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

      // Se o usuário está logado e não possui nenhuma thread, cria a primeira thread oficial no Supabase
      if (effectiveUserId && resolvedThreads.length === 0) {
        try {
          const newThread = await createAiConversationThread({
            data: {
              type: "ai_assistant",
              title: "Copilot Geral",
              metadata: {},
              workingMemory: {},
            },
          });
          if (newThread?.id) {
            resolvedThreads = [newThread as any];
          }
        } catch (e) {
          threadLoadError = true;
          console.warn("[_store.copilot] Falha ao criar thread inicial:", e);
        }
      }

      return { session, initialThreads: resolvedThreads, initialLoadError: threadLoadError && Boolean(effectiveUserId) };
    } catch {
      return { session: null, initialThreads: [], initialLoadError: false };
    }
  },
  component: CopilotPage,
});

function CopilotPage() {
  const { session, initialThreads, initialLoadError } = Route.useLoaderData();
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
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    }
  }, []);

  const [threads, setThreads] = useState<ChatThreadItem[]>(() => {
    if (initialLoadError && effectiveUserId) return [];
    if (!initialThreads || initialThreads.length === 0) {
      return [
        {
          id: DEFAULT_GUEST_THREAD_ID,
          type: "ai_assistant",
          title: "Copilot Geral",
          isPinned: true,
          lastMessageSnippet: "Como posso ajudar com produtos, viagens ou serviços?",
          workingMemory: {},
        },
      ];
    }
    return initialThreads.map((t: any) => ({
      id: t.id,
      type: t.type || "ai_assistant",
      title: t.title || t.subject || "Conversa",
      isPinned: t.is_pinned || false,
      isArchived: t.status === "archived",
      assignedToProfileId: t.assigned_to_profile_id,
      metadata: t.metadata || {},
      workingMemory: t.working_memory || {},
      updatedAt: t.updated_at,
    }));
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(
    threads[0]?.id || DEFAULT_GUEST_THREAD_ID
  );

  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: "welcome-msg",
      threadId: activeThreadId,
      senderName: "Waesy Copilot",
      isStaffOrAI: true,
      text: "Olá! Sou o Copilot inteligente da plataforma Waesy. Posso te ajudar a encontrar estabelecimentos no Places, pacotes no Turismo, ofertas no Marketplace ou estruturar propostas comerciais para o seu negócio. Como posso te apoiar hoje?",
      createdAt: new Date().toISOString(),
      status: "delivered",
    },
  ]);

  const [isSending, setIsSending] = useState(false);
  const activeRunRef = useRef(0);
  const threadLoadRef = useRef(0);

  useEffect(() => {
    const requestId = ++threadLoadRef.current;
    setMessages([]);
    if (activeThreadId && isUuid(activeThreadId) && activeThreadId !== DEFAULT_GUEST_THREAD_ID) {
      getAiConversationThread({ data: { threadId: activeThreadId } })
        .then((res) => {
          if (requestId === threadLoadRef.current && activeThreadId === res?.thread?.id) {
            setMessages((res?.messages || []) as any);
          }
        })
        .catch(() => {
          if (requestId === threadLoadRef.current) toast.error("Não foi possível carregar esta conversa.");
        });
    }
  }, [activeThreadId]);

  const handleSendMessage = async (text: string, attachments: string[] = [], replyToId?: string, stableClientMessageId?: string) => {
    if (!text.trim() || isSending) return;
    if (effectiveUserId && !isUuid(activeThreadId)) {
      toast.error("A conversa ainda não está disponível. Tente recarregar ou criar uma nova thread.");
      return;
    }

    const userMessageItem: ChatMessageItem = {
      id: stableClientMessageId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-0000-0000-${Date.now().toString().slice(-12).padStart(12, "0")}`),
      threadId: activeThreadId,
      senderName: (session as any)?.user?.user_metadata?.full_name || (session as any)?.user_metadata?.full_name || "Você",
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
      if (effectiveUserId && isUuid(activeThreadId) && activeThreadId !== DEFAULT_GUEST_THREAD_ID) {
        const result = await sendAiConversationMessage({
          data: {
            threadId: activeThreadId,
            clientMessageId: userMessageItem.id,
            message: text,
            replyToId,
            attachments,
            userLat: userCoords.lat,
            userLng: userCoords.lng,
          },
        });
        if (runId !== activeRunRef.current) return;
        setMessages((prev) => {
          const executionFailed = result?.aiMessage?.status === "failed" || result?.aiMessage?.fsmPhase === "FAILED_RETRYABLE" || result?.aiMessage?.fsmPhase === "FAILED_FINAL";
          const deliveredUser = prev.map((item) =>
            item.id === userMessageItem.id ? { ...item, status: executionFailed ? "failed" as const : "delivered" as const } : item,
          );
          const aiMessage = result?.aiMessage;
          if (!aiMessage) return deliveredUser;
          return [
            ...deliveredUser,
            {
              id: aiMessage.id,
              threadId: activeThreadId,
              executionId: aiMessage.executionId,
              senderName: "Waesy Copilot",
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
          setThreads((prev) => prev.map((thread) =>
            thread.id === activeThreadId ? { ...thread, workingMemory: result.updatedWorkingMemory } : thread,
          ));
        }
      } else {
        const execution = await executeGuestCopilotMessage({
          data: {
            message: text,
            userLat: userCoords.lat,
            userLng: userCoords.lng,
          },
        });
        const aiMessageItem: ChatMessageItem = {
          id: `ai-${Date.now()}`,
          threadId: activeThreadId,
          executionId: execution.executionId,
          senderName: "Waesy Copilot",
          isStaffOrAI: true,
          text: execution.responseMessage,
          createdAt: new Date().toISOString(),
          status: execution.fsmPhase === "FAILED_RETRYABLE" || execution.fsmPhase === "FAILED_FINAL" ? "failed" : "delivered",
          fsmPhase: execution.fsmPhase,
          fsmState: execution.fsmState,
          activitySteps: execution.activitySteps,
          artifact: execution.artifact,
          structuredPayload: execution.structuredPayload,
        };
        if (runId === activeRunRef.current) setMessages((prev) => [...prev, aiMessageItem]);
      }
    } catch (err: any) {
      if (runId === activeRunRef.current) {
        setMessages((prev) => prev.map((item) => item.id === userMessageItem.id ? { ...item, status: "failed" as const } : item));
        toast.error(err?.message || "Erro ao processar mensagem do Copilot.");
      }
    } finally {
      if (runId === activeRunRef.current) setIsSending(false);
    }
  };

  const handleRetryMessage = (messageId: string) => {
    const failed = messages.find((message) => message.id === messageId);
    if (failed?.text) {
      // Preserve the original UUID so the BFF replays the persisted result.
      const stableClientMessageId = (failed as ChatMessageItem).clientMessageId || failed.id;
      void handleSendMessage(failed.text, failed.attachments || undefined, failed.replyTo?.id, stableClientMessageId);
    }
  };

  const handleCancelActiveRun = () => {
    activeRunRef.current += 1;
    setIsSending(false);
    setMessages((prev) => prev.map((item) => item.status === "sending" ? { ...item, status: "failed" as const, text: item.text } : item));
    toast.info("Execução interrompida. Você pode tentar novamente.");
  };

  const handleCreateThread = async (type: ThreadType, title: string) => {
    try {
      if (effectiveUserId) {
        const created = await createAiConversationThread({
          data: {
            type,
            title,
            metadata: {},
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
      } else {
        const localId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-0000-0000-${Date.now().toString().slice(-12).padStart(12, "0")}`;
        const newThreadItem: ChatThreadItem = {
          id: localId,
          type,
          title,
          isPinned: false,
        };
        setThreads((prev) => [newThreadItem, ...prev]);
        setActiveThreadId(localId);
        setMessages([]);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar nova thread.");
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      if (effectiveUserId && isUuid(threadId) && threadId !== DEFAULT_GUEST_THREAD_ID) {
        await deleteAiConversationThread({ data: { threadId } });
      }
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (activeThreadId === threadId) {
        const remaining = threads.filter((t) => t.id !== threadId);
        setActiveThreadId(remaining[0]?.id || DEFAULT_GUEST_THREAD_ID);
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
    const dispatchable = ["add_to_cart", "request_travel_quote", "submit_legal_demand", "publish_ad"] as const;

    if ((dispatchable as readonly string[]).includes(actionType)) {
      try {
        const result = await dispatchAiChatAction({
          data: {
            action_type: actionType as (typeof dispatchable)[number],
            payload,
          },
        });
        if ((result as { status?: string } | null)?.status === "needs_approval") {
          toast.info("Solicitação registrada e aguardando aprovação humana.");
          return result;
        }
        if (actionType === "add_to_cart") {
          toast.success("Item adicionado ao carrinho.");
        } else if (actionType === "request_travel_quote") {
          toast.success("Solicitação de cotação registrada.");
        } else if (actionType === "submit_legal_demand") {
          toast.success("Demanda encaminhada para o painel jurídico.");
        } else if (actionType === "publish_ad") {
          toast.success("Anúncio publicado.");
        }
        return result;
      } catch (error: any) {
        toast.error(error?.message || "Não foi possível executar esta ação.");
        return;
      }
    }

    if (actionType === "open_place") {
      const target = payload.slug || payload.placeId;
      if (typeof target === "string" && target.length > 0) {
        navigate({ to: `/places/${target}` as any });
        return;
      }
    }

    if (actionType === "navigate" || actionType === "open_checkout") {
      const href = payload.href || payload.url;
      if (typeof href === "string" && href.startsWith("/") && !href.startsWith("//")) {
        navigate({ to: href as any });
        return;
      }
    }

    if (actionType === "call_ride") {
      navigate({ to: "/mobilidade" as any });
      return;
    }

    toast.info("Esta ação ainda não possui executor seguro disponível.");
  };

  const handleTogglePinThread = async (threadId: string) => {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread) return;
    try {
      await toggleAiThreadPinned({ data: { threadId, isPinned: !thread.isPinned } });
      setThreads((prev) => prev.map((item) => item.id === threadId ? { ...item, isPinned: !item.isPinned } : item));
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível fixar a conversa.");
    }
  };

  const handleToggleArchiveThread = async (threadId: string) => {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread) return;
    try {
      await toggleAiThreadArchived({ data: { threadId, isArchived: !thread.isArchived } });
      setThreads((prev) => prev.map((item) => item.id === threadId ? { ...item, isArchived: !item.isArchived } : item));
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível arquivar a conversa.");
    }
  };

  return (
    <div className="h-full flex-1 w-full flex flex-col bg-background">
      <AIChatShell
        threads={threads}
        activeThreadId={activeThreadId}
        messages={messages}
        onSelectThread={(id) => setActiveThreadId(id)}
        onSendMessage={handleSendMessage}
        onRetryMessage={handleRetryMessage}
        onCancelActiveRun={handleCancelActiveRun}
        onCreateThread={handleCreateThread}
        onDeleteThread={handleDeleteThread}
        onTogglePinThread={handleTogglePinThread}
        onToggleArchiveThread={handleToggleArchiveThread}
        onStructuredAction={handleStructuredAction}
        isSending={isSending}
        currentUserProfileId={effectiveUserId || undefined}
        className="h-full border-none rounded-none"
      />
    </div>
  );
}
