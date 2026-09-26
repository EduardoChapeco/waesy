import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Ticket,
  Store,
  Clock,
  Trophy,
  ArrowLeft,
  Share2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getPublicConcursoById,
  participateInRaffle,
  type RaffleDTO,
} from "@/services/invite.functions";

export const Route = createFileRoute("/_store/concurso/$id")({
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.raffle?.title
          ? `${loaderData.raffle.title} | Sorteios Waesy`
          : "Sorteio | Waesy",
      },
      {
        name: "description",
        content:
          loaderData?.raffle?.description?.slice(0, 160) ||
          "Participe do sorteio de prêmios promovido pelas melhores empresas da região.",
      },
    ],
  }),
  loader: async ({ params }: { params: { id: string } }) => {
    try {
      const raffle = await getPublicConcursoById({ data: { raffleId: params.id } });
      return { raffle };
    } catch (err) {
      console.error("[loader:_store.concurso.$id]", err);
      return { raffle: null };
    }
  },
  component: ConcursoDetailPage,
});

function ConcursoDetailPage() {
  const { raffle: initialRaffle } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();

  const [raffle, setRaffle] = useState<RaffleDTO | null>(initialRaffle);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!raffle) {
    return (
      <div className="w-full max-w-2xl mx-auto py-20 px-4 text-center space-y-4">
        <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <Ticket className="size-8" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Sorteio não encontrado</h1>
        <p className="text-xs text-muted-foreground">
          Este sorteio pode ter sido encerrado ou o link é inválido.
        </p>
        <Button asChild variant="outline" className="rounded-xl h-11 px-5 text-xs font-semibold">
          <Link to="/concursos">Voltar para Todos os Sorteios</Link>
        </Button>
      </div>
    );
  }

  const isCompleted = raffle.status === "completed";
  const drawDateFormatted = new Date(raffle.drawDate).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const hasReachedLimit = raffle.myTicketsCount >= raffle.maxTicketsPerUser;

  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success("Link do sorteio copiado!");
    }
    const text = encodeURIComponent(
      `Participe do sorteio da ${raffle.storeName}: "${raffle.title}"! Veja os detalhes: ${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleEmitTicket = async () => {
    if (!acceptedTerms) {
      toast.error("É necessário ler e aceitar o regulamento do sorteio.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await participateInRaffle({
        data: {
          raffleId: raffle.id,
          acceptTerms: true,
        },
      });
      toast.success(res.message);
      setIsConfirmModalOpen(false);

      // Recarrega dados atualizados
      const updated = await getPublicConcursoById({ data: { raffleId: raffle.id } });
      if (updated) setRaffle(updated);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao emitir cupom.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-28 px-0 sm:px-4 md:px-0 pt-4 animate-in fade-in duration-150">
      {/* ── Voltar ── */}
      <div className="flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="size-11 sm:size-auto rounded-full sm:rounded-xl p-0 sm:px-3 text-xs font-semibold gap-1.5 h-11 text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all"
          aria-label="Todos os Sorteios"
        >
          <Link to="/concursos">
            <ArrowLeft className="size-5 sm:size-4" />
            <span className="hidden sm:inline">Todos os Sorteios</span>
          </Link>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="rounded-xl text-xs font-semibold gap-1.5 h-11 px-3.5"
        >
          <Share2 className="size-4" />
          <span>Compartilhar</span>
        </Button>
      </div>

      {/* ── Imagem Principal no Aspecto Exato (16:9) ── */}
      <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-muted border border-border/70 shadow-sm">
        {raffle.imageUrl ? (
          <img
            src={raffle.imageUrl}
            alt={raffle.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/40">
            <Ticket className="size-16 text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute top-3.5 left-3.5 flex items-center gap-2 flex-wrap">
          {raffle.storeId ? (
            <Link
              to="/diretorio/$id"
              params={{ id: raffle.storeId }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 hover:bg-black/90 text-white text-[11px] backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            >
              <Store className="size-3" />
              <span>{raffle.storeName}</span>
            </Link>
          ) : (
            <Badge className="bg-black/70 text-white text-[11px] backdrop-blur-md border-0 gap-1.5 px-3 py-1">
              <Store className="size-3" />
              <span>{raffle.storeName || "Comunidade Waesy"}</span>
            </Badge>
          )}
        </div>

        <div className="absolute top-3.5 right-3.5">
          <Badge
            className={
              isCompleted
                ? "bg-black/70 text-white text-[11px] backdrop-blur-md border-0"
                : "bg-emerald-600 text-white text-[11px] font-bold border-0"
            }
          >
            {isCompleted ? "Sorteio Encerrado" : "Aberto para Participação"}
          </Badge>
        </div>
      </div>

      {/* ── Título & Identificação ── */}
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-snug">
          {raffle.title}
        </h1>

        {raffle.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {raffle.description}
          </p>
        )}
      </div>

      {/* ── Métricas & Dados Chave ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1">
          <span className="text-[10px] uppercase font-mono text-muted-foreground block">
            Data do Sorteio
          </span>
          <span className="text-xs font-bold text-foreground block">
            {drawDateFormatted}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1">
          <span className="text-[10px] uppercase font-mono text-muted-foreground block">
            Participação
          </span>
          <span className="text-xs font-bold text-foreground block">
            {raffle.pointsCost > 0
              ? `${raffle.pointsCost} Pontos de Fidelidade`
              : "100% Gratuita"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1">
          <span className="text-[10px] uppercase font-mono text-muted-foreground block">
            Seus Cupons
          </span>
          <span className="text-xs font-bold text-foreground block">
            {raffle.myTicketsCount} de {raffle.maxTicketsPerUser} permitidos
          </span>
        </div>
      </div>

      {/* ── Vencedor (Caso Concluído) ── */}
      {isCompleted && raffle.winnerTicketNumber && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-center gap-3.5">
          <Trophy className="size-6 text-amber-500 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-foreground block text-sm">
              Cupom Vencedor #{raffle.winnerTicketNumber}
            </span>
            <span className="text-muted-foreground">
              Este sorteio foi finalizado e o prêmio foi conferido pela empresa organizadora.
            </span>
          </div>
        </div>
      )}

      {/* ── Regulamento do Sorteio ── */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
          Regulamento do Sorteio
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
          {raffle.termsText}
        </p>
      </div>

      {/* ── BARRA FIXA DE AÇÃO NO TERÇO INFERIOR (APPLE HIG & THUMB ZONE) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="hidden sm:block text-xs text-muted-foreground">
            {hasReachedLimit ? (
              <span className="text-amber-600 font-semibold">
                Você já atingiu o limite máximo de {raffle.maxTicketsPerUser} cupons.
              </span>
            ) : (
              <span>
                Você possui <strong>{raffle.myTicketsCount}</strong> cupom(ns) emitido(s).
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isCompleted && (
              <Button
                type="button"
                disabled={hasReachedLimit}
                onClick={() => setIsConfirmModalOpen(true)}
                className="h-11 px-6 rounded-xl text-xs font-bold w-full sm:w-auto gap-2 bg-primary text-primary-foreground cursor-pointer"
              >
                <Ticket className="size-4" />
                <span>
                  {hasReachedLimit ? "Limite de Cupons Atingido" : "Emitir Meu Cupom"}
                </span>
              </Button>
            )}

            <Button
              asChild
              variant="outline"
              className="h-11 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Link to="/conta/concursos">Ver Meus Cupons</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── MODAL CANÔNICO DE EMISSÃO COM 1 TOQUE ── */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Emitir Cupom do Sorteio</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {raffle.title} • {raffle.storeName}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">Termos e Condições:</p>
            <p className="line-clamp-3">{raffle.termsText}</p>
            <p className="text-[11px] font-mono">
              Data do Sorteio: <strong>{drawDateFormatted}</strong>
            </p>
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <Checkbox
              id="accept-terms-concurso"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            />
            <label
              htmlFor="accept-terms-concurso"
              className="text-xs text-foreground leading-snug cursor-pointer select-none font-medium"
            >
              Concordo com o regulamento deste sorteio e confirmo minha participação.
            </label>
          </div>

          <DialogFooter className="pt-2 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmModalOpen(false)}
              className="h-11 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!acceptedTerms || isSubmitting}
              onClick={handleEmitTicket}
              className="h-11 px-5 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Ticket className="size-4" />
              )}
              <span>Confirmar Participação</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
