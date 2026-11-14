import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Star,
  ShieldCheck,
  UserCheck,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/datetime";
import {
  getPublicTicketTracking,
  submitPublicTicketCsat,
} from "@/services/chat.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/chamado/$ticketId")({
  head: () => ({
    meta: [{ title: "Acompanhamento de Atendimento | Waesy" }],
  }),
  loader: async ({ params }) => {
    try {
      const tracking = await getPublicTicketTracking({
        data: { ticketId: params.ticketId },
      });
      return { tracking, error: null };
    } catch (err: any) {
      return {
        tracking: null,
        error: err?.message || "Não foi possível localizar este protocolo de atendimento.",
      };
    }
  },
  component: PublicTicketTrackingPage,
});

function PublicTicketTrackingPage() {
  const loaderData = (Route.useLoaderData() as any) || {};
  const { ticketId } = (Route.useParams() as any) || {};

  const [tracking, setTracking] = useState<any>(loaderData.tracking || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(loaderData.error || null);

  const [rating, setRating] = useState<number>(tracking?.csat?.rating || 5);
  const [problemResolved, setProblemResolved] = useState<boolean>(
    tracking?.csat?.problemResolved ?? true,
  );
  const [comment, setComment] = useState<string>(tracking?.csat?.comment || "");
  const [submittingCsat, setSubmittingCsat] = useState(false);

  const handleReload = async () => {
    setLoading(true);
    setError(null);
    try {
      const fresh = await getPublicTicketTracking({ data: { ticketId } });
      setTracking(fresh);
    } catch (err: any) {
      setError(err?.message || "Erro ao recarregar protocolo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCsat = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCsat(true);
    try {
      const res = await submitPublicTicketCsat({
        data: {
          ticketId,
          rating,
          comment: comment.trim() || undefined,
          problemResolved,
        },
      });
      setTracking((prev: any) =>
        prev
          ? {
              ...prev,
              status: res.reopened ? "action_required" : "resolved",
              csat: res.csat,
            }
          : prev,
      );
      toast.success(
        problemResolved
          ? "Avaliação registrada! Obrigado por validar o atendimento."
          : "Chamado reaberto! Nossa equipe já foi acionada.",
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar avaliação.");
    } finally {
      setSubmittingCsat(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        <div className="h-24 rounded-2xl bg-muted animate-pulse motion-reduce:animate-none" />
        <div className="h-64 rounded-2xl bg-muted animate-pulse motion-reduce:animate-none" />
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="size-12 rounded-2xl bg-muted text-foreground flex items-center justify-center mx-auto">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Protocolo não localizado</h1>
        <p className="text-xs text-muted-foreground">
          {error || "Verifique o link recebido no seu WhatsApp ou tente novamente."}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            onClick={handleReload}
            className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="size-4" />
            <span>Atualizar</span>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Link to="/conta/suporte">
              <ArrowLeft className="size-4 mr-1" />
              <span>Meus Chamados</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const steps = Array.isArray(tracking.steps) ? tracking.steps : [];
  const publicMessages = Array.isArray(tracking.publicMessages) ? tracking.publicMessages : [];

  return (
    <div className="max-w-3xl mx-auto px-0 sm:px-4 py-6 sm:py-10 pb-32 pb-safe space-y-6">
      {/* Cabeçalho do Protocolo */}
      <div className="rounded-2xl bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-mono font-bold px-3 py-1">
              {tracking.protocolCode}
            </Badge>
            <Badge
              variant={tracking.status === "resolved" ? "default" : "secondary"}
              className="text-xs font-bold px-3 py-1"
            >
              {tracking.status === "resolved"
                ? "Resolvido"
                : tracking.status === "action_required"
                ? "Reaberto / Em Revisão"
                : "Em Atendimento"}
            </Badge>
          </div>
          <Button
            type="button"
            onClick={handleReload}
            className="h-11 min-h-11 px-3 rounded-xl text-xs font-bold bg-muted text-foreground hover:bg-foreground hover:text-background gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="size-3.5" />
            <span>Atualizar Status</span>
          </Button>
        </div>

        <div className="space-y-1">
          <h1 className="text-lg sm:text-xl font-bold text-foreground">{tracking.title}</h1>
          {tracking.description && (
            <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line break-words">
              {tracking.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-xl bg-muted/50 p-3 space-y-1">
            <span className="text-xs text-muted-foreground block">Estabelecimento</span>
            <span className="text-xs font-bold text-foreground block truncate">
              {tracking.storeName}
            </span>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 space-y-1">
            <span className="text-xs text-muted-foreground block">Setor Responsável</span>
            <span className="text-xs font-bold text-foreground uppercase block truncate">
              {tracking.department}
            </span>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 space-y-1">
            <span className="text-xs text-muted-foreground block">Atendente</span>
            <span className="text-xs font-bold text-foreground flex items-center gap-1 truncate">
              <UserCheck className="size-3.5 text-primary shrink-0" />
              {tracking.assignedAgentName}
            </span>
          </div>
        </div>
      </div>

      {/* Linha do Tempo de Etapas do Ticket */}
      <div className="rounded-2xl bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <span>Linha do Tempo do Atendimento</span>
          </h2>
          <Badge variant="secondary" className="text-xs font-mono">
            {steps.length} {steps.length === 1 ? "etapa" : "etapas"}
          </Badge>
        </div>

        {steps.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Seu chamado foi recebido e está em processamento.
          </p>
        ) : (
          <div className="space-y-3">
            {steps.map((step: any, idx: number) => (
              <div
                key={step.id || idx}
                className="flex items-start gap-3 rounded-xl bg-muted/40 p-3"
              >
                <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-mono text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {step.created_at ? formatDate(step.created_at) : "Concluído"}
                  </p>
                </div>
                <CheckCircle2 className="size-4 text-primary shrink-0 mt-1" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico Público de Mensagens (Blindado contra Notas Internas) */}
      {publicMessages.length > 0 && (
        <div className="rounded-2xl bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              <span>Mensagens Registradas</span>
            </h2>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-primary" />
              Registro auditável
            </span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
            {publicMessages.map((msg: any) => (
              <div
                key={msg.id}
                className={`p-3 rounded-xl text-xs space-y-1 ${
                  msg.isStaff ? "bg-muted/60 text-foreground" : "bg-primary/10 text-foreground"
                }`}
              >
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-bold text-foreground">
                    {msg.isStaff ? tracking.assignedAgentName : "Você"}
                  </span>
                  <span className="font-mono">
                    {msg.createdAt ? formatDate(msg.createdAt) : ""}
                  </span>
                </div>
                <p className="whitespace-pre-line break-words">{msg.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Avaliação do Atendimento (CSAT) e Validação de Resolução */}
      <form onSubmit={handleSubmitCsat} className="rounded-2xl bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground">
            Avaliação do Atendimento & Resolução
          </h2>
          {tracking.csat?.submittedAt && (
            <Badge variant="secondary" className="text-xs">
              Avaliação Enviada ({tracking.csat.rating}/5)
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-foreground block">
            1. Seu problema ou solicitação foi resolvido?
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setProblemResolved(true)}
              className={`h-11 min-h-11 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                problemResolved
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <CheckCircle2 className="size-4" />
              <span>Sim, foi resolvido</span>
            </button>
            <button
              type="button"
              onClick={() => setProblemResolved(false)}
              className={`h-11 min-h-11 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                !problemResolved
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground"
              }`}
            >
              <AlertTriangle className="size-4" />
              <span>Não, preciso reabrir o chamado</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-foreground block">
            2. Qual nota você dá para o atendente ({tracking.assignedAgentName})?
          </span>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                aria-label={`Dar nota ${star} de 5`}
                className={`size-11 min-h-11 min-w-11 rounded-xl flex items-center justify-center font-bold text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  star <= rating
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Star className="size-4 fill-current" />
              </button>
            ))}
            <span className="text-xs font-bold text-foreground ml-2">
              {rating} de 5 estrelas
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="csat-comment" className="text-xs font-semibold text-foreground block">
            3. Comentário ou observação sobre o atendimento (opcional)
          </label>
          <Textarea
            id="csat-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Conte como foi sua experiência ou o que ainda precisa ser ajustado..."
            className="text-xs rounded-xl resize-none"
          />
        </div>

        <Button
          type="submit"
          disabled={submittingCsat}
          className="w-full h-11 min-h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
        >
          {submittingCsat
            ? "Registrando avaliação..."
            : problemResolved
            ? "Confirmar Resolução e Enviar Nota"
            : "Enviar Avaliação e Reabrir Chamado"}
        </Button>
      </form>
    </div>
  );
}
