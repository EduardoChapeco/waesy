import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Ticket,
  Trophy,
  Sparkles,
  Store,
  Clock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getMyUserConcursos,
  getMyInviteOverview,
  type UserRaffleEntryDTO,
  type InviteOverviewDTO,
} from "@/services/invite.functions";

export const Route = createFileRoute("/_store/conta/concursos")({
  head: () => ({
    meta: [
      { title: "Meus Sorteios & Cupons | Minha Conta" },
      {
        name: "description",
        content: "Acompanhe seus cupons emitidos, status dos sorteios e prêmios conquistados.",
      },
    ],
  }),
  loader: async () => {
    try {
      const [entries, overview] = await Promise.all([
        getMyUserConcursos().catch(() => []),
        getMyInviteOverview().catch(() => null),
      ]);
      return { entries: entries || [], overview };
    } catch (err) {
      console.error("[loader:_store.conta.concursos]", err);
      return { entries: [], overview: null };
    }
  },
  component: ContaConcursosPage,
});

function ContaConcursosPage() {
  const { entries, overview } = ((Route.useLoaderData?.() as any) || {}) as {
    entries: UserRaffleEntryDTO[];
    overview: InviteOverviewDTO | null;
  };

  const totalTickets = entries.reduce((acc, curr) => acc + curr.myTickets.length, 0);
  const winningEntries = entries.filter((e) => e.isWinner);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 px-0 sm:px-6 py-2 sm:py-6 animate-in fade-in duration-150">
      {/* ── Top Header Clean ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
            Minha Conta • Prêmios
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Meus Sorteios & Cupons
          </h1>
        </div>

        <Button
          asChild
          className="h-10 px-4 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground"
        >
          <Link to="/concursos">
            <Ticket className="size-4" />
            <span>Ver Sorteios Abertos</span>
          </Link>
        </Button>
      </div>

      {/* ── Métricas do Participante ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-1">
          <span className="text-[11px] font-mono text-muted-foreground uppercase block">
            Cupons Ativos
          </span>
          <span className="text-2xl font-black font-mono text-foreground">{totalTickets}</span>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-1">
          <span className="text-[11px] font-mono text-muted-foreground uppercase block">
            Saldo de Pontos
          </span>
          <span className="text-2xl font-black font-mono text-amber-500">
            {overview?.totalPoints || 0} pts
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-border/70 bg-card p-4 space-y-1">
          <span className="text-[11px] font-mono text-muted-foreground uppercase block">
            Prêmios Conquistados
          </span>
          <span className="text-2xl font-black font-mono text-emerald-500">
            {winningEntries.length}
          </span>
        </div>
      </div>

      {/* ── ALERTA DE PRÊMIO CONQUISTADO ── */}
      {winningEntries.length > 0 && (
        <div className="rounded-3xl border-2 border-amber-500/50 bg-amber-500/10 p-5 space-y-2">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Trophy className="size-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Parabéns! Você foi contemplado em um sorteio!
              </h2>
              <p className="text-xs text-muted-foreground">
                Apresente seu cupom e documento na empresa organizadora para retirar seu prêmio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Lista de Cupons / Sorteios ── */}
      {entries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 bg-card p-12 text-center space-y-4">
          <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Ticket className="size-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-base font-bold text-foreground">Nenhum cupom emitido ainda</h2>
            <p className="text-xs text-muted-foreground">
              Participe dos sorteios abertos promovidos pelas empresas da região para concorrer a prêmios.
            </p>
          </div>
          <Button
            asChild
            className="h-11 px-6 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Link to="/concursos">Explorar Sorteios</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map(({ raffle, myTickets, isWinner }) => {
            const isCompleted = raffle.status === "completed";
            const drawDateFormatted = new Date(raffle.drawDate).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={raffle.id}
                className={`rounded-3xl border p-5 sm:p-6 space-y-4 transition-all ${
                  isWinner
                    ? "border-amber-500/60 bg-amber-500/5 shadow-sm"
                    : "border-border/70 bg-card"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={
                          isWinner
                            ? "bg-amber-500 text-amber-950 font-bold font-mono text-[10px] uppercase"
                            : isCompleted
                            ? "bg-muted text-muted-foreground text-[10px]"
                            : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold"
                        }
                      >
                        {isWinner ? "🏆 Premiado!" : isCompleted ? "Concluído" : "Em Andamento"}
                      </Badge>

                      <Badge variant="outline" className="text-[10px] font-medium gap-1">
                        <Store className="size-3" />
                        <span>{raffle.storeName}</span>
                      </Badge>
                    </div>

                    <Link to="/concurso/$id" params={{ id: raffle.id }}>
                      <h3 className="text-base sm:text-lg font-bold text-foreground hover:underline">
                        {raffle.title}
                      </h3>
                    </Link>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3.5" />
                      Sorteio: {drawDateFormatted}
                    </span>

                    <Button asChild variant="ghost" size="sm" className="h-8 px-2 rounded-lg text-xs">
                      <Link to="/concurso/$id" params={{ id: raffle.id }}>
                        <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Lista de Cupons Emitidos */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground block">
                    Seus Cupons ({myTickets.length} de {raffle.maxTicketsPerUser} permitidos):
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {myTickets.map((t) => {
                      const isWinningTicket =
                        isCompleted && raffle.winnerTicketNumber === t.ticketNumber;

                      return (
                        <div
                          key={t.id}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 ${
                            isWinningTicket
                              ? "bg-amber-500 text-amber-950 border-amber-400 font-black shadow-xs"
                              : "bg-muted/40 border-border text-foreground font-bold"
                          }`}
                        >
                          <Ticket className="size-3.5" />
                          <span>#{t.ticketNumber}</span>
                          {isWinningTicket && <span>★ Premiado</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Status do Ganhador */}
                {isCompleted && (
                  <div className="pt-2">
                    {isWinner ? (
                      <div className="rounded-2xl bg-amber-500/20 border border-amber-500/30 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                          <CheckCircle2 className="size-4" />
                          <span>Seu cupom #{raffle.winnerTicketNumber} foi o vencedor!</span>
                        </div>
                        <p className="text-xs text-foreground">
                          Apresente este comprovante e seu documento de identificação na empresa para retirar seu prêmio.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground flex items-center justify-between">
                        <span>Cupom vencedor: <strong>#{raffle.winnerTicketNumber}</strong></span>
                        <span className="font-mono text-[11px]">Sorteio finalizado</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
