import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { getCustomerChatThread, sendCustomerChatMessage } from "@/services/chat.functions";
import { getRealtimeChannel } from "@/services/realtime-channel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeBackButton } from "@/components/navigation";
import { Send, AlertTriangle, ShieldCheck, Loader2, Lock, Paperclip, MessageCircle, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/datetime";
import { OrderMessageCard } from "@/components/chat/order-message-card";
import { RmaTicketModal } from "@/components/chat/rma-ticket-modal";
import { RmaMessageCard } from "@/components/chat/rma-message-card";
import { StructuredMessageView } from "@/components/chat/structured-message-view";

export const Route = createFileRoute("/_store/conta/conversas/$id")({
  head: () => ({ meta: [{ title: "Mensagens | Waesy" }] }),
  loader: async ({ params }) => {
    try {
      const res = await getCustomerChatThread({ data: { threadId: params.id } });
      return res;
    } catch (err) {
      console.error("[loader:_store.conta.conversas.$id] Unhandled loader error:", err);
      return { thread: null, messages: [], tickets: [] };
    }
  },
  component: CustomerChatPage,
});

const STATUS_LABELS: Record<string, string> = {
  open: "Online",
  pending: "Aguardando",
  resolved: "Resolvido",
  closed: "Encerrado",
};

function CustomerChatPage() {
  const data = (Route.useLoaderData?.() as any) || {};
  const { id } = Route.useParams();
  return (
    <CustomerChatRoom
      threadId={id}
      initialThread={data.thread}
      initialMessages={data.messages}
      showBackButton={true}
    />
  );
}

export function CustomerChatRoom({
  threadId,
  initialThread,
  initialMessages,
  showBackButton = true,
}: {
  threadId: string;
  initialThread?: any;
  initialMessages?: any[];
  showBackButton?: boolean;
}) {
  const id = threadId;
  const [thread, setThread] = useState<any>(initialThread || null);
  const [messages, setMessages] = useState<any[]>(initialMessages || []);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [rmaModalOpen, setRmaModalOpen] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messengerChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!initialThread || initialThread.id !== threadId) {
      getCustomerChatThread({ data: { threadId } })
        .then((res) => {
          if (isMounted && res) {
            setThread(res.thread || null);
            if (res.messages) setMessages(res.messages);
          }
        })
        .catch(console.error);
    } else {
      setThread(initialThread);
      if (initialMessages) setMessages(initialMessages);
    }
    return () => {
      isMounted = false;
    };
  }, [threadId, initialThread, initialMessages]);

  const rawStore: any = thread?.store;
  const storeData: any = Array.isArray(rawStore) ? rawStore[0] : rawStore;

  const rawOrder: any = thread?.order;
  const orderData: any = Array.isArray(rawOrder) ? rawOrder[0] : rawOrder;

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isPeerTyping]);

  // Motor Realtime E2E: Postgres Changes + Broadcast is_typing & read_receipts
  useEffect(() => {
    if (!id) return;

    const { channel, unsubscribe: unsubChat } = getRealtimeChannel(`customer-chat-${id}`);
    if (!channel) return;
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${id}`,
        },
        (payload: any) => {
          const newMsg = {
            id: payload.new.id,
            message: payload.new.message,
            message_type: payload.new.message_type || "text",
            isStaffReply: payload.new.is_staff_reply,
            createdAt: payload.new.created_at,
            attachments: payload.new.attachments || [],
            payload: payload.new.payload || {},
            readStatus: "read",
          };
          setIsPeerTyping(false);
          setMessages((prev: any[]) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe((status: any) => {
        if (status === "SUBSCRIBED") {
          getCustomerChatThread({ data: { threadId: id } })
            .then((res) => {
              if (res?.messages) setMessages(res.messages);
            })
            .catch(console.error);
        }
      });

    const { channel: protocolChannel, unsubscribe: unsubProtocol } = getRealtimeChannel("messenger-protocol-v115");
    if (!protocolChannel) return;
    protocolChannel
      .on("broadcast", { event: "is_typing" }, ({ payload }: any) => {
        if (payload?.threadId === id && payload?.sender !== "customer") {
          setIsPeerTyping(Boolean(payload.isTyping));
        }
      })
      .subscribe((status: any) => {
        if (status === "SUBSCRIBED") {
          protocolChannel.send({
            type: "broadcast",
            event: "read_receipts",
            payload: { threadId: id, status: "read" },
          });
        }
      });

    messengerChannelRef.current = protocolChannel;

    return () => {
      unsubChat();
      unsubProtocol();
    };
  }, [id]);

  const handleInputChange = (value: string) => {
    setText(value);
    if (messengerChannelRef.current && id) {
      messengerChannelRef.current.send({
        type: "broadcast",
        event: "is_typing",
        payload: { threadId: id, isTyping: value.trim().length > 0, sender: "customer" },
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        messengerChannelRef.current?.send({
          type: "broadcast",
          event: "is_typing",
          payload: { threadId: id, isTyping: false, sender: "customer" },
        });
      }, 2500);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;

    const sent = text;
    setText("");
    setIsSending(true);

    const tempId = crypto.randomUUID();
    const optimistic = {
      id: tempId,
      message: sent,
      message_type: "text",
      isStaffReply: false,
      createdAt: new Date().toISOString(),
      attachments: [],
      payload: {},
      readStatus: "sent",
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await sendCustomerChatMessage({
        data: {
          threadId: id,
          message: sent,
          message_type: "text",
        },
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, readStatus: "read" } : m))
      );
      messengerChannelRef.current?.send({
        type: "broadcast",
        event: "read_receipts",
        payload: { threadId: id, status: "read" },
      });
    } catch {
      toast.error("Erro ao enviar mensagem.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(sent);
    } finally {
      setIsSending(false);
    }
  };

  if (!thread) {
    return (
      <section className="flex flex-col items-center justify-center min-h-[50vh] max-w-md mx-auto px-0 sm:px-4 py-16 text-center gap-3">
        <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center">
          <MessageCircle className="size-6 text-muted-foreground" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Conversa não encontrada</h2>
        <p className="text-xs text-muted-foreground">
          Esta conversa pode ter sido finalizada ou excluída.
        </p>
        <Button variant="outline" size="sm" asChild className="mt-2 rounded-lg">
          <Link to="/conta/conversas">Voltar</Link>
        </Button>
      </section>
    );
  }

  const isClosed = thread?.status === "closed" || thread?.status === "resolved";

  return (
    <section className="flex flex-col h-full w-full mx-auto font-sans text-foreground bg-background">
      {/* ── Header Ultra-Minimalista WhatsApp com Avatar Circular + Online Dot + Typing Indicator ── */}
      <div className="flex items-center justify-between gap-3 px-3 py-3 border-b border-border/40 bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {showBackButton && <NativeBackButton fallbackHref="/conta/conversas" />}

          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              {storeData?.logo_url ? (
                <img
                  src={storeData.logo_url}
                  alt={storeData.name}
                  className="size-10 rounded-full object-cover border border-border/40"
                />
              ) : (
                <div className="size-10 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-xs border border-border/40">
                  {(storeData?.name || "L")[0]}
                </div>
              )}
              {!isClosed && (
                <span
                  className="absolute bottom-0 right-0 size-2.5 rounded-full bg-primary border-2 border-background"
                  title="Online"
                />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate">
                {storeData?.name || thread?.subject || "Atendimento"}
              </h2>
              {isPeerTyping ? (
                <p className="text-xs font-semibold text-primary animate-pulse truncate">
                  Digitando...
                </p>
              ) : (
                <p className="text-xs text-muted-foreground truncate">
                  {orderData ? `Pedido #${orderData.id.slice(0, 8)} • ` : ""}
                  {STATUS_LABELS[thread?.status] ?? "Online"}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {thread?.store_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRmaModalOpen(true)}
              className="h-8 text-xs font-semibold rounded-lg border border-border/60 text-foreground hover:bg-muted/50 hidden sm:flex"
            >
              <AlertTriangle className="size-3.5 mr-2 text-muted-foreground" strokeWidth={1.75} />
              Suporte
            </Button>
          )}

          <Badge
            variant={isClosed ? "secondary" : "default"}
            className="text-xs font-medium"
          >
            {STATUS_LABELS[thread?.status] ?? thread?.status}
          </Badge>
        </div>
      </div>

      {/* ── Cartão de Pedido Opcional (se vinculado) ── */}
      {orderData && (
        <div className="pt-2 px-3 sm:px-4">
          <OrderMessageCard
            order={orderData}
            onOpenRmaModal={() => setRmaModalOpen(true)}
            isStaff={false}
          />
        </div>
      )}

      {/* ── Timeline de Mensagens ── */}
      <div
        ref={chatContainerRef}
        role="log"
        aria-live="polite"
        aria-label="Histórico de mensagens"
        className="flex-1 space-y-3 overflow-y-auto no-scrollbar py-3 px-3 sm:px-4"
      >
        <div className="flex justify-center my-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/40 text-xs text-muted-foreground select-none max-w-sm text-center">
            <Lock className="size-3 text-muted-foreground shrink-0" strokeWidth={1.75} />
            <span>Mensagens protegidas de ponta a ponta</span>
          </div>
        </div>

        {(!messages || messages.length === 0) && (
          <div className="text-center py-12 text-muted-foreground space-y-2 select-none">
            <ShieldCheck className="size-10 mx-auto text-muted-foreground/30" strokeWidth={1.25} />
            <p className="text-xs text-muted-foreground">Envie uma mensagem para iniciar.</p>
          </div>
        )}

        {messages.map((msg) => {
          const isStaff = msg.isStaffReply;
          const readStatus = msg.readStatus || "read";

          if (msg.message_type === "order_card" && (msg.payload?.order || orderData)) {
            return (
              <div
                key={msg.id}
                className={`flex ${isStaff ? "justify-start" : "justify-end"} w-full`}
              >
                <OrderMessageCard
                  order={msg.payload?.order || orderData}
                  onOpenRmaModal={() => setRmaModalOpen(true)}
                  isStaff={false}
                />
              </div>
            );
          }

          if (msg.message_type === "rma_ticket" && msg.payload?.ticket_id) {
            return (
              <div
                key={msg.id}
                className={`flex ${isStaff ? "justify-start" : "justify-end"} w-full`}
              >
                <RmaMessageCard payload={msg.payload} isStaff={false} />
              </div>
            );
          }

          if (msg.message_type === "structured_blocks" || (msg.payload?.blocks && msg.payload.blocks.length > 0)) {
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isStaff ? "items-start" : "items-end"} w-full`}
              >
                <div
                  className={`max-w-[95%] sm:max-w-md p-4 text-xs rounded-lg ${
                    isStaff
                      ? "bg-card border border-border/80 text-foreground rounded-tl-xs shadow-2xs"
                      : "bg-muted/50 border border-border/70 text-foreground rounded-tr-xs"
                  }`}
                >
                  <StructuredMessageView
                    payload={msg.payload || { text: msg.message }}
                    isStaff={isStaff}
                  />
                </div>
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDate(msg.createdAt)}
                  </span>
                  {!isStaff && (
                    <CheckCheck className="size-3.5 text-primary" />
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isStaff ? "items-start" : "items-end"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-md px-4 py-2 text-xs sm:text-sm leading-relaxed ${
                  isStaff
                    ? "bg-muted/70 text-foreground rounded-lg rounded-tl-xs"
                    : "bg-primary/10 text-foreground rounded-lg rounded-tr-xs"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.message}</p>

                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2 overflow-hidden rounded-lg">
                    {msg.attachments.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-lg"
                      >
                        <img
                          src={url}
                          alt="Anexo"
                          className="w-full h-28 object-cover hover:opacity-95 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {/* Rodapé Inline da Bolha estilo WhatsApp: Horário + Ticks de Leitura */}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-xs text-muted-foreground font-mono leading-none">
                    {formatDate(msg.createdAt)}
                  </span>
                  {!isStaff && (
                    <span className="inline-flex items-center">
                      {readStatus === "sent" ? (
                        <Check className="size-3 text-muted-foreground stroke-2" />
                      ) : (
                        <CheckCheck className="size-3.5 text-primary stroke-2" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Input Area Limpa (Estilo WhatsApp) ── */}
      {!isClosed ? (
        <form
          onSubmit={handleSend}
          className="p-2 sm:p-3 border-t border-border/40 bg-background flex items-center gap-2 sticky bottom-0 z-10"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setRmaModalOpen(true)}
            className="size-11 rounded-full text-muted-foreground hover:text-foreground shrink-0 cursor-pointer active:scale-95 transition-all"
            title="Anexar"
            aria-label="Anexar arquivo"
          >
            <Paperclip className="size-5" strokeWidth={1.75} />
          </Button>

          <input
            value={text}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Mensagem..."
            className="flex-1 h-11 rounded-full bg-muted/50 px-4 text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/20 transition-all border-none"
            disabled={isSending}
          />

          <button
            type="submit"
            disabled={!text.trim() || isSending}
            className="size-11 rounded-full flex items-center justify-center text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Enviar"
            aria-label="Enviar mensagem"
          >
            {isSending ? (
              <Loader2 className="size-5 animate-spin" strokeWidth={1.75} />
            ) : (
              <Send className="size-5" strokeWidth={1.75} />
            )}
          </button>
        </form>
      ) : (
        <div className="p-3 bg-muted/20 border-t border-border/30 text-center text-xs text-muted-foreground font-medium">
          Este atendimento foi encerrado.
        </div>
      )}

      <RmaTicketModal
        open={rmaModalOpen}
        onOpenChange={setRmaModalOpen}
        threadId={id}
        storeId={thread?.store_id}
        orderId={thread?.order_id || undefined}
        onTicketCreated={() => {
          getCustomerChatThread({ data: { threadId: id } }).then((res) => {
            if (res?.messages) setMessages(res.messages);
          });
        }}
      />
    </section>
  );
}
