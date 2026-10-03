import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  executeAiCopilotPipeline,
} from "@/services/ai-conversations.functions";
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
      const [session, threads] = await Promise.all([
        getUserSession().catch(() => null),
        listAiConversationThreads().catch(() => []),
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
            resolvedThreads = [newThread];
          }
        } catch (e) {
          console.warn("[_store.copilot] Falha ao criar thread inicial:", e);
        }
      }

      return { session, initialThreads: resolvedThreads };
    } catch {
      return { session: null, initialThreads: [] };
    }
  },
  component: CopilotPage,
});

function CopilotPage() {
  const { session, initialThreads } = Route.useLoaderData();
  const effectiveUserId = session?.id || session?.user?.id || null;
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

  useEffect(() => {
    if (activeThreadId && isUuid(activeThreadId) && activeThreadId !== DEFAULT_GUEST_THREAD_ID) {
      getAiConversationThread({ data: { threadId: activeThreadId } })
        .then((res) => {
          if (res?.messages && res.messages.length > 0) {
            setMessages(res.messages as any);
          }
        })
        .catch(() => {});
    }
  }, [activeThreadId]);

  const handleSendMessage = async (text: string, attachments: string[] = [], replyToId?: string) => {
    if (!text.trim() || isSending) return;

    const userMessageItem: ChatMessageItem = {
      id: `usr-${Date.now()}`,
      threadId: activeThreadId,
      senderName: (session as any)?.user?.user_metadata?.full_name || (session as any)?.user_metadata?.full_name || "Você",
      isStaffOrAI: false,
      text,
      createdAt: new Date().toISOString(),
      status: "sending",
      attachments,
    };

    setMessages((prev) => [...prev, userMessageItem]);
    setIsSending(true);

    try {
      if (effectiveUserId && isUuid(activeThreadId) && activeThreadId !== DEFAULT_GUEST_THREAD_ID) {
        await sendAiConversationMessage({
          data: {
            threadId: activeThreadId,
            message: text,
            replyToId,
            attachments,
            userLat: userCoords.lat,
            userLng: userCoords.lng,
          },
        });
        const updated = await getAiConversationThread({ data: { threadId: activeThreadId } });
        if (updated?.messages) {
          setMessages(updated.messages as any);
        }
      } else {
        const execution = await executeAiCopilotPipeline(
          text,
          {},
          {
            userId: effectiveUserId || undefined,
            userLat: userCoords.lat,
            userLng: userCoords.lng,
          }
        );
        const aiMessageItem: ChatMessageItem = {
          id: `ai-${Date.now()}`,
          threadId: activeThreadId,
          senderName: "Waesy Copilot",
          isStaffOrAI: true,
          text: execution.responseMessage,
          createdAt: new Date().toISOString(),
          status: "delivered",
          activitySteps: execution.activitySteps,
          artifact: execution.artifact,
          structuredPayload: execution.structuredPayload,
        };
        setMessages((prev) => [...prev, aiMessageItem]);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar mensagem do Copilot.");
    } finally {
      setIsSending(false);
    }
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

  return (
    <div className="h-full flex-1 w-full flex flex-col bg-background">
      <AIChatShell
        threads={threads}
        activeThreadId={activeThreadId}
        messages={messages}
        onSelectThread={(id) => setActiveThreadId(id)}
        onSendMessage={handleSendMessage}
        onCreateThread={handleCreateThread}
        isSending={isSending}
        currentUserProfileId={effectiveUserId || undefined}
        className="h-full border-none rounded-none"
      />
    </div>
  );
}
