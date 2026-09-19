import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarBlank,
  Ticket,
  WarningCircle,
  ArrowLeft,
  MapPin,
  ArrowSquareOut,
  Users,
  CheckCircle,
  Star,
  XCircle,
  Newspaper,
  PencilSimple,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { addToCart } from "@/services/cart.functions";
import { getEventWithLots } from "@/services/events.functions";
import {
  getEventRsvpStatus,
  toggleEventRsvpAction,
} from "@/services/events/external-events.functions";
import { getIdentity } from "@/services/identity.functions";
import { ContentActionsMenu } from "@/components/common/content-actions-menu";

export const Route = createFileRoute("/_store/evento/$id")({
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.event?.title
          ? `${loaderData.event.title} - Ingressos | Waesy`
          : "Evento | Waesy",
      },
      {
        name: "description",
        content:
          loaderData?.event?.description?.slice(0, 160) || "Evento cultural na Comunidade Waesy.",
      },
    ],
  }),
  loader: async ({ params }: { params: { id: string } }) => {
    try {
      const [eventData, rsvpRes, identityRes] = await Promise.all([
        getEventWithLots({ data: { eventId: params.id } }).catch(() => null),
        getEventRsvpStatus({ data: { event_id: params.id } }).catch(() => ({ user_status: null })),
        getIdentity().catch(() => null),
      ]);

      const event = eventData?.event;
      const isOwner = Boolean(
        identityRes?.id &&
          (identityRes.id === event?.store_id ||
            identityRes.store_id === event?.store_id ||
            identityRes.role === "admin")
      );

      return {
        event,
        lots: eventData?.lots || [],
        linkedNews: eventData?.linkedNews || null,
        userRsvp: rsvpRes?.user_status || null,
        isOwner,
      };
    } catch (err) {
      console.error("[loader:_store.evento.$id] Unhandled loader error:", err);
      return {} as any;
    }
  },
  component: EventDetailPage,
});

function EventDetailPage() {
  const data = Route.useLoaderData();
  const event = data?.event;
  const lots = data?.lots || [];
  const linkedNews = data?.linkedNews;
  const isOwner = data?.isOwner || false;
  const router = useRouter();

  const [userRsvp, setUserRsvp] = useState<string | null>(data?.userRsvp || null);
  const [rsvpCounts, setRsvpCounts] = useState({
    going: Number(event?.rsvp_going_count || 0),
    interested: Number(event?.rsvp_interested_count || 0),
    not_going: Number(event?.rsvp_not_going_count || 0),
  });
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);

  if (!event) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-2">
          <WarningCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Evento não encontrado</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          O evento que você procura não existe ou foi cancelado pelo organizador.
        </p>
        <Button asChild className="rounded-xl font-bold" variant="outline">
          <Link to="/agenda">
            <ArrowLeft size={16} weight="bold" className="mr-2" />
            Voltar para Agenda
          </Link>
        </Button>
      </div>
    );
  }

  const handleBuyTicket = async (lot: any) => {
    try {
      await addToCart({
        data: {
          variantId: lot.id,
          quantity: 1,
        },
      });
      toast.success("Ingresso adicionado ao carrinho!");
      router.navigate({ to: "/carrinho" });
    } catch (err: unknown) {
      toast.error(
        (err instanceof Error ? err.message : String(err)) || "Erro ao adicionar ingresso."
      );
    }
  };

  const handleToggleRsvp = async (status: "going" | "interested" | "not_going") => {
    if (isSubmittingRsvp) return;
    setIsSubmittingRsvp(true);

    const prevUserStatus = userRsvp;
    const prevCounts = { ...rsvpCounts };

    // Atualização otimista
    const isDeselecting = prevUserStatus === status;
    const nextStatus = isDeselecting ? null : status;
    setUserRsvp(nextStatus);

    setRsvpCounts((prev) => {
      const updated = { ...prev };
      if (prevUserStatus === "going") updated.going = Math.max(0, updated.going - 1);
      if (prevUserStatus === "interested") updated.interested = Math.max(0, updated.interested - 1);
      if (prevUserStatus === "not_going") updated.not_going = Math.max(0, updated.not_going - 1);

      if (!isDeselecting) {
        if (status === "going") updated.going += 1;
        if (status === "interested") updated.interested += 1;
        if (status === "not_going") updated.not_going += 1;
      }
      return updated;
    });

    try {
      // Fingerprint de fallback para usuários anônimos
      let sessionFp = typeof window !== "undefined" ? localStorage.getItem("waesy_fp") : null;
      if (!sessionFp && typeof window !== "undefined") {
        sessionFp = `fp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
        localStorage.setItem("waesy_fp", sessionFp);
      }

      const res: any = await toggleEventRsvpAction({
        data: {
          event_id: event.id,
          status,
          session_fingerprint: sessionFp || undefined,
        },
      });

      if (res?.success) {
        setUserRsvp(res.user_status);
        setRsvpCounts({
          going: res.going_count ?? rsvpCounts.going,
          interested: res.interested_count ?? rsvpCounts.interested,
          not_going: res.not_going_count ?? rsvpCounts.not_going,
        });

        if (res.user_status === "going") {
          toast.success("Presença confirmada! Nos vemos no evento.");
        } else if (res.user_status === "interested") {
          toast.info("Interesse registrado. Avisaremos sobre novidades.");
        } else {
          toast.info("Status de presença atualizado.");
        }
      }
    } catch (err: any) {
      // Rollback em caso de erro
      setUserRsvp(prevUserStatus);
      setRsvpCounts(prevCounts);
      toast.error(err.message || "Erro ao atualizar presença.");
    } finally {
      setIsSubmittingRsvp(false);
    }
  };

  const activeLots = lots.filter((l: any) => l.status === "active");

  return (
    <div className="w-full max-w-6xl mx-auto px-0 sm:px-4 md:px-6 py-0 sm:py-3 space-y-6 pb-28 lg:pb-12 font-sans">
      {/* ── Rule 23: Owner Edit Mode Banner ── */}
      {isOwner && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-amber-500" />
            <span className="font-semibold">Modo Organizador: Você é o responsável por este evento.</span>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-7 text-[11px] font-bold rounded-xl border-amber-500/40 hover:bg-amber-500/15"
          >
            <Link to="/workspace/eventos">
              <PencilSimple size={14} className="mr-1.5" />
              Painel de Eventos
            </Link>
          </Button>
        </div>
      )}

      {/* ── Breadcrumb / Voltar ── */}
      <div className="flex items-center justify-between px-4 sm:px-0">
        <Link
          to="/agenda"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft size={16} weight="bold" className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Voltar para Agenda</span>
        </Link>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 text-xs font-bold rounded-xl gap-1.5"
            >
              <Link to="/workspace/eventos">
                <PencilSimple size={14} weight="bold" />
                <span>Editar Evento</span>
              </Link>
            </Button>
          )}
          <ContentActionsMenu
            entityType="event"
            entityId={event.id}
            isOwner={isOwner}
            canonicalUrl={`/evento/${event.id}`}
            title={event.title}
            description={event.description || ""}
            mediaUrl={event.cover_image}
          />
        </div>
      </div>

      {/* ── Grid Principal Split: Esquerda (Mídia & Info) / Direita (Ingressos & RSVP) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda: Banner, Detalhes & Cobertura Cruzada */}
        <div className="lg:col-span-7 space-y-6">
          {event.cover_image && (
            <div className="w-full aspect-video md:aspect-[16/9] overflow-hidden rounded-none sm:rounded-2xl border-y sm:border border-border/60 bg-muted shadow-xs relative">
              <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
              {event.is_external && (
                <div className="absolute top-3 left-3">
                  <Badge className="bg-background/90 backdrop-blur-md text-foreground text-[11px] font-bold border border-border/50 uppercase tracking-wider shadow-xs">
                    {event.external_source ? `Via ${event.external_source}` : "Evento Externo"}
                  </Badge>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4 px-4 sm:px-0">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="px-3 py-1 text-xs font-semibold rounded-xl gap-1.5"
              >
                <CalendarBlank size={14} weight="bold" />
                {new Date(event.event_date).toLocaleString("pt-BR", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </Badge>
              {(event.venue || event.location || event.location_name) && (
                <Badge
                  variant="outline"
                  className="px-3 py-1 text-xs font-semibold rounded-xl gap-1.5"
                >
                  <MapPin size={14} weight="bold" className="text-foreground" />
                  {event.venue || event.location || event.location_name}
                </Badge>
              )}
              {event.city && (
                <Badge variant="outline" className="px-3 py-1 text-xs font-semibold rounded-xl text-muted-foreground">
                  {event.city}{event.state ? ` - ${event.state}` : ""}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {event.title}
            </h1>

            {event.description && (
              <div className="pt-2 border-t border-border/40 space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sobre o Evento</h2>
                <p className="text-sm sm:text-base text-foreground/85 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>
            )}

            {/* ── Cobertura Jornalística Oficial Vinculada ── */}
            {linkedNews && (
              <div className="pt-4 border-t border-border/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Newspaper size={18} weight="bold" className="text-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cobertura Jornalística Oficial
                  </h2>
                </div>

                <Link
                  to="/noticias/$slug"
                  params={{ slug: linkedNews.slug }}
                  className="block group p-4 rounded-none sm:rounded-2xl border-y sm:border border-border/80 bg-card hover:border-primary/50 transition-all shadow-xs"
                >
                  <div className="flex gap-4 items-center">
                    {linkedNews.cover_media_url && (
                      <div className="size-20 shrink-0 rounded-xl overflow-hidden bg-muted border border-border/40">
                        <img
                          src={linkedNews.cover_media_url}
                          alt={linkedNews.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="space-y-1 min-w-0">
                      {linkedNews.kicker && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                          {linkedNews.kicker}
                        </span>
                      )}
                      <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {linkedNews.title}
                      </h3>
                      {linkedNews.subtitle && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {linkedNews.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Ingressos & RSVP (Sticky no Desktop) */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
          {/* ── Card 1: Confirmação de Presença (RSVP) ── */}
          <div className="p-5 sm:p-6 rounded-none sm:rounded-2xl border-y sm:border border-border/80 bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Users size={18} weight="bold" className="text-primary" />
                <h3 className="text-sm font-bold text-foreground">Confirmação de Presença</h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {rsvpCounts.going} {rsvpCounts.going === 1 ? "confirmado" : "confirmados"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleToggleRsvp("going")}
                disabled={isSubmittingRsvp}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all min-h-[58px] ${
                  userRsvp === "going"
                    ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                    : "bg-background border-border/80 hover:border-border text-foreground hover:bg-muted/40"
                }`}
              >
                <CheckCircle
                  size={20}
                  weight={userRsvp === "going" ? "fill" : "regular"}
                  className={userRsvp === "going" ? "text-primary" : "text-muted-foreground"}
                />
                <span className="text-xs mt-1">Eu vou</span>
                <span className="text-[10px] text-muted-foreground font-mono">{rsvpCounts.going}</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleRsvp("interested")}
                disabled={isSubmittingRsvp}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all min-h-[58px] ${
                  userRsvp === "interested"
                    ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold shadow-xs"
                    : "bg-background border-border/80 hover:border-border text-foreground hover:bg-muted/40"
                }`}
              >
                <Star
                  size={20}
                  weight={userRsvp === "interested" ? "fill" : "regular"}
                  className={userRsvp === "interested" ? "text-amber-500" : "text-muted-foreground"}
                />
                <span className="text-xs mt-1">Interesse</span>
                <span className="text-[10px] text-muted-foreground font-mono">{rsvpCounts.interested}</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleRsvp("not_going")}
                disabled={isSubmittingRsvp}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all min-h-[58px] ${
                  userRsvp === "not_going"
                    ? "bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-400 font-bold shadow-xs"
                    : "bg-background border-border/80 hover:border-border text-foreground hover:bg-muted/40"
                }`}
              >
                <XCircle
                  size={20}
                  weight={userRsvp === "not_going" ? "fill" : "regular"}
                  className={userRsvp === "not_going" ? "text-rose-500" : "text-muted-foreground"}
                />
                <span className="text-xs mt-1">Não vou</span>
                <span className="text-[10px] text-muted-foreground font-mono">{rsvpCounts.not_going}</span>
              </button>
            </div>
          </div>

          {/* ── Card 2: Ingressos ── */}
          <div className="p-5 sm:p-6 rounded-none sm:rounded-2xl border-y sm:border border-border/80 bg-card shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
              <Ticket size={20} weight="bold" className="text-primary" />
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                {event.is_external || event.is_external_ticket ? "Ingressos Oficiais" : "Ingressos Disponíveis"}
              </h2>
              {(event.is_external || event.is_external_ticket) && (
                <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 bg-amber-50 dark:bg-amber-950/40">
                  {event.external_source ? `Oficial ${event.external_source}` : "Link Externo"}
                </Badge>
              )}
            </div>

            {/* Caso evento com link externo */}
            {(event.is_external || event.is_external_ticket) && event.external_ticket_url ? (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Os ingressos para este evento são comercializados diretamente pela plataforma oficial{" "}
                  <span className="font-semibold text-foreground capitalize">{event.external_source || "do organizador"}</span>.
                </p>
                <a
                  href={event.external_ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-foreground text-background font-bold text-sm hover:bg-foreground/90 transition-colors"
                >
                  <Ticket size={18} weight="bold" />
                  Comprar na Plataforma Oficial
                  <ArrowSquareOut size={16} weight="bold" />
                </a>
                <p className="text-[11px] text-muted-foreground text-center">
                  Você será redirecionado com segurança para o site oficial
                </p>
              </div>
            ) : activeLots.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-muted/30 border border-border/40">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Nenhum lote de ingressos disponível no momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeLots.map((lot: any) => {
                  const available = lot.capacity - (lot.sold_count + lot.reserved_count);
                  const isSoldOut = available <= 0;

                  return (
                    <div
                      key={lot.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isSoldOut
                          ? "border-border/40 bg-muted/20 opacity-70"
                          : "border-border/80 bg-background hover:border-primary/50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <div>
                          <h3 className="font-bold text-sm sm:text-base text-foreground">{lot.name}</h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {isSoldOut ? "Esgotado" : `Restam ${available} ingressos`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg sm:text-xl font-black text-primary">
                            {formatMoney(lot.price_cents)}
                          </p>
                        </div>
                      </div>

                      <Button
                        className="w-full font-bold h-11 text-xs rounded-xl"
                        variant={isSoldOut ? "secondary" : "default"}
                        disabled={isSoldOut}
                        onClick={() => handleBuyTicket(lot)}
                      >
                        {isSoldOut ? "Esgotado" : "Comprar Ingresso"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Organizer Info */}
            {event.organizer_name && (
              <div className="pt-3 border-t border-border/40 flex items-center gap-2">
                <Users size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Organizado por <span className="font-semibold text-foreground">{event.organizer_name}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ── Mobile Sticky Action Bar (Thumb Zone) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/60 shadow-lg px-4 py-3 flex items-center justify-between gap-3 select-none pb-safe">
        <div>
          <span className="text-[10px] text-muted-foreground font-semibold block uppercase tracking-wider font-mono">
            {event.is_external || event.is_external_ticket ? "Ingressos" : "A partir de"}
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-foreground">
            {activeLots.length > 0
              ? formatMoney(Math.min(...activeLots.map((l: any) => l.price_cents)))
              : event.is_external_ticket
              ? "Plataforma Oficial"
              : "Consulte"}
          </span>
        </div>

        {(event.is_external || event.is_external_ticket) && event.external_ticket_url ? (
          <Button asChild size="lg" className="h-11 px-5 rounded-xl font-bold text-xs bg-foreground text-background gap-1.5 cursor-pointer shadow-sm">
            <a href={event.external_ticket_url} target="_blank" rel="noopener noreferrer">
              <Ticket size={16} weight="bold" />
              <span>Ver Ingressos</span>
              <ArrowSquareOut size={14} weight="bold" />
            </a>
          </Button>
        ) : activeLots.length > 0 ? (
          <Button
            size="lg"
            className="h-11 px-6 rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1.5 cursor-pointer shadow-sm"
            onClick={() => handleBuyTicket(activeLots[0])}
          >
            <Ticket size={16} weight="bold" />
            <span>Comprar Ingresso</span>
          </Button>
        ) : (
          <Button
            size="lg"
            variant="outline"
            className="h-11 px-5 rounded-xl font-bold text-xs border-border gap-1.5 cursor-pointer"
            onClick={() => handleToggleRsvp("going")}
          >
            <CheckCircle size={16} weight={userRsvp === "going" ? "fill" : "regular"} />
            <span>{userRsvp === "going" ? "Confirmado" : "Confirmar Presença"}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
