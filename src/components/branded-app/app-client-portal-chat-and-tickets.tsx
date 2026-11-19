import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChatCircleDots,
  PaperPlaneRight,
  Lifebuoy,
  Plus,
  ShieldCheck,
  Clock,
  CheckCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/state/states";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getScopedAppChatMessagesFn,
  sendScopedAppChatMessageFn,
  listClientAppTicketsFn,
  createClientAppTicketFn,
} from "@/services/branded-app-portal-actions.functions";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export interface AppClientPortalChatViewProps {
  storeId: string;
  storeName: string;
  accessToken?: string | null;
}

export function AppClientPortalChatView({
  storeId,
  storeName,
  accessToken,
}: AppClientPortalChatViewProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["branded-app-direct-chat", storeId, accessToken || "session"],
    queryFn: () =>
      getScopedAppChatMessagesFn({
        data: { storeId, accessToken: accessToken || null },
      }),
    refetchInterval: 12000,
  });

  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: (text: string) =>
      sendScopedAppChatMessageFn({
        data: {
          storeId,
          accessToken: accessToken || null,
          message: text,
        },
      }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({
        queryKey: ["branded-app-direct-chat", storeId, accessToken || "session"],
      });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a mensagem.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draft.trim();
    if (!clean || isSending) return;
    sendMessage(clean);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Não foi possível carregar o chat direto"
        description="Tente atualizar a conversa com a empresa."
        onRetry={() => refetch()}
      />
    );
  }

  const messages = data?.messages || [];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ChatCircleDots className="size-5" weight="bold" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-foreground truncate">
              Atendimento Direto · {storeName}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              Canal exclusivo e criptografado com a equipe da loja
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 shrink-0 text-xs">
          <ShieldCheck className="size-3.5 text-primary" weight="bold" />
          <span>Isolado</span>
        </Badge>
      </div>

      <div className="p-4 space-y-3 max-h-96 min-h-64 overflow-y-auto bg-background/50">
        {messages.length === 0 ? (
          <EmptyState
            title={`Inicie uma conversa com ${storeName}`}
            description="Envie sua dúvida sobre pedidos, roteiros, reservas ou pagamentos diretamente para a equipe."
          />
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col max-w-4/5 rounded-2xl px-4 py-2 text-xs space-y-1",
                msg.is_staff_reply
                  ? "self-start bg-muted text-foreground rounded-tl-xs"
                  : "self-end ml-auto bg-primary text-primary-foreground rounded-tr-xs",
              )}
            >
              <span className="font-bold opacity-80">
                {msg.is_staff_reply ? storeName : "Você"}
              </span>
              <p className="whitespace-pre-line break-words leading-relaxed">{msg.message}</p>
              <span className="text-xs opacity-70 font-mono self-end">
                {formatDate(msg.created_at)}
              </span>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-border bg-card flex items-center gap-2"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Escreva uma mensagem para ${storeName}...`}
          aria-label="Mensagem para a loja"
          className="h-11 min-h-11 rounded-xl text-xs flex-1"
        />
        <Button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold gap-2 shrink-0 cursor-pointer"
        >
          <PaperPlaneRight className="size-4" weight="bold" />
          <span>{isSending ? "Enviando..." : "Enviar"}</span>
        </Button>
      </form>
    </div>
  );
}

export interface AppClientPortalTicketsViewProps {
  storeId: string;
  storeName: string;
  accessToken?: string | null;
  orders?: Array<{ id: string; order_number?: string | null }>;
}

const TICKET_TYPE_LABELS: Record<string, string> = {
  return_exchange: "Troca ou Devolução",
  missing_item: "Item Faltante / Divergência",
  defect_complaint: "Problema ou Qualidade",
  delivery_issue: "Prazo / Entrega / Embarque",
  billing_pix: "Pagamento / PIX / Parcela",
  other: "Outras Solicitações",
};

export function AppClientPortalTicketsView({
  storeId,
  storeName,
  accessToken,
  orders = [],
}: AppClientPortalTicketsViewProps) {
  const queryClient = useQueryClient();
  const [showNewForm, setShowNewForm] = useState(false);
  const [ticketType, setTicketType] = useState<string>("other");
  const [orderId, setOrderId] = useState<string>("__none__");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: tickets = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["branded-app-support-tickets", storeId, accessToken || "session"],
    queryFn: () =>
      listClientAppTicketsFn({
        data: { storeId, accessToken: accessToken || null },
      }),
  });

  const { mutate: createTicket, isPending: isCreating } = useMutation({
    mutationFn: () =>
      createClientAppTicketFn({
        data: {
          storeId,
          accessToken: accessToken || null,
          ticketType: ticketType as any,
          title: title.trim(),
          description: description.trim(),
          orderId: orderId !== "__none__" ? orderId : null,
          priority: "normal",
        },
      }),
    onSuccess: () => {
      toast.success("Chamado registrado! A equipe da empresa responderá em breve.");
      setTitle("");
      setDescription("");
      setShowNewForm(false);
      queryClient.invalidateQueries({
        queryKey: ["branded-app-support-tickets", storeId, accessToken || "session"],
      });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar chamado.");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3 || description.trim().length < 5) {
      toast.error("Preencha o assunto e descreva sua solicitação.");
      return;
    }
    createTicket();
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Erro ao carregar chamados"
        description="Não foi possível consultar seus chamados nesta loja."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <Lifebuoy className="size-4 text-primary" weight="bold" />
            <span>Chamados e Suporte · {storeName}</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Abra solicitações de suporte, trocas ou dúvidas financeiras vinculadas ao seu atendimento.
          </p>
        </div>
        <Button
          type="button"
          variant={showNewForm ? "outline" : "default"}
          onClick={() => setShowNewForm((v) => !v)}
          className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
        >
          <Plus className="size-4" weight="bold" />
          <span>{showNewForm ? "Cancelar" : "Novo Chamado"}</span>
        </Button>
      </div>

      {showNewForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-border bg-card p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Motivo do Chamado</Label>
              <Select value={ticketType} onValueChange={setTicketType}>
                <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TICKET_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {orders.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs font-bold">Pedido Relacionado (Opcional)</Label>
                <Select value={orderId} onValueChange={setOrderId}>
                  <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                    <SelectValue placeholder="Sem pedido específico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem pedido específico</SelectItem>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        Pedido #{o.order_number || o.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Assunto Resumido</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Dúvida sobre embarque ou comprovante PIX"
              className="h-11 min-h-11 rounded-xl text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Descrição Detalhada</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Explique como a equipe pode ajudar..."
              className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Button
            type="submit"
            disabled={isCreating}
            className="h-11 min-h-11 px-5 rounded-xl text-xs font-bold cursor-pointer"
          >
            {isCreating ? "Registrando..." : "Enviar Chamado"}
          </Button>
        </form>
      )}

      {tickets.length === 0 ? (
        <EmptyState
          title="Nenhum chamado aberto"
          description="Você não possui chamados pendentes com esta empresa."
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <article
              key={t.id}
              className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {TICKET_TYPE_LABELS[t.ticket_type] || "Suporte"}
                  </Badge>
                  <span className="text-sm font-extrabold text-foreground">{t.title}</span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-line break-words">
                  {t.description}
                </p>
                <span className="text-xs font-mono text-muted-foreground block">
                  Aberto em {formatDate(t.created_at)}
                </span>
              </div>
              <Badge
                variant={t.status === "resolved" ? "default" : "secondary"}
                className="gap-1 self-start sm:self-center shrink-0"
              >
                {t.status === "resolved" ? (
                  <CheckCircle className="size-3.5" weight="bold" />
                ) : (
                  <Clock className="size-3.5" weight="bold" />
                )}
                <span>{t.status === "resolved" ? "Resolvido" : "Em Atendimento"}</span>
              </Badge>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
