import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowSquareOut,
  ChatCircleDots,
  PaperPlaneRight,
  Robot,
  UsersThree,
  WhatsappLogo,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  getChatMessages,
  listChatThreads,
  sendChatMessage,
} from "@/services/chat.functions";
import {
  listIntranetChannels,
  listIntranetMessages,
  sendIntranetMessage,
} from "@/services/intranet.functions";
import {
  executeCopilotDrawerMessage,
  listAiConversationThreads,
} from "@/services/ai-conversations.functions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DockConversationItem {
  id: string;
  kind: "client" | "internal";
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  channel: "whatsapp" | "web" | "internal";
  unread?: boolean;
  department?: string;
  updatedAt?: string;
}

export interface WorkspaceQuickChatDockProps {
  activeStoreId?: string;
  initialChatStripOpen?: boolean;
  initialCopilotOpen?: boolean;
  initialConversation?: DockConversationItem | null;
}

export function resolveDockControlsLayoutClass(isChatStripOpen: boolean): string {
  return isChatStripOpen ? "flex-row" : "flex-col-reverse w-14";
}

function getInitials(name: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "CH";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function WorkspaceQuickChatDock({
  activeStoreId,
  initialChatStripOpen = false,
  initialCopilotOpen = false,
  initialConversation = null,
}: WorkspaceQuickChatDockProps) {
  const queryClient = useQueryClient();
  const [isChatStripOpen, setIsChatStripOpen] = useState(initialChatStripOpen);
  const [isCopilotOpen, setIsCopilotOpen] = useState(initialCopilotOpen);
  const [activeConversation, setActiveConversation] =
    useState<DockConversationItem | null>(initialConversation);
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});
  const [draftText, setDraftText] = useState("");
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotHistory, setCopilotHistory] = useState<
    Array<{ id: string; role: "user" | "assistant"; text: string }>
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const copilotEndRef = useRef<HTMLDivElement>(null);

  const { data: threadsRes } = useQuery({
    queryKey: ["workspace-dock-client-threads", activeStoreId],
    queryFn: () =>
      listChatThreads({
        data: {
          store_id: activeStoreId,
          status: "open",
        },
      }),
    enabled: Boolean(activeStoreId),
    staleTime: 15_000,
    refetchInterval: isChatStripOpen || activeConversation ? 15_000 : 45_000,
  });

  const { data: internalChannels } = useQuery({
    queryKey: ["workspace-dock-internal-channels", activeStoreId],
    queryFn: () => listIntranetChannels({ data: { store_id: activeStoreId } }),
    enabled: Boolean(activeStoreId),
    staleTime: 30_000,
  });

  const { data: aiThreads } = useQuery({
    queryKey: ["workspace-dock-ai-threads"],
    queryFn: () => listAiConversationThreads(),
    enabled: isCopilotOpen,
    staleTime: 30_000,
  });

  const conversations: DockConversationItem[] = useMemo(() => {
    const clientItems: DockConversationItem[] = (threadsRes?.threads || []).map(
      (t: any) => ({
        id: String(t.id),
        kind: "client" as const,
        title:
          t.customer?.full_name ||
          t.subject ||
          (t.channel === "whatsapp" ? "Cliente WhatsApp" : "Atendimento"),
        subtitle: t.last_message || "Sem mensagens",
        avatarUrl: t.avatar_url || t.customer?.avatar_url || null,
        channel: t.channel === "whatsapp" ? "whatsapp" : "web",
        unread: Boolean(t.total_messages > 0 && !t.is_last_reply_staff),
        department: t.department,
        updatedAt: t.updated_at,
      })
    );

    const internalItems: DockConversationItem[] = (internalChannels || []).map(
      (ch: any) => {
        const lastMsg = Array.isArray(ch.messages) && ch.messages.length > 0
          ? ch.messages[ch.messages.length - 1]
          : null;
        return {
          id: String(ch.id),
          kind: "internal" as const,
          title: ch.title || "Equipe",
          subtitle: lastMsg?.text || ch.department || "Canal interno",
          avatarUrl: null,
          channel: "internal" as const,
          unread: false,
          department: ch.department,
          updatedAt: ch.updated_at || ch.created_at,
        };
      }
    );

    return [...clientItems, ...internalItems].sort((a, b) => {
      if (a.unread !== b.unread) return a.unread ? -1 : 1;
      return (
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );
    });
  }, [threadsRes, internalChannels]);

  const unreadCount = useMemo(
    () => conversations.filter((c) => c.unread).length,
    [conversations]
  );

  const { data: activeMessages, isLoading: isMessagesLoading } = useQuery({
    queryKey: [
      "workspace-dock-messages",
      activeConversation?.kind,
      activeConversation?.id,
    ],
    queryFn: async () => {
      if (!activeConversation) return [];
      if (activeConversation.kind === "client") {
        const res = await getChatMessages({
          data: { threadId: activeConversation.id },
        });
        return (res?.messages || []).map((m: any) => ({
          id: String(m.id),
          text: String(m.message || ""),
          isOutgoing: Boolean(m.is_staff_reply),
          author: Boolean(m.is_staff_reply) ? "Você" : activeConversation.title,
          createdAt: m.created_at,
        }));
      }
      const res = await listIntranetMessages({
        data: { channelId: activeConversation.id },
      });
      return (res || []).map((m: any) => ({
        id: String(m.id),
        text: String(m.content || ""),
        isOutgoing: false,
        author: m.author_name || "Equipe",
        createdAt: m.created_at,
      }));
    },
    enabled: Boolean(activeConversation),
    refetchInterval: activeConversation ? 8_000 : false,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages?.length, activeConversation?.id]);

  useEffect(() => {
    copilotEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [copilotHistory.length]);

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!activeConversation) throw new Error("Selecione uma conversa.");
      if (activeConversation.kind === "client") {
        return sendChatMessage({
          data: {
            threadId: activeConversation.id,
            message: text,
            message_type: "text",
          },
        });
      }
      return sendIntranetMessage({
        data: {
          channelId: activeConversation.id,
          content: text,
        },
      });
    },
    onSuccess: () => {
      setDraftText("");
      queryClient.invalidateQueries({
        queryKey: [
          "workspace-dock-messages",
          activeConversation?.kind,
          activeConversation?.id,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["workspace-dock-client-threads", activeStoreId],
      });
      queryClient.invalidateQueries({
        queryKey: ["workspace-dock-internal-channels", activeStoreId],
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao enviar mensagem.");
    },
  });

  const copilotMutation = useMutation({
    mutationFn: async (message: string) =>
      executeCopilotDrawerMessage({ data: { message } }),
    onSuccess: (res, sentText) => {
      setCopilotHistory((prev) => [
        ...prev,
        { id: `usr-${Date.now()}`, role: "user", text: sentText },
        {
          id: `ai-${Date.now() + 1}`,
          role: "assistant",
          text: res?.responseMessage || "Pronto.",
        },
      ]);
      setCopilotInput("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao consultar Copilot.");
    },
  });

  const handleToggleChatStrip = () => {
    setIsChatStripOpen((prev) => !prev);
  };

  const handleToggleCopilot = () => {
    setIsCopilotOpen((prev) => {
      const next = !prev;
      if (next) setActiveConversation(null);
      return next;
    });
  };

  const handleOpenConversation = (item: DockConversationItem) => {
    setIsCopilotOpen(false);
    setActiveConversation((prev) => (prev?.id === item.id ? null : item));
  };

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draftText.trim();
    if (!clean || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(clean);
  };

  const handleSubmitCopilot = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = copilotInput.trim();
    if (!clean || copilotMutation.isPending) return;
    copilotMutation.mutate(clean);
  };

  return (
    <TooltipProvider delayDuration={120}>
      <div
        data-testid="workspace-quick-chat-dock"
        className="hidden waesy-expanded-flex absolute bottom-4 left-3 top-16 z-40 pointer-events-none items-end gap-2"
      >
        {/* Coluna 3: Tira Vertical Fina + Botões Squircle (Copilot & Chat) */}
        <div className="flex flex-col items-start justify-end h-full min-h-0 gap-2 pointer-events-none">
          {/* Tira vertical fina com fotos squircle das conversas/atendimentos */}
          {isChatStripOpen && (
            <div
              data-testid="quick-chat-strip"
              aria-label="Conversas e atendimentos rápidos"
              className="pointer-events-auto w-14 flex flex-col items-center gap-2 py-2 px-1 rounded-2xl bg-sidebar border border-sidebar-border max-h-full overflow-y-auto no-scrollbar"
            >
              {conversations.length === 0 ? (
                <div className="py-3 text-center">
                  <span className="text-2xs font-medium text-muted-foreground block">
                    Vazio
                  </span>
                </div>
              ) : (
                conversations.map((item) => {
                  const isActive = activeConversation?.id === item.id;
                  const showImg = Boolean(item.avatarUrl && !failedAvatars[item.id]);

                  return (
                    <Tooltip key={`${item.kind}-${item.id}`}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleOpenConversation(item)}
                          aria-label={item.title}
                          aria-pressed={isActive}
                          className={cn(
                            "relative size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden",
                            isActive
                              ? "ring-2 ring-foreground bg-sidebar-active text-foreground"
                              : "bg-card text-foreground hover:bg-sidebar-active"
                          )}
                        >
                          {showImg ? (
                            <img
                              src={item.avatarUrl || ""}
                              alt={item.title}
                              onError={() =>
                                setFailedAvatars((prev) => ({
                                  ...prev,
                                  [item.id]: true,
                                }))
                              }
                              className="size-full object-cover"
                            />
                          ) : item.kind === "internal" ? (
                            <UsersThree
                              size={18}
                              weight={isActive ? "fill" : "regular"}
                              className="text-foreground"
                            />
                          ) : (
                            <span className="text-xs font-bold tracking-tight">
                              {getInitials(item.title)}
                            </span>
                          )}

                          {/* Micro indicador discreto de canal / não lido */}
                          {item.unread && (
                            <span
                              aria-label="Não lida"
                              className="absolute top-1 right-1 size-2 rounded-full bg-primary"
                            />
                          )}
                          {item.channel === "whatsapp" && (
                            <span className="sr-only">WhatsApp</span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8} className="max-w-56">
                        <p className="text-xs font-semibold truncate">{item.title}</p>
                        <p className="text-2xs text-muted-foreground truncate">
                          {item.channel === "whatsapp"
                            ? "WhatsApp · "
                            : item.kind === "internal"
                              ? "Equipe · "
                              : ""}
                          {item.subtitle}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              )}
            </div>
          )}

          {/* Conjunto de Botões Squircle: Copilot fica acima do Chat quando fechado e cai para o lado ao abrir o Chat */}
          <div
            data-testid="dock-squircle-controls"
            className={cn(
              "pointer-events-auto flex items-center gap-2",
              resolveDockControlsLayoutClass(isChatStripOpen)
            )}
          >
            {/* Botão Squircle de Chat (Atendimentos / Interno) */}
            <div className="w-14 flex items-center justify-center shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    data-testid="dock-chat-toggle"
                    onClick={handleToggleChatStrip}
                    aria-label="Chat rápido"
                    aria-expanded={isChatStripOpen}
                    className={cn(
                      "relative size-11 min-w-11 min-h-11 rounded-xl border border-sidebar-border flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isChatStripOpen
                        ? "bg-foreground text-background"
                        : "bg-sidebar text-foreground hover:bg-sidebar-active"
                    )}
                  >
                    <ChatCircleDots
                      size={20}
                      weight={isChatStripOpen ? "fill" : "regular"}
                    />
                    {unreadCount > 0 && !isChatStripOpen && (
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-foreground text-background text-3xs font-bold flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Atendimentos ({conversations.length})
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Botão Squircle Copilot (fica em cima do chat e cai para o lado quando o chat abre) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-testid="dock-copilot-toggle"
                  onClick={handleToggleCopilot}
                  aria-label="Copilot rápido"
                  aria-expanded={isCopilotOpen}
                  className={cn(
                    "size-11 min-w-11 min-h-11 rounded-xl border border-sidebar-border flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isCopilotOpen
                      ? "bg-foreground text-background"
                      : "bg-sidebar text-foreground hover:bg-sidebar-active"
                  )}
                >
                  <Robot
                    size={20}
                    weight={isCopilotOpen ? "fill" : "regular"}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Copilot
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Janela Flutuante Estilo Instagram para Conversa com Cliente ou Equipe */}
        {activeConversation && (
          <section
            data-testid="quick-chat-popover"
            aria-label={`Conversa rápida com ${activeConversation.title}`}
            className="pointer-events-auto w-80 sm:w-96 h-96 max-h-full rounded-2xl bg-card border border-border flex flex-col overflow-hidden"
          >
            <header className="h-14 px-3 border-b border-border bg-sidebar flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-9 rounded-xl bg-muted text-foreground flex items-center justify-center shrink-0 overflow-hidden font-bold text-xs">
                  {activeConversation.avatarUrl &&
                  !failedAvatars[activeConversation.id] ? (
                    <img
                      src={activeConversation.avatarUrl}
                      alt={activeConversation.title}
                      className="size-full object-cover"
                    />
                  ) : activeConversation.kind === "internal" ? (
                    <UsersThree size={16} weight="fill" />
                  ) : (
                    getInitials(activeConversation.title)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {activeConversation.title}
                  </p>
                  <p className="text-2xs text-muted-foreground flex items-center gap-1 truncate">
                    {activeConversation.channel === "whatsapp" && (
                      <WhatsappLogo size={12} weight="fill" />
                    )}
                    <span>
                      {activeConversation.channel === "whatsapp"
                        ? "WhatsApp"
                        : activeConversation.kind === "internal"
                          ? "Equipe interna"
                          : "Chat"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {activeConversation.kind === "client" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to={"/workspace/atendimento/chat" as any}
                        search={{ threadId: activeConversation.id } as any}
                        aria-label="Abrir atendimento completo"
                        className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ArrowSquareOut size={16} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="top">Abrir completo</TooltipContent>
                  </Tooltip>
                )}
                <button
                  type="button"
                  onClick={() => setActiveConversation(null)}
                  aria-label="Fechar conversa"
                  className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-background">
              {isMessagesLoading ? (
                <div className="space-y-2">
                  <div className="h-8 w-2/3 rounded-xl bg-muted animate-pulse motion-reduce:animate-none" />
                  <div className="h-8 w-1/2 rounded-xl bg-muted animate-pulse motion-reduce:animate-none ml-auto" />
                </div>
              ) : !activeMessages || activeMessages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Nenhuma mensagem ainda.
                </p>
              ) : (
                activeMessages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-64",
                      msg.isOutgoing ? "ml-auto items-end" : "items-start"
                    )}
                  >
                    {activeConversation.kind === "internal" && (
                      <span className="text-3xs text-muted-foreground px-1 mb-1">
                        {msg.author}
                      </span>
                    )}
                    <div
                      className={cn(
                        "px-3 py-2 rounded-2xl text-xs leading-relaxed break-words",
                        msg.isOutgoing
                          ? "bg-foreground text-background"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSubmitChat}
              className="p-2 border-t border-border bg-card flex items-center gap-2 shrink-0"
            >
              <Input
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder="Responder agora..."
                className="h-11 min-h-11 rounded-xl text-xs"
                disabled={sendMessageMutation.isPending}
              />
              <button
                type="submit"
                aria-label="Enviar mensagem"
                disabled={!draftText.trim() || sendMessageMutation.isPending}
                className="size-11 min-w-11 min-h-11 rounded-xl bg-foreground text-background disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PaperPlaneRight size={16} weight="fill" />
              </button>
            </form>
          </section>
        )}

        {/* Janela Flutuante de Conversas Rápidas do Copilot */}
        {isCopilotOpen && (
          <section
            data-testid="quick-copilot-popover"
            aria-label="Copilot rápido"
            className="pointer-events-auto w-80 sm:w-96 h-96 max-h-full rounded-2xl bg-card border border-border flex flex-col overflow-hidden"
          >
            <header className="h-14 px-3 border-b border-border bg-sidebar flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-9 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
                  <Robot size={18} weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    Copilot
                  </p>
                  <p className="text-2xs text-muted-foreground truncate">
                    Conversas rápidas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={"/workspace/copilot" as any}
                      aria-label="Abrir Copilot completo"
                      className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ArrowSquareOut size={16} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top">Abrir completo</TooltipContent>
                </Tooltip>
                <button
                  type="button"
                  onClick={() => setIsCopilotOpen(false)}
                  aria-label="Fechar Copilot"
                  className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-background">
              {aiThreads && aiThreads.length > 0 && copilotHistory.length === 0 && (
                <div className="space-y-1">
                  <span className="text-2xs font-medium text-muted-foreground px-1 block">
                    Recentes
                  </span>
                  {aiThreads.slice(0, 4).map((thread) => (
                    <Link
                      key={thread.id}
                      to={"/workspace/copilot" as any}
                      search={{ threadId: thread.id } as any}
                      className="flex flex-col justify-center px-3 min-h-11 py-2 rounded-xl hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="text-xs font-semibold text-foreground truncate">
                        {thread.title}
                      </span>
                      {thread.last_message_snippet && (
                        <span className="text-2xs text-muted-foreground truncate">
                          {thread.last_message_snippet}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {copilotHistory.length === 0 && (!aiThreads || aiThreads.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Envie uma pergunta sem sair desta tela.
                </p>
              )}

              {copilotHistory.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-64 px-3 py-2 rounded-2xl text-xs leading-relaxed break-words",
                    m.role === "user"
                      ? "ml-auto bg-foreground text-background"
                      : "bg-muted text-foreground"
                  )}
                >
                  {m.text}
                </div>
              ))}
              {copilotMutation.isPending && (
                <div className="h-8 w-32 rounded-2xl bg-muted animate-pulse motion-reduce:animate-none" />
              )}
              <div ref={copilotEndRef} />
            </div>

            <form
              onSubmit={handleSubmitCopilot}
              className="p-2 border-t border-border bg-card flex items-center gap-2 shrink-0"
            >
              <Input
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder="Perguntar ao Copilot..."
                className="h-11 min-h-11 rounded-xl text-xs"
                disabled={copilotMutation.isPending}
              />
              <button
                type="submit"
                aria-label="Enviar ao Copilot"
                disabled={!copilotInput.trim() || copilotMutation.isPending}
                className="size-11 min-w-11 min-h-11 rounded-xl bg-foreground text-background disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PaperPlaneRight size={16} weight="fill" />
              </button>
            </form>
          </section>
        )}
      </div>
    </TooltipProvider>
  );
}
