import { createFileRoute, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Ticket,
  Store,
  Clock,
  Trophy,
  Loader2,
  Share2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAllPublicConcursos,
  participateInRaffle,
  type RaffleDTO,
} from "@/services/invite.functions";

export const Route = createFileRoute("/_store/concursos")({
  head: () => ({
    meta: [
      { title: "Sorteios & Prêmios | Comunidade Waesy" },
      {
        name: "description",
        content:
          "Participe dos sorteios e campanhas de prêmios promovidos pelas melhores lojas e empresas da região.",
      },
    ],
  }),
  loader: async () => {
    try {
      const concursos = await getAllPublicConcursos({ data: { filter: "all" } });
      return { concursos: concursos || [] };
    } catch (err) {
      console.error("[loader:_store.concursos] Loader error:", err);
      return { concursos: [] };
    }
  },
  component: ConcursosPublicPage,
});

function ConcursosPublicPage() {
  const { concursos: initialConcursos } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<"all" | "stores" | "official" | "completed">("all");
  const [concursos, setConcursos] = useState<RaffleDTO[]>(initialConcursos || []);
  const [isLoadingFilter, setIsLoadingFilter] = useState(false);

  // Modal de Emissão Rápida de Cupom
  const [selectedRaffle, setSelectedRaffle] = useState<RaffleDTO | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const handleShareConcurso = (raffle: RaffleDTO, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/concurso/${raffle.id}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success("Link do sorteio copiado!");
    }
    const text = encodeURIComponent(
      `Participe do sorteio da ${raffle.storeName}: "${raffle.title}"! Veja os detalhes: ${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleFilterChange = async (newFilter: "all" | "stores" | "official" | "completed") => {
    setFilter(newFilter);
    setIsLoadingFilter(true);
    try {
      const res = await getAllPublicConcursos({ data: { filter: newFilter } });
      setConcursos(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingFilter(false);
    }
  };

  const handleOpenRaffleModal = (raffle: RaffleDTO, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedRaffle(raffle);
    setAcceptedTerms(true);
  };

  const handleConfirmParticipation = async () => {
    if (!selectedRaffle) return;
    if (!acceptedTerms) {
      toast.error("É necessário ler e aceitar o regulamento do sorteio.");
      return;
    }

    setIsSubmittingTicket(true);
    try {
      const res = await participateInRaffle({
        data: {
          raffleId: selectedRaffle.id,
          acceptTerms: true,
        },
      });
      toast.success(res.message);
      setSelectedRaffle(null);
      // Recarrega lista
      const refreshed = await getAllPublicConcursos({ data: { filter } });
      setConcursos(refreshed || []);
      router.invalidate();
    } catch (err: any) {
      if (err?.message?.includes("login") || err?.message?.includes("autenticado")) {
        toast.info("Identifique-se para participar do sorteio.");
        navigate({
          to: "/entrar",
          search: { returnUrl: "/concursos" },
        });
        return;
      }
      toast.error(err?.message || "Erro ao emitir cupom do sorteio.");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-24 px-0 sm:px-4 md:px-0 pt-4 animate-in fade-in duration-150">
      {/* ── Top Header Silencioso & Limpo ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
            Comunidade & Prêmios
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Sorteios & Prêmios
          </h1>
        </div>

        <Button
          asChild
          variant="outline"
          className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
        >
          <Link to="/conta/concursos">
            <Ticket className="size-4 mr-1.5" />
            <span>Meus Cupons</span>
          </Link>
        </Button>
      </div>

      {/* ── Filtros de Descoberta (Tabs Limpas) ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <Button
          type="button"
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("all")}
          className="h-9 px-3.5 rounded-xl text-xs font-semibold cursor-pointer"
        >
          Todos os Sorteios
        </Button>
        <Button
          type="button"
          variant={filter === "stores" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("stores")}
          className="h-9 px-3.5 rounded-xl text-xs font-semibold cursor-pointer"
        >
          Lojas da Região
        </Button>
        <Button
          type="button"
          variant={filter === "official" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("official")}
          className="h-9 px-3.5 rounded-xl text-xs font-semibold cursor-pointer"
        >
          Oficiais Waesy
        </Button>
        <Button
          type="button"
          variant={filter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("completed")}
          className="h-9 px-3.5 rounded-xl text-xs font-semibold cursor-pointer"
        >
          Recém-Sorteados
        </Button>
      </div>

      {/* ── Grid de Sorteios ── */}
      {isLoadingFilter ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-xs font-mono">Carregando sorteios...</span>
        </div>
      ) : concursos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center space-y-3">
          <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Ticket className="size-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-base font-bold text-foreground">Nenhum sorteio encontrado</h2>
            <p className="text-xs text-muted-foreground">
              Não há sorteios abertos para este filtro no momento.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {concursos.map((raffle: RaffleDTO) => {
            const isCompleted = raffle.status === "completed";
            const drawDateFormatted = new Date(raffle.drawDate).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            const hasReachedLimit = raffle.myTicketsCount >= raffle.maxTicketsPerUser;

            return (
              <div
                key={raffle.id}
                className="rounded-2xl border border-border/80 bg-card overflow-hidden flex flex-col justify-between shadow-xs hover:border-foreground/30 transition-all group"
              >
                <div>
                  {/* Frame de Imagem no Aspecto Exato 16:9 */}
                  <div className="relative aspect-video w-full bg-muted overflow-hidden border-b border-border/50">
                    {raffle.imageUrl ? (
                      <img
                        src={raffle.imageUrl}
                        alt={raffle.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted/40">
                        <Ticket className="size-12 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Badges Flutuantes sobre a Imagem */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      {raffle.storeId ? (
                        <Link
                          to="/diretorio/$id"
                          params={{ id: raffle.storeId }}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/70 hover:bg-black/90 text-white text-[10px] backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                        >
                          <Store className="size-3" />
                          <span>{raffle.storeName}</span>
                        </Link>
                      ) : (
                        <Badge className="bg-black/70 text-white text-[10px] backdrop-blur-md border-0 gap-1 px-2.5 py-0.5">
                          <Store className="size-3" />
                          <span>{raffle.storeName}</span>
                        </Badge>
                      )}
                    </div>

                    <div className="absolute top-3 right-3">
                      <Badge
                        className={
                          isCompleted
                            ? "bg-black/70 text-white text-[10px] backdrop-blur-md border-0"
                            : "bg-emerald-600 text-white text-[10px] font-bold border-0"
                        }
                      >
                        {isCompleted ? "Encerrado" : "Sorteio Aberto"}
                      </Badge>
                    </div>
                  </div>

                  {/* Corpo do Card */}
                  <div className="p-5 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        Sorteio em: {drawDateFormatted}
                      </span>
                      <span>
                        {raffle.pointsCost > 0 ? `${raffle.pointsCost} pts` : "Gratuito"}
                      </span>
                    </div>

                    <Link to="/concurso/$id" params={{ id: raffle.id }}>
                      <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug hover:underline line-clamp-2">
                        {raffle.title}
                      </h3>
                    </Link>

                    {raffle.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {raffle.description}
                      </p>
                    )}

                    <div className="pt-1 text-xs font-mono text-muted-foreground">
                      <span>
                        Seus cupons:{" "}
                        <strong className="text-foreground">{raffle.myTicketsCount}</strong> de{" "}
                        {raffle.maxTicketsPerUser}
                      </span>
                    </div>

                    {isCompleted && raffle.winnerTicketNumber && (
                      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-center gap-3">
                        <Trophy className="size-5 text-amber-500 shrink-0" />
                        <div className="text-xs">
                          <span className="font-bold text-foreground block">
                            Cupom Vencedor #{raffle.winnerTicketNumber}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé de Ação */}
                <div className="p-4 sm:px-6 border-t border-border/40 flex items-center justify-between gap-2 bg-card/30">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleShareConcurso(raffle, e)}
                    className="h-10 px-3 rounded-xl text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Share2 className="size-3.5" />
                    <span>Compartilhar</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-10 px-3.5 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <Link to="/concurso/$id" params={{ id: raffle.id }}>
                        <span>Ver Detalhes</span>
                      </Link>
                    </Button>

                    {!isCompleted && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={hasReachedLimit}
                        onClick={(e) => handleOpenRaffleModal(raffle, e)}
                        className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground cursor-pointer"
                      >
                        <Ticket className="size-3.5" />
                        <span>{hasReachedLimit ? "Esgotado" : "Emitir Cupom"}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL CANÔNICO DE EMISSÃO RÁPIDA ── */}
      <Dialog open={!!selectedRaffle} onOpenChange={(open) => !open && setSelectedRaffle(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Emitir Cupom do Sorteio</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedRaffle?.title} • {selectedRaffle?.storeName}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-border/60 bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-2 max-h-52 overflow-y-auto leading-relaxed">
            <p className="font-semibold text-foreground">Regras de Participação:</p>
            <p>{selectedRaffle?.termsText}</p>
            <p className="font-mono text-[11px]">
              Limite: Até {selectedRaffle?.maxTicketsPerUser} cupons por participante.
            </p>
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <Checkbox
              id="terms-accept-modal"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            />
            <label
              htmlFor="terms-accept-modal"
              className="text-xs text-foreground leading-snug cursor-pointer select-none font-medium"
            >
              Concordo com o regulamento deste sorteio e confirmo minha participação.
            </label>
          </div>

          <DialogFooter className="pt-2 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedRaffle(null)}
              className="h-11 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!acceptedTerms || isSubmittingTicket}
              onClick={handleConfirmParticipation}
              className="h-11 px-5 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground cursor-pointer"
            >
              {isSubmittingTicket ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Ticket className="size-4" />
              )}
              <span>Emitir Cupom</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
