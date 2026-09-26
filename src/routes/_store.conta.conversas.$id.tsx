import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { getCustomerChatThread, sendCustomerChatMessage } from "@/services/chat.functions";
import { getBrowserClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Send,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Lock,
  Paperclip,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/datetime";
import { OrderMessageCard } from "@/components/chat/order-message-card";
import { RmaTicketModal } from "@/components/chat/rma-ticket-modal";
import { RmaMessageCard } from "@/components/chat/rma-message-card";

export const Route = createFileRoute("/_store/conta/conversas/$id")({
  head: () => ({ meta: [{ title: "Atendimento & SAC | Waesy" }] }),
  loader: async ({ params }) => {
    try {
      const res = await getCustomerChatThread({ data: { threadId: params.id } });
      return res;
    } catch (err) {
      console.error("[loader:_store.conta.conversas.$id] Unhandled loader error:", err);
      return null as any;
    }
  },
  component: CustomerChatPage,
});

const STATUS_LABELS: Record<string, string> = {
  open: "Em Atendimento",
  pending: "Aguardando Loja",
  resolved: "Resolvido",
  closed: "Encerrado",
};

function CustomerChatPage() {
  const { thread, messages: initialMessages, tickets: initialTickets } = ((Route.useLoaderData?.() as any) || {});
  const { id } = Route.useParams();
  const [messages, setMessages] = useState<any[]>(initialMessages || []);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [rmaModalOpen, setRmaModalOpen] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Normalize store and order from joined relations
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
  }, [messages]);

  useEffect(() => {
    if (!id) return;

    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`customer-chat-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = {
            id: payload.new.id,
            message: payload.new.message,
            message_type: payload.new.message_type || "text",
            isStaffReply: payload.new.is_staff_reply,
            createdAt: payload.new.created_at,
            attachments: payload.new.attachments || [],
            payload: payload.new.payload || {},
          };
          setMessages((prev: any[]) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          getCustomerChatThread({ data: { threadId: id } })
            .then((res) => {
              if (res?.messages) setMessages(res.messages);
            })
            .catch(console.error);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;

    const sent = text;
    setText("");
    setIsSending(true);

    const optimistic = {
      id: crypto.randomUUID(),
      message: sent,
      message_type: "text",
      isStaffReply: false,
      createdAt: new Date().toISOString(),
      attachments: [],
      payload: {},
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
    } catch (err) {
      toast.error("Erro ao enviar mensagem.");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(sent);
    } finally {
      setIsSending(false);
    }
  };

  if (!thread) {
    return (
      <section className="flex flex-col items-center justify-center min-h-[50vh] max-w-md mx-auto px-4 py-16 text-center gap-3">
        <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center">
          <MessageCircle className="size-6 text-muted-foreground" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Conversa não encontrada</h2>
        <p className="text-xs text-muted-foreground">
          Esta conversa pode ter sido finalizada, excluída ou você não tem permissão para acessá-la.
        </p>
        <Button variant="outline" size="sm" asChild className="mt-2">
          <Link to="/conta/conversas">Voltar para Conversas</Link>
        </Button>
      </section>
    );
  }

  const isClosed = thread?.status === "closed" || thread?.status === "resolved";

  return (
    <section className="flex flex-col h-[calc(100dvh-100px)] max-w-4xl mx-auto font-sans text-foreground bg-background">
      {/* ── Header Ultra-Minimalista WhatsApp ── */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-border/40 bg-background sticky top-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-11 rounded-full shrink-0 text-foreground hover:bg-muted/50 active:scale-95 transition-all"
            asChild
          >
            <Link to="/conta/conversas" aria-label="Voltar para Conversas">
              <ChevronLeft className="size-5.5" strokeWidth={2} />
            </Link>
          </Button>

          <div className="flex items-center gap-2.5 min-w-0">
            {storeData?.logo_url ? (
              <img
                src={storeData.logo_url}
                alt={storeData.name}
                className="size-9 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="size-9 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-xs shrink-0">
                {(storeData?.name || "L")[0]}
              </div>
            )}

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate">
                {storeData?.name || thread?.subject || "Atendimento"}
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">
                {orderData ? `Pedido #${orderData.id.slice(0, 8)} • ` : ""}
                {STATUS_LABELS[thread?.status] ?? "Atendimento"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {thread?.store_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRmaModalOpen(true)}
              className="h-8 text-xs font-semibold rounded-xl border border-border/60 text-foreground hover:bg-muted/50 hidden sm:flex"
            >
              <AlertTriangle className="size-3.5 mr-1.5 text-muted-foreground" strokeWidth={1.75} />
              Ajuda / SAC
            </Button>
          )}

          <Badge
            variant={isClosed ? "secondary" : "default"}
            className="text-[10px] font-medium"
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
        className="flex-1 space-y-3 overflow-y-auto no-scrollbar py-3 px-3 sm:px-4"
      >
        {/* Indicativo tipográfico sutil centralizado no início do chat */}
        <div className="flex justify-center my-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/40 text-[11px] text-muted-foreground select-none max-w-sm text-center">
            <Lock className="size-3 text-muted-foreground shrink-0" strokeWidth={1.75} />
            <span>As mensagens são protegidas com criptografia de ponta a ponta</span>
          </div>
        </div>

        {(!messages || messages.length === 0) && (
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <ShieldCheck className="size-10 mx-auto text-primary/40" strokeWidth={1.5} />
            <p className="text-xs font-medium">Conversa segura com a loja.</p>
            <p className="text-[11px]">Envie uma mensagem abaixo para falar com o atendimento.</p>
          </div>
        )}

        {messages.map((msg) => {
          const isStaff = msg.isStaffReply;

          // Se for card de pedido
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

          // Se for card de ticket de troca / SAC
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

          // Mensagem de texto WhatsApp-like
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isStaff ? "items-start" : "items-end"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-md px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed border-none ${
                  isStaff
                    ? "bg-muted/70 text-foreground rounded-2xl rounded-tl-xs"
                    : "bg-primary/10 text-foreground rounded-2xl rounded-tr-xs"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.message}</p>

                {/* Preview de imagem integrado à bolha de forma fluida (sem bordas extras) */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5 overflow-hidden rounded-xl">
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
              </div>

              <span className="text-[10px] text-muted-foreground mt-1 px-1">
                {isStaff ? (storeData?.name || "Equipe") : "Você"} • {formatDate(msg.createdAt)}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Input Area Limpa (Estilo WhatsApp) ── */}
      {!isClosed ? (
        <form
          onSubmit={handleSend}
          className="p-2 sm:p-2.5 border-t border-border/40 bg-background flex items-center gap-1.5 sticky bottom-0 z-10"
        >
          {/* Ícone de anexo (clipe/câmera) sem caixa decorativa (44px) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setRmaModalOpen(true)}
            className="size-11 rounded-full text-muted-foreground hover:text-foreground shrink-0 cursor-pointer active:scale-95 transition-all"
            title="Anexar ou Ocorrência"
            aria-label="Anexar arquivo"
          >
            <Paperclip className="size-5" strokeWidth={1.75} />
          </Button>

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem..."
            className="flex-1 h-11 rounded-full bg-muted/50 px-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/20 transition-all border-none"
            disabled={isSending}
          />

          {/* Botão de envio sem caixa em volta (44px) */}
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

      {/* Modal de Abertura de Ticket SAC / RMA */}
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
