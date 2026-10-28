import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  CaretLeft,
  CalendarBlank,
  MapPin,
  Ticket,
  SquaresFour,
  Rows,
  SlidersHorizontal,
  WarningCircle,
  Sparkle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventSpotlightCard } from "./EventSpotlightCard";
import { EventHorizontalCard } from "./EventHorizontalCard";
import { EventProducersRail, type EventProducerItem } from "./EventProducersRail";
import { EmptyState } from "@/components/state/states";
import { cn } from "@/lib/utils";

export interface EventSubnicheDefinition {
  id: string;
  label: string;
  title: string;
  description: string;
  subFilters: Array<{ id: string; label: string; keywords: string[] }>;
}

export const EVENT_SUBNICHES_MANIFEST: Record<string, EventSubnicheDefinition> = {
  shows: {
    id: "shows",
    label: "Shows e Baladas",
    title: "Shows, Festivais e Música ao Vivo",
    description: "Ingressos oficiais para grandes shows nacionais, festivais e apresentações ao vivo.",
    subFilters: [
      { id: "all", label: "Todos os Shows", keywords: [] },
      { id: "rock", label: "Rock & Pop", keywords: ["rock", "pop", "banda", "metal", "acústico"] },
      { id: "sertanejo", label: "Sertanejo & Modão", keywords: ["sertanejo", "modão", "violada", "boteco"] },
      { id: "pagode", label: "Samba & Pagode", keywords: ["pagode", "samba", "roda de samba"] },
      { id: "eletronica", label: "Eletrônica & DJ", keywords: ["eletrônica", "dj", "rave", "techno", "house"] },
      { id: "festivais", label: "Festivais", keywords: ["festival", "open bar", "line-up", "arena"] },
    ],
  },
  sertanejo: {
    id: "sertanejo",
    label: "Sertanejo",
    title: "Sertanejo, Baladas e Violadas",
    description: "Os melhores modões, shows sertanejos e encontros musicais da região.",
    subFilters: [
      { id: "all", label: "Todos", keywords: [] },
      { id: "modao", label: "Modão Raiz", keywords: ["modão", "raiz", "acústico"] },
      { id: "universitario", label: "Universitário", keywords: ["universitário", "balada", "festa"] },
      { id: "boteco", label: "Boteco & Petiscos", keywords: ["boteco", "bar", "violada"] },
    ],
  },
  pagode: {
    id: "pagode",
    label: "Samba & Pagode",
    title: "Rodas de Samba e Pagode",
    description: "Muita alegria, percussão e as melhores rodas de samba e pagode.",
    subFilters: [
      { id: "all", label: "Todos", keywords: [] },
      { id: "roda", label: "Roda de Samba", keywords: ["roda", "samba"] },
      { id: "pagode90", label: "Pagode Anos 90", keywords: ["anos 90", "retrô"] },
    ],
  },
  gastronomico: {
    id: "gastronomico",
    label: "Gastronomia & Chopp",
    title: "Festivais Gastronômicos, Chopp e Feiras",
    description: "Festivais de cerveja artesanal, food trucks, churrasco e experiências gastronômicas.",
    subFilters: [
      { id: "all", label: "Toda a Gastronomia", keywords: [] },
      { id: "chopp", label: "Chopp & Cervejas", keywords: ["chopp", "cerveja", "artesanal", "oktober"] },
      { id: "foodtruck", label: "Food Trucks & Burgers", keywords: ["food truck", "burger", "hamburguer"] },
      { id: "churrasco", label: "Carnes & Churrasco", keywords: ["churrasco", "costela", "open food"] },
      { id: "vinho", label: "Vinho & Fondue", keywords: ["vinho", "adega", "fondue", "queijo"] },
    ],
  },
  teatro: {
    id: "teatro",
    label: "Teatro & Stand-up",
    title: "Teatro, Stand-up Comedy e Espetáculos",
    description: "Peças de teatro, shows de comédia stand-up, musicais e expressões artísticas.",
    subFilters: [
      { id: "all", label: "Todos os Espetáculos", keywords: [] },
      { id: "standup", label: "Stand-up Comedy", keywords: ["stand-up", "comédia", "humor"] },
      { id: "drama", label: "Peças & Dramaturgia", keywords: ["peça", "teatro", "drama"] },
      { id: "musical", label: "Musicais & Dança", keywords: ["musical", "dança", "ballet"] },
    ],
  },
  feiras: {
    id: "feiras",
    label: "Feiras & Negócios",
    title: "Feiras, Bazares e Encontros Comerciais",
    description: "Feiras municipais, bazares comunitários, exposições agropecuárias e artesanato.",
    subFilters: [
      { id: "all", label: "Todas as Feiras", keywords: [] },
      { id: "bazar", label: "Bazares & Brechós", keywords: ["bazar", "brechó", "artesanato"] },
      { id: "agro", label: "Agro & Negócios", keywords: ["agro", "exposição", "negócios", "rural"] },
      { id: "pet", label: "Pet & Adoção", keywords: ["pet", "adoção", "animais", "cão"] },
    ],
  },
  workshops: {
    id: "workshops",
    label: "Cursos & Workshops",
    title: "Cursos, Palestras e Workshops Certificados",
    description: "Desenvolvimento profissional, treinamentos imersivos, palestras e masterclasses.",
    subFilters: [
      { id: "all", label: "Todos os Cursos", keywords: [] },
      { id: "negocios", label: "Empreendedorismo & Vendas", keywords: ["negócios", "vendas", "gestão", "liderança"] },
      { id: "tecnologia", label: "Tecnologia & IA", keywords: ["tecnologia", "ia", "programação", "design"] },
      { id: "arte", label: "Arte & Culinária", keywords: ["culinária", "arte", "fotografia", "música"] },
    ],
  },
  infantil: {
    id: "infantil",
    label: "Infantil & Família",
    title: "Eventos Infantis, Circo e Família",
    description: "Atrações seguras e divertidas para crianças, circo, teatro infantil e parques.",
    subFilters: [
      { id: "all", label: "Todas as Atrações", keywords: [] },
      { id: "circo", label: "Circo & Mágica", keywords: ["circo", "mágica", "palhaço", "acrobacia"] },
      { id: "teatrokids", label: "Teatro Infantil", keywords: ["infantil", "criança", "kids", "bonecos"] },
      { id: "recreacao", label: "Parques & Recreação", keywords: ["parque", "recreação", "brincadeira"] },
    ],
  },
  gratis: {
    id: "gratis",
    label: "Entrada Gratuita",
    title: "Eventos Gratuitos e Entrada Franca",
    description: "Programação cultural e de lazer 100% gratuita na sua comunidade.",
    subFilters: [
      { id: "all", label: "Todos Gratuitos", keywords: [] },
      { id: "musica", label: "Música na Praça", keywords: ["praça", "rua", "música", "show"] },
      { id: "exposicao", label: "Exposições & Museus", keywords: ["exposição", "museu", "galeria", "arte"] },
      { id: "comunitario", label: "Ações Comunitárias", keywords: ["comunitário", "social", "família"] },
    ],
  },
};

export interface EventSubvitrineViewProps {
  categorySlug: string;
  activeCity: string;
  events: any[];
  onBackToAll: () => void;
  producers?: EventProducerItem[];
  className?: string;
}

export function EventSubvitrineView({
  categorySlug,
  activeCity,
  events = [],
  onBackToAll,
  producers = [],
  className,
}: EventSubvitrineViewProps) {
  const [activeSubFilter, setActiveSubFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const manifest = EVENT_SUBNICHES_MANIFEST[categorySlug] || {
    id: categorySlug,
    label: categorySlug,
    title: `Eventos de ${categorySlug}`,
    description: `Confira os eventos e ingressos disponíveis na categoria ${categorySlug}.`,
    subFilters: [{ id: "all", label: "Todos", keywords: [] }],
  };

  // Filtragem interna pelo sub-nicho
  const filteredSubEvents = useMemo(() => {
    if (activeSubFilter === "all") return events;
    const filterDef = manifest.subFilters.find((f) => f.id === activeSubFilter);
    if (!filterDef || filterDef.keywords.length === 0) return events;

    return events.filter((e) => {
      const text = `${e.title || ""} ${e.description || ""} ${e.location || ""}`.toLowerCase();
      return filterDef.keywords.some((kw) => text.includes(kw));
    });
  }, [events, activeSubFilter, manifest]);

  return (
    <div
      className={cn("w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-6 select-none", className)}
      data-testid={`event-subvitrine-${categorySlug}`}
    >
      {/* ── 1. CABEÇALHO DA SUBVITRINE COM BOTÃO VOLTAR E CONTADOR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBackToAll}
            className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xs"
          >
            <CaretLeft size={16} weight="bold" />
            <span>Voltar para Todos os Eventos</span>
          </button>
          <div className="flex items-center gap-2 pt-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              {manifest.title}
            </h1>
            <Badge variant="outline" className="font-mono text-3xs font-bold uppercase">
              {filteredSubEvents.length} {filteredSubEvents.length === 1 ? "evento" : "eventos"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            {manifest.description}
          </p>
        </div>

        {/* Alternador de Modo de Visualização (Grid vs Lista) */}
        <div className="flex items-center gap-1 self-end sm:self-center bg-card border border-border/60 rounded-xl p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            aria-label="Visualização em Grade"
            className={cn(
              "size-10 min-w-10 min-h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              viewMode === "grid" ? "bg-foreground text-background shadow-xs font-bold" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <SquaresFour size={18} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-label="Visualização em Lista"
            className={cn(
              "size-10 min-w-10 min-h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              viewMode === "list" ? "bg-foreground text-background shadow-xs font-bold" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Rows size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* ── 2. RÉGUA DE SUB-FILTROS RÁPIDOS ESPECÍFICOS DO NICHO ── */}
      {manifest.subFilters.length > 1 && (
        <section aria-label="Subfiltros">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {manifest.subFilters.map((sub) => {
              const isSelected = activeSubFilter === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setActiveSubFilter(sub.id)}
                  className={cn(
                    "h-11 px-4 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer whitespace-nowrap",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected
                      ? "bg-foreground text-background font-bold shadow-xs"
                      : "bg-card border border-border/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 3. TRILHO DE DESTAQUES DO SUBNICHO (Se houver 3 ou mais eventos) ── */}
      {filteredSubEvents.length >= 3 && (
        <section aria-label="Destaques do Subnicho" className="space-y-2">
          <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
            Destaques em {manifest.label}
          </h2>
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            {filteredSubEvents.slice(0, 4).map((ev) => (
              <EventSpotlightCard
                key={ev.id}
                id={ev.id}
                title={ev.title}
                eventDate={ev.event_date}
                endDate={ev.end_date}
                location={ev.location}
                venue={ev.venue}
                coverImage={ev.cover_image || ev.image_url}
                priceMinCents={ev.price_min_cents}
                priceCents={ev.price_cents}
                isFree={ev.is_free}
                category={ev.category}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 4. LISTAGEM PRINCIPAL DE EVENTOS DO SUBNICHO ── */}
      <section aria-label="Todos os Eventos do Subnicho" className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
          Todos os Eventos
        </h2>

        {filteredSubEvents.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubEvents.map((ev) => (
                <EventSpotlightCard
                  key={ev.id}
                  id={ev.id}
                  title={ev.title}
                  eventDate={ev.event_date}
                  endDate={ev.end_date}
                  location={ev.location}
                  venue={ev.venue}
                  coverImage={ev.cover_image || ev.image_url}
                  priceMinCents={ev.price_min_cents}
                  priceCents={ev.price_cents}
                  isFree={ev.is_free}
                  category={ev.category}
                  className="w-full"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubEvents.map((ev) => (
                <EventHorizontalCard
                  key={ev.id}
                  id={ev.id}
                  title={ev.title}
                  eventDate={ev.event_date}
                  endDate={ev.end_date}
                  location={ev.location}
                  venue={ev.venue}
                  coverImage={ev.cover_image || ev.image_url}
                  priceCents={ev.price_min_cents || ev.price_cents}
                  isFree={ev.is_free}
                  className="w-full h-24"
                />
              ))}
            </div>
          )
        ) : (
          <div className="py-12 text-center">
            <EmptyState
              title={`Nenhum evento encontrado em ${manifest.label}`}
              description="Não há atrações registradas no momento com os filtros selecionados."
            />
            <div className="pt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={onBackToAll}
                className="h-11 min-h-11 px-5 rounded-xl font-bold text-xs"
              >
                Ver Todas as Categorias
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ── 5. PRODUTORAS REAIS VINCULADAS AO SUBNICHO ── */}
      {producers && producers.length > 0 && (
        <EventProducersRail
          title={`Produtoras & Espaços de ${manifest.label}`}
          producers={producers}
        />
      )}
    </div>
  );
}
