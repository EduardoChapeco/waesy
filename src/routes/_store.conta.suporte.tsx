import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { MessagesSquare, Send, ChevronLeft, Lock, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDate } from "@/lib/datetime";
import { getTicketThread, sendTicketMessage, listCustomerTickets, createCustomerTicket, closeCustomerTicket } from "@/services/support-tickets.functions";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";

export const Route = createFileRoute("/_store/conta/suporte")({
  head: () => ({ meta: [{ title: "Atendimento e Suporte | Waesy" }] }),
  loader: async () => {
    try {
      return (await listCustomerTickets().catch(() => [])) || [];
    } catch (err) {
      console.error("[loader:_store.conta.suporte] Unhandled loader error:", err);
      return [] as any;
    }
  },
  component: CustomerSupportPage,
});

function CustomerSupportPage() {
  const tickets = (Route.useLoaderData() as any[]) || [];
  const router = useRouter();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [thread, setThread] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  // Modal de Novo Chamado
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newContextType, setNewContextType] = useState<"general" | "order" | "rma">("general");
  const [newMessage, setNewMessage] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);

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

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) {
      toast.error("Preencha o assunto e a mensagem do chamado.");
      return;
    }

    setCreatingTicket(true);
    try {
      const created = await createCustomerTicket({
        data: {
          subject: newSubject.trim(),
          message: newMessage.trim(),
          contextType: newContextType,
        },
      });

      toast.success("Chamado aberto com sucesso!");
      setIsNewTicketOpen(false);
      setNewSubject("");
      setNewMessage("");
      setNewContextType("general");
      await router.invalidate();
      if (created?.id) {
        setSelectedTicketId(created.id);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao abrir chamado.");
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicketId) return;
    try {
      await closeCustomerTicket({ data: { ticketId: selectedTicketId } });
      toast.success("Chamado encerrado.");
      await loadThread(selectedTicketId);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao encerrar chamado.");
    }
  };

  const selectedTicket = tickets.find((t: any) => t.id === selectedTicketId);

  const newTicketButton = (
    <Button
      size="sm"
      onClick={() => setIsNewTicketOpen(true)}
      className="font-bold gap-2 h-11 min-h-11 sm:h-9 rounded-lg text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Plus className="size-4 shrink-0" />
      <span>Novo Chamado</span>
    </Button>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-safe pb-24 px-0 sm:px-4 md:px-0 flex flex-col flex-1 min-h-96">
      {/* ── 0. Native Mobile Header (<768px) ── */}
      <NativeMobileHeader
        title={selectedTicketId ? (thread?.subject || selectedTicket?.subject || "Atendimento") : "Atendimento"}
        fallbackHref="/conta"
        onBack={selectedTicketId ? () => setSelectedTicketId(null) : undefined}
        mobileOnly
        rightAction={!selectedTicketId ? newTicketButton : undefined}
      />

      {/* ── 1. Clean Minimalist Header (Desktop >=768px) ── */}
      <div className="hidden md:flex items-center justify-between gap-4 border-b border-border/40 pb-3 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Atendimento
          </h1>
          {Array.isArray(tickets) && tickets.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-1 rounded-full">
              {tickets.length}
            </Badge>
          )}
        </div>

        {newTicketButton}
      </div>

      <div className="flex-1 bg-card rounded-lg border border-border/60 overflow-hidden flex flex-col md:flex-row">
        {/* Ticket List - Responsive hide when a ticket is selected on mobile */}
        <div
          className={`w-full md:w-80 border-r border-border/40 bg-muted/5 flex flex-col ${selectedTicketId ? "hidden md:flex" : "flex"}`}
        >
          <div className="p-4 border-b border-border/40 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            Chamados Abertos
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {tickets.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center mt-10 p-4 space-y-3">
                <p>Você ainda não possui nenhum atendimento aberto.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewTicketOpen(true)}
                  className="rounded-lg text-xs font-semibold gap-2 h-11 min-h-11 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Plus className="size-4" />
                  <span>Abrir Chamado</span>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {tickets.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`w-full text-left p-4 hover:bg-muted/40 active:bg-muted/60 transition-colors cursor-pointer ${
                      selectedTicketId === t.id ? "bg-muted/60 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-xs text-foreground truncate pr-2">{t.subject}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatDate(t.updated_at)}
                      </span>
                      {t.status === "open" && (
                        <Badge variant="secondary" className="text-xs px-2 py-0">
                          Aguardando Loja
                        </Badge>
                      )}
                      {t.status === "pending" && (
                        <Badge variant="destructive" className="text-xs px-2 py-0 font-bold">
                          Sua Vez
                        </Badge>
                      )}
                      {t.status === "resolved" && (
                        <Badge variant="outline" className="text-xs px-2 py-0 text-emerald-600 border-emerald-500/30">
                          Resolvido
                        </Badge>
                      )}
                      {t.status === "closed" && (
                        <Badge variant="outline" className="text-xs px-2 py-0">
                          Encerrado
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
            <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
              <MessagesSquare className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold text-foreground">Selecione um Chamado</p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                Escolha um atendimento na lista à esquerda ou inicie um novo chamado para falar com o suporte.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b bg-card flex justify-between items-center gap-3">
                <div className="flex items-center gap-2 truncate">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden size-11 min-h-11 min-w-11"
                    onClick={() => setSelectedTicketId(null)}
                    aria-label="Voltar para lista de chamados"
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                  {loadingThread ? (
                    <div className="animate-pulse h-4 bg-muted rounded w-40"></div>
                  ) : (
                    <div>
                      <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                        {thread?.subject || selectedTicket?.subject}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {thread?.storeName || selectedTicket?.storeName || "Suporte Waesy"}
                      </span>
                    </div>
                  )}
                </div>

                {thread?.ticketStatus !== "closed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseTicket}
                    className="h-11 min-h-11 sm:h-8 px-3 text-xs text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                  >
                    Encerrar
                  </Button>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                {/* Indicativo de Segurança Visual */}
                <div className="flex justify-center my-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/40 text-xs text-muted-foreground select-none">
                    <Lock className="size-3 text-muted-foreground shrink-0" strokeWidth={1.75} />
                    <span>Mensagens protegidas com criptografia de ponta a ponta</span>
                  </div>
                </div>

                {thread?.messages
                  ?.filter((m: any) => !m.isInternal)
                  .map((m: any) => (
                    <div key={m.id} className={`flex ${m.isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs sm:max-w-md px-4 py-3 text-xs sm:text-sm leading-relaxed border-none ${
                          m.isMe
                            ? "bg-primary/10 text-foreground rounded-lg rounded-tr-xs"
                            : "bg-muted/70 text-foreground rounded-lg rounded-tl-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        <div className="flex items-center justify-between gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{m.isMe ? "Você" : m.senderName || "Atendimento"}</span>
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
                <div className="p-2 sm:p-3 border-t border-border/40 bg-background flex items-center gap-2">
                  <input
                    placeholder="Digite sua resposta..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend();
                    }}
                    className="flex-1 h-11 min-h-11 rounded-lg bg-muted/50 px-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/20 transition-all border border-border/40"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !message.trim()}
                    className="size-11 min-h-11 min-w-11 flex items-center justify-center text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 transition-opacity cursor-pointer shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
                    title="Enviar"
                    aria-label="Enviar mensagem"
                  >
                    <Send className="size-5" strokeWidth={1.75} />
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-muted/20 border-t border-border/30 text-center text-xs text-muted-foreground font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  <span>Este atendimento foi encerrado.</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Dialog de Novo Chamado ── */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent className="sm:max-w-md p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Abrir Novo Chamado</DialogTitle>
            <DialogDescription className="text-xs">
              Envie sua dúvida ou solicitação diretamente para a equipe de atendimento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="ticket-subject" className="text-xs font-semibold">
                Assunto do Chamado *
              </Label>
              <Input
                id="ticket-subject"
                required
                placeholder="Ex: Dúvida sobre pedido, entrega ou cancelamento"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="text-xs h-11 min-h-11 rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-category" className="text-xs font-semibold">
                Tipo de Atendimento
              </Label>
              <select
                id="ticket-category"
                value={newContextType}
                onChange={(e) => setNewContextType(e.target.value as any)}
                className="w-full h-11 min-h-11 px-3 rounded-lg border border-border bg-background text-xs"
              >
                <option value="general">Geral / Dúvidas</option>
                <option value="order">Referente a um Pedido</option>
                <option value="rma">Troca ou Devolução (RMA)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-message" className="text-xs font-semibold">
                Mensagem Inicial *
              </Label>
              <Textarea
                id="ticket-message"
                required
                rows={4}
                placeholder="Descreva detalhadamente o que aconteceu para agilizar o atendimento..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="text-xs resize-none rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsNewTicketOpen(false)}
                className="text-xs h-11 min-h-11 px-4 rounded-lg"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creatingTicket}
                className="font-bold text-xs h-11 min-h-11 px-4 rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
              >
                {creatingTicket ? "Abrindo Chamado..." : "Enviar Chamado"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
