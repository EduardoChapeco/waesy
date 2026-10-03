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
  resolveAiPipelineSteps,
} from "@/services/ai-conversations.functions";
import { getUserSession } from "@/services/auth.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/copilot")({
  head: () => ({
    meta: [
      { title: "Waesy Copilot | Assistente Central Inteligente" },
      {
        name: "description",
        content:
          "Assistente inteligente para consultas locais, planejamento de viagens, recomendacao de produtos e criacao de propostas.",
      },
    ],
  }),
  loader: async () => {
    try {
      const [session, threads] = await Promise.all([
        getUserSession().catch(() => null),
        listAiConversationThreads().catch(() => []),
      ]);
      return { session, initialThreads: threads };
    } catch {
      return { session: null, initialThreads: [] };
    }
  },
  component: CopilotPage,
});

function CopilotPage() {
  const { session, initialThreads } = Route.useLoaderData();
  const [threads, setThreads] = useState<ChatThreadItem[]>(() => {
    if (initialThreads && initialThreads.length > 0) {
      return initialThreads.map((t: any) => ({
        id: t.id,
        type: t.type || "ai_assistant",
        title: t.title,
        isPinned: t.is_pinned,
        metadata: t.metadata,
        workingMemory: t.working_memory,
        updatedAt: t.updated_at,
      }));
    }
    return [
      {
        id: "default-assistant-thread",
        type: "ai_assistant",
        title: "Copilot Geral",
        isPinned: true,
        lastMessageSnippet: "Como posso ajudar com produtos, viagens ou servicos?",
        workingMemory: {},
      },
    ];
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(
    threads[0]?.id || "default-assistant-thread"
  );

  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: "welcome-msg",
      threadId: activeThreadId,
      senderName: "Waesy Copilot",
      isStaffOrAI: true,
      text: "Ola! Sou o Copilot inteligente da plataforma Waesy. Posso te ajudar a encontrar estabelecimentos no Places, pacotes no Turismo, ofertas no Marketplace ou estruturar propostas comerciais para o seu negocio. Como posso te apoiar hoje?",
      createdAt: new Date().toISOString(),
      status: "delivered",
    },
  ]);

  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (activeThreadId && activeThreadId !== "default-assistant-thread") {
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
      senderName: session?.user_metadata?.full_name || "Voce",
      isStaffOrAI: false,
      text,
      createdAt: new Date().toISOString(),
      status: "sending",
      attachments,
    };

    setMessages((prev) => [...prev, userMessageItem]);
    setIsSending(true);

    try {
      if (session?.id && activeThreadId !== "default-assistant-thread") {
        await sendAiConversationMessage({
          data: {
            threadId: activeThreadId,
            message: text,
            replyToId,
            attachments,
          },
        });
        const updated = await getAiConversationThread({ data: { threadId: activeThreadId } });
        if (updated?.messages) {
          setMessages(updated.messages as any);
        }
      } else {
        const execution = resolveAiPipelineSteps(text, {});
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
      if (session?.id) {
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
        const localId = `local-${Date.now()}`;
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
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col bg-background">
      <AIChatShell
        threads={threads}
        activeThreadId={activeThreadId}
        messages={messages}
        onSelectThread={(id) => setActiveThreadId(id)}
        onSendMessage={handleSendMessage}
        onCreateThread={handleCreateThread}
        isSending={isSending}
        currentUserProfileId={session?.id}
        className="h-full border-none rounded-none"
      />
    </div>
  );
}
