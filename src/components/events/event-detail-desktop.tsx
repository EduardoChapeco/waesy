import React from "react";
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

import { NativeBackButton } from "@/components/ui/native-back-button";

export interface EventDetailDesktopProps {
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

export function EventDetailDesktop({
  event,
  lots,
  linkedNews,
  userRsvp,
  rsvpCounts,
  isSubmittingRsvp,
  handleToggleRsvp,
  handleBuyTicket,
  isOwner,
}: EventDetailDesktopProps) {
  const activeLots = lots.filter((l: any) => l.status === "active");

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-4 space-y-6 pb-16 font-sans">
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

      {/* ── Breadcrumb & Ações Topo ── */}
      <div className="flex items-center justify-between">
        <NativeBackButton fallbackHref="/agenda" />
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

      {/* ── Grid Principal Split: Esquerda (7 cols) / Direita (5 cols Sticky) ── */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda: Banner, Detalhes & Cobertura Cruzada */}
        <div className="col-span-7 space-y-6">
          {event.cover_image && (
            <div className="w-full aspect-[16/9] overflow-hidden rounded-2xl border border-border/60 bg-muted relative shadow-sm">
              <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
              {event.is_external && (
                <div className="absolute top-3 left-3">
                  <Badge className="bg-background/90 text-foreground text-[11px] font-bold border border-border/50 uppercase tracking-wider backdrop-blur-md">
                    {event.external_source ? `Via ${event.external_source}` : "Evento Externo"}
                  </Badge>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
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

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              {event.title}
            </h1>

            {event.description && (
              <div className="pt-3 border-t border-border/40 space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sobre o Evento</h2>
                <p className="text-sm md:text-base text-foreground/85 leading-relaxed whitespace-pre-line">
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
                  className="block group p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all shadow-sm"
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
                      <h3 className="font-bold text-sm md:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2">
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

        {/* Coluna Direita: Ingressos & RSVP (Sticky) */}
        <div className="col-span-5 space-y-5 sticky top-24">
          {/* ── Card 1: Confirmação de Presença (RSVP) ── */}
          <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-sm">
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
                    ? "bg-primary/10 border-primary text-primary font-bold shadow-sm"
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
                    ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold shadow-sm"
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
                    ? "bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-400 font-bold shadow-sm"
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
          <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-5 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
              <Ticket size={20} weight="bold" className="text-primary" />
              <h2 className="text-base md:text-lg font-bold text-foreground tracking-tight">
                {event.is_external || event.is_external_ticket ? "Ingressos Oficiais" : "Ingressos Disponíveis"}
              </h2>
              {(event.is_external || event.is_external_ticket) && (
                <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 bg-amber-500/10">
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
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
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
                          <h3 className="font-bold text-sm md:text-base text-foreground">{lot.name}</h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {isSoldOut ? "Esgotado" : `Restam ${available} ingressos`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg md:text-xl font-black text-primary">
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
                  Organizado por <strong className="text-foreground">{event.organizer_name}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
