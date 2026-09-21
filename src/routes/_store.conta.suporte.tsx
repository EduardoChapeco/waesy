import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { EmptyState } from "@/components/state/states";
import { MessagesSquare, Send, User, Store, ChevronLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import {
 getTicketThread,
 sendTicketMessage,
 listCustomerTickets,
} from "@/services/ticket.functions";

export const Route = createFileRoute("/_store/conta/suporte")({
 head: () => ({ meta: [{ title: "Meus Atendimentos | Waesy" }] }),
 loader: async () => {
   try {
 return (await listCustomerTickets().catch(() => [])) || [];
   } catch (err) {
     console.error("[loader:_store.conta.suporte] Unhandled loader error:", err);
     return {} as any;
    }
 },
 component: CustomerSupportPage,
});

function CustomerSupportPage() {
 const tickets = Route.useLoaderData();
 const router = useRouter();

 const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
 const [thread, setThread] = useState<any>(null);
 const [message, setMessage] = useState("");
 const [sending, setSending] = useState(false);
 const [loadingThread, setLoadingThread] = useState(false);

 useEffect(() => {
 if (selectedTicketId) {
 loadThread(selectedTicketId);
 }
 }, [selectedTicketId]);

 const loadThread = async (id: string) => {
 setLoadingThread(true);
 try {
 const data = await getTicketThread({ data: { ticketId: id } });
 setThread(data);
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao carregar atendimento");
 setSelectedTicketId(null);
 } finally {
 setLoadingThread(false);
 }
 };

 const handleSend = async () => {
 if (!message.trim() || !selectedTicketId) return;

 setSending(true);
 try {
 await sendTicketMessage({
 data: { ticketId: selectedTicketId, content: message, isInternal: false },
 });
 setMessage("");
 await loadThread(selectedTicketId);
 router.invalidate();
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao enviar mensagem");
 } finally {
 setSending(false);
 }
 };

 return (
 <div className="space-y-6 flex flex-col h-[70vh]">
 <div className="flex-1 bg-card rounded-xl overflow-hidden flex flex-col md:flex-row">
 {/* Ticket List - Responsive hide when a ticket is selected on mobile */}
 <div
 className={`w-full md:w-80 border-r bg-muted/10 flex flex-col ${selectedTicketId ? "hidden md:flex" : "flex"}`}
 >
 <div className="p-4 border-b font-medium flex items-center justify-between">
 Meus Chamados
 </div>
 <div className="flex-1 overflow-y-auto no-scrollbar">
 {tickets.length === 0 ? (
 <div className="text-sm text-muted-foreground text-center mt-10 p-4">
 Você ainda não possui nenhum atendimento aberto.
 </div>
 ) : (
 <div className="divide-y">
 {tickets.map((t: any) => (
 <button
 key={t.id}
 onClick={() => setSelectedTicketId(t.id)}
 className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${selectedTicketId === t.id ? "bg-muted border-l border-l-primary" : "border-l border-l-transparent"}`}
 >
 <div className="flex justify-between items-start mb-1">
 <span className="font-medium text-sm truncate pr-2">{t.subject}</span>
 </div>
 <div className="flex justify-between items-center mt-2">
 <span className="text-[10px] text-muted-foreground">
 {formatDate(t.updated_at)}
 </span>
 {t.status === "open" && (
 <Badge variant="secondary" className="text-[10px]">
 Aguardando Loja
 </Badge>
 )}
 {t.status === "waiting_customer" && (
 <Badge variant="destructive" className="text-[10px]">
 Sua Vez
 </Badge>
 )}
 {t.status === "closed" && (
 <Badge variant="outline" className="text-[10px]">
 Resolvido
 </Badge>
 )}
 </div>
 </button>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Chat Area */}
 <div
 className={`flex-1 flex flex-col bg-background/50 relative ${!selectedTicketId ? "hidden md:flex" : "flex"}`}
 >
 {!selectedTicketId ? (
 <div className="flex-1 flex flex-col justify-center items-center p-6">
 <EmptyState title="Selecione um Chamado" />
 </div>
 ) : (
 <>
 {/* Chat Header */}
 <div className="p-4 border-b bg-card flex justify-start items-center gap-3">
 <Button
 variant="ghost"
 size="icon"
 className="md:hidden"
 onClick={() => setSelectedTicketId(null)}
 >
 <ChevronLeft className="w-5 h-5" />
 </Button>
 {loadingThread ? (
 <div className="animate-pulse h-4 bg-muted rounded w-1/3"></div>
 ) : (
 <h3 className="font-semibold truncate">
 {tickets.find((t: any) => t.id === selectedTicketId)?.subject}
 </h3>
 )}
 </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
          {/* Indicativo de Segurança Visual */}
          <div className="flex justify-center my-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/40 text-[11px] text-muted-foreground select-none">
              <Lock className="size-3 text-muted-foreground shrink-0" strokeWidth={1.75} />
              <span>As mensagens são protegidas com criptografia de ponta a ponta</span>
            </div>
          </div>

          {thread?.messages
            .filter((m: any) => !m.isInternal)
            .map((m: any) => (
              <div key={m.id} className={`flex ${m.isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] md:max-w-[70%] px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed border-none ${
                    m.isMe
                      ? "bg-primary/10 text-foreground rounded-2xl rounded-tr-xs"
                      : "bg-muted/70 text-foreground rounded-2xl rounded-tl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <div className="flex items-center justify-between gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>{m.isMe ? "Você" : "Equipe da Loja"}</span>
                    <span>
                      {new Date(m.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Message Input */}
        {thread?.ticketStatus !== "closed" ? (
          <div className="p-2 sm:p-2.5 border-t border-border/40 bg-background flex items-center gap-2">
            <input
              placeholder="Digite sua resposta..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              className="flex-1 h-10 rounded-full bg-muted/50 px-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/20 transition-all border-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="size-9 flex items-center justify-center text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 transition-opacity cursor-pointer shrink-0"
              title="Enviar"
              aria-label="Enviar mensagem"
            >
              <Send className="size-4.5" strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <div className="p-3 bg-muted/20 border-t border-border/30 text-center text-xs text-muted-foreground font-medium">
            Este atendimento foi encerrado.
          </div>
        )}
 </>
 )}
 </div>
 </div>
 </div>
 );
}
