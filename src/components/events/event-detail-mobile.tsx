import React, { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarBlank,
  Ticket,
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
import { ContentActionsMenu } from "@/components/common/content-actions-menu";

export interface EventDetailMobileProps {
  event: any;
  lots: any[];
  linkedNews?: any;
  userRsvp: string | null;
  rsvpCounts: { going: number; interested: number; not_going: number };
  isSubmittingRsvp: boolean;
  handleToggleRsvp: (status: "going" | "interested" | "not_going") => void;
  handleBuyTicket: (lot: any) => void;
  isOwner: boolean;
}

export function EventDetailMobile({
  event,
  lots,
  linkedNews,
  userRsvp,
  rsvpCounts,
  isSubmittingRsvp,
  handleToggleRsvp,
  handleBuyTicket,
  isOwner,
}: EventDetailMobileProps) {
  const activeLots = lots.filter((l: any) => l.status === "active");
  const ticketsSectionRef = useRef<HTMLDivElement>(null);

  // Determinar menor preço de lote para a barra inferior
  const lowestLotPrice = activeLots.length > 0
    ? Math.min(...activeLots.map((l: any) => l.price_cents || 0))
    : null;

  const scrollToTickets = () => {
    if (ticketsSectionRef.current) {
      ticketsSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-background text-foreground pb-24 font-sans select-none antialiased">
      {/* ── 1. Hero Edge-to-Edge com Ações Flutuantes ── */}
      <div className="relative w-full aspect-video sm:aspect-[16/9] bg-muted overflow-hidden">
        {event.cover_image ? (
          <img
            src={event.cover_image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/60 text-muted-foreground">
            <Ticket size={48} weight="thin" />
          </div>
        )}

        {/* Gradiente superior para contraste dos botões */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 via-black/25 to-transparent pointer-events-none z-10" />

        {/* Botão Circular Flutuante "Voltar" */}
        <Link
          to="/agenda"
          className="absolute top-3 left-3 size-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/20 active:scale-95 transition-transform z-20 shadow-md"
          aria-label="Voltar para Agenda"
        >
          <ArrowLeft size={18} weight="bold" />
        </Link>

        {/* Ações Flutuantes Superior Direito */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
          {isOwner && (
            <Link
              to="/workspace/eventos"
              className="size-10 rounded-full bg-black/50 backdrop-blur-md text-amber-300 flex items-center justify-center border border-white/20 active:scale-95 transition-transform shadow-md"
              aria-label="Editar Evento"
            >
              <PencilSimple size={18} weight="bold" />
            </Link>
          )}
          <div className="size-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/20 shadow-md">
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

        {/* Badge de Evento Externo sobre a mídia */}
        {event.is_external && (
          <div className="absolute bottom-3 left-3 z-20">
            <Badge className="bg-background/90 text-foreground text-[10px] font-bold border border-border/50 uppercase tracking-wider backdrop-blur-md">
              {event.external_source ? `Via ${event.external_source}` : "Evento Externo"}
            </Badge>
          </div>
        )}
      </div>

      {/* ── 2. Owner Mode Banner (se aplicável) ── */}
      {isOwner && (
        <div className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-2 flex items-center justify-between text-xs text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-amber-500" />
            <span className="font-semibold">Modo Organizador Ativo</span>
          </div>
          <Link
            to="/workspace/eventos"
            className="text-[11px] font-bold underline hover:text-amber-800 dark:hover:text-amber-100"
          >
            Gerenciar
          </Link>
        </div>
      )}

      {/* ── 3. Corpo do Evento ── */}
      <div className="px-4 py-4 space-y-5">
        {/* Metadados: Data, Local, Cidade */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className="px-2.5 py-1 text-xs font-semibold rounded-lg gap-1.5"
          >
            <CalendarBlank size={13} weight="bold" />
            {new Date(event.event_date).toLocaleString("pt-BR", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </Badge>
          {(event.venue || event.location || event.location_name) && (
            <Badge
              variant="outline"
              className="px-2.5 py-1 text-xs font-semibold rounded-lg gap-1.5"
            >
              <MapPin size={13} weight="bold" className="text-foreground" />
              <span className="line-clamp-1 max-w-[200px]">
                {event.venue || event.location || event.location_name}
              </span>
            </Badge>
          )}
          {event.city && (
            <Badge variant="outline" className="px-2 py-1 text-xs font-medium rounded-lg text-muted-foreground">
              {event.city}{event.state ? ` - ${event.state}` : ""}
            </Badge>
          )}
        </div>

        {/* Título Principal */}
        <h1 className="text-2xl font-black tracking-tight text-foreground leading-tight">
          {event.title}
        </h1>

        {/* Organizador */}
        {event.organizer_name && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <Users size={14} />
            <span>Organizado por <strong className="text-foreground font-semibold">{event.organizer_name}</strong></span>
          </div>
        )}

        {/* ── 4. RSVP: Confirmação de Presença ── */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Users size={16} weight="bold" className="text-primary" />
              <span className="text-xs font-bold text-foreground">Confirmação de Presença</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">
              {rsvpCounts.going} {rsvpCounts.going === 1 ? "confirmado" : "confirmados"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleToggleRsvp("going")}
              disabled={isSubmittingRsvp}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all min-h-[54px] active:scale-95 ${
                userRsvp === "going"
                  ? "bg-primary/10 border-primary text-primary font-bold shadow-sm"
                  : "bg-background border-border/70 text-foreground hover:bg-muted/40"
              }`}
            >
              <CheckCircle
                size={18}
                weight={userRsvp === "going" ? "fill" : "regular"}
                className={userRsvp === "going" ? "text-primary" : "text-muted-foreground"}
              />
              <span className="text-[11px] mt-1">Eu vou</span>
              <span className="text-[10px] text-muted-foreground font-mono">{rsvpCounts.going}</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleRsvp("interested")}
              disabled={isSubmittingRsvp}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all min-h-[54px] active:scale-95 ${
                userRsvp === "interested"
                  ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold shadow-sm"
                  : "bg-background border-border/70 text-foreground hover:bg-muted/40"
              }`}
            >
              <Star
                size={18}
                weight={userRsvp === "interested" ? "fill" : "regular"}
                className={userRsvp === "interested" ? "text-amber-500" : "text-muted-foreground"}
              />
              <span className="text-[11px] mt-1">Interesse</span>
              <span className="text-[10px] text-muted-foreground font-mono">{rsvpCounts.interested}</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleRsvp("not_going")}
              disabled={isSubmittingRsvp}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all min-h-[54px] active:scale-95 ${
                userRsvp === "not_going"
                  ? "bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-400 font-bold shadow-sm"
                  : "bg-background border-border/70 text-foreground hover:bg-muted/40"
              }`}
            >
              <XCircle
                size={18}
                weight={userRsvp === "not_going" ? "fill" : "regular"}
                className={userRsvp === "not_going" ? "text-rose-500" : "text-muted-foreground"}
              />
              <span className="text-[11px] mt-1">Não vou</span>
              <span className="text-[10px] text-muted-foreground font-mono">{rsvpCounts.not_going}</span>
            </button>
          </div>
        </div>

        {/* ── 5. Ingressos & Lotes ── */}
        <div ref={ticketsSectionRef} className="space-y-3 pt-1">
          <div className="flex items-center gap-2 pb-1">
            <Ticket size={18} weight="bold" className="text-primary" />
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              {event.is_external || event.is_external_ticket ? "Ingressos Oficiais" : "Lotes de Ingressos"}
            </h2>
            {(event.is_external || event.is_external_ticket) && (
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 bg-amber-500/10">
                {event.external_source ? `Oficial ${event.external_source}` : "Link Externo"}
              </Badge>
            )}
          </div>

          {(event.is_external || event.is_external_ticket) && event.external_ticket_url ? (
            <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Os ingressos para este evento são comercializados diretamente pela plataforma oficial{" "}
                <span className="font-semibold text-foreground capitalize">{event.external_source || "do organizador"}</span>.
              </p>
              <a
                href={event.external_ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-foreground text-background font-bold text-xs hover:bg-foreground/90 transition-colors"
              >
                <Ticket size={16} weight="bold" />
                Comprar no Site Oficial
                <ArrowSquareOut size={14} weight="bold" />
              </a>
            </div>
          ) : activeLots.length === 0 ? (
            <div className="p-4 text-center rounded-xl bg-muted/30 border border-border/40">
              <p className="text-xs font-medium text-muted-foreground">
                Nenhum lote de ingressos disponível no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeLots.map((lot: any) => {
                const available = lot.capacity - (lot.sold_count + lot.reserved_count);
                const isSoldOut = available <= 0;

                return (
                  <div
                    key={lot.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isSoldOut
                        ? "border-border/40 bg-muted/20 opacity-70"
                        : "border-border/70 bg-card"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2.5 gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{lot.name}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {isSoldOut ? "Esgotado" : `Restam ${available} ingressos`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-black text-primary">
                          {formatMoney(lot.price_cents)}
                        </p>
                      </div>
                    </div>

                    <Button
                      className="w-full font-bold h-10 text-xs rounded-xl"
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
        </div>

        {/* ── 6. Descrição / Sobre o Evento ── */}
        {event.description && (
          <div className="pt-3 border-t border-border/40 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sobre o Evento</h2>
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>
        )}

        {/* ── 7. Cobertura Jornalística Oficial Vinculada ── */}
        {linkedNews && (
          <div className="pt-3 border-t border-border/40 space-y-2.5">
            <div className="flex items-center gap-2">
              <Newspaper size={16} weight="bold" className="text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cobertura Jornalística Oficial
              </h2>
            </div>

            <Link
              to="/noticias/$slug"
              params={{ slug: linkedNews.slug }}
              className="block group p-3.5 rounded-xl border border-border/70 bg-card active:scale-[0.99] transition-all"
            >
              <div className="flex gap-3 items-center">
                {linkedNews.cover_media_url && (
                  <div className="size-16 shrink-0 rounded-lg overflow-hidden bg-muted border border-border/40">
                    <img
                      src={linkedNews.cover_media_url}
                      alt={linkedNews.title}
                      className="size-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-1 min-w-0">
                  {linkedNews.kicker && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                      {linkedNews.kicker}
                    </span>
                  )}
                  <h3 className="font-bold text-xs text-foreground line-clamp-2">
                    {linkedNews.title}
                  </h3>
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* ── 8. Sticky Bottom Bar Anti-Jank (Safe-Area & Thumb Zone) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 p-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] mobile-nav-hide-on-keyboard flex items-center justify-between gap-3 shadow-lg">
        <div className="min-w-0 flex-1">
          {lowestLotPrice !== null ? (
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Ingressos a partir de
              </span>
              <span className="text-base font-black text-foreground">
                {formatMoney(lowestLotPrice)}
              </span>
            </div>
          ) : event.external_ticket_url ? (
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Plataforma Oficial
              </span>
              <span className="text-xs font-bold text-foreground capitalize line-clamp-1">
                {event.external_source || "Link Externo"}
              </span>
            </div>
          ) : (
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Status
              </span>
              <span className="text-xs font-bold text-foreground">
                {rsvpCounts.going > 0 ? `${rsvpCounts.going} presenças` : "RSVP Aberto"}
              </span>
            </div>
          )}
        </div>

        {event.external_ticket_url ? (
          <a
            href={event.external_ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 h-12 px-5 rounded-xl bg-foreground text-background font-bold text-xs hover:bg-foreground/90 transition-colors shadow-sm shrink-0"
          >
            <span>Comprar</span>
            <ArrowSquareOut size={14} weight="bold" />
          </a>
        ) : activeLots.length > 0 ? (
          <Button
            onClick={scrollToTickets}
            className="h-12 px-5 rounded-xl font-bold text-xs shadow-sm shrink-0"
          >
            <Ticket size={16} weight="bold" className="mr-1.5" />
            <span>Ver Ingressos</span>
          </Button>
        ) : (
          <Button
            onClick={() => handleToggleRsvp("going")}
            className="h-12 px-5 rounded-xl font-bold text-xs shadow-sm shrink-0"
            variant={userRsvp === "going" ? "secondary" : "default"}
          >
            <CheckCircle size={16} weight="bold" className="mr-1.5" />
            <span>{userRsvp === "going" ? "Confirmado" : "Confirmar Presença"}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
