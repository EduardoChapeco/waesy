// motion-reduce: safe
import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CaretRight,
  TrendUp,
  Sparkle,
  CalendarBlank,
  WarningCircle,
  CircleNotch,
} from "@phosphor-icons/react";
import { EventTopHeroCover } from "./EventTopHeroCover";
import { EventCategoryButtonsGrid, type EventCategoryButtonItem } from "./EventCategoryButtonsGrid";
import { EventHorizontalCard } from "./EventHorizontalCard";
import { EventSpotlightCard } from "./EventSpotlightCard";
import { EventFeatureMiniBannersRail, type EventFeatureMiniBannerItem } from "./EventFeatureMiniBannersRail";
import { EventProducersRail, type EventProducerItem } from "./EventProducersRail";
import { EmptyState } from "@/components/state/states";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EventsShowcaseMobileViewProps {
  activeCity?: string;
  coverImageUrl?: string | null;
  themeColor?: string;
  calloutTitle?: string;
  partnerLogoUrl?: string | null;
  categoryButtons?: EventCategoryButtonItem[];
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
  categoryCounts?: Record<string, number>;
  eventsForYou?: any[];
  trendingEvents?: any[];
  producers?: EventProducerItem[];
  miniBanners?: EventFeatureMiniBannerItem[];
  thematicRails?: Array<{
    id: string;
    title: string;
    categoryKey: string;
    items: any[];
  }>;
  allFilteredEvents?: any[];
  selectedDateFilter?: string;
  onSelectDateFilter?: (dateFilter: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
}

export function EventsShowcaseMobileView({
  activeCity = "São Miguel do Oeste",
  coverImageUrl,
  themeColor = "#0284c7",
  calloutTitle = "Aqui tem desconto pra quem é Clube!",
  partnerLogoUrl,
  categoryButtons,
  activeCategory = "todos",
  onSelectCategory,
  categoryCounts = {},
  eventsForYou = [],
  trendingEvents = [],
  producers,
  miniBanners,
  thematicRails = [],
  allFilteredEvents = [],
  selectedDateFilter = "all",
  onSelectDateFilter,
  isLoading = false,
  isError = false,
  className,
}: EventsShowcaseMobileViewProps) {
  return (
    <div
      className={cn("w-full bg-background min-h-screen pb-28 md:hidden select-none", className)}
      data-testid="events-showcase-mobile-view"
    >
      {/* ── 1. CAPA IMERSIVA DO TOPO COM BOTÃO VOLTAR E PÍLULA FLUTUANTE ── */}
      <EventTopHeroCover
        activeCity={activeCity}
        coverImageUrl={coverImageUrl}
        themeColor={themeColor}
        calloutTitle={calloutTitle}
        partnerLogoUrl={partnerLogoUrl}
        selectedDateFilter={selectedDateFilter}
        onSelectDateFilter={onSelectDateFilter}
      />

      {/* ── 2. FOLHA DE CONTEÚDO BRANCA COM CANTOS ARREDONDADOS (Transição Nítida) ── */}
      <div className="rounded-t-3xl bg-background -mt-2 relative z-10 space-y-5 pt-2">
        {/* ── 3. GRADE 2x4 DE CATEGORIAS (Sympla / iFood Squircle) ── */}
        <EventCategoryButtonsGrid
          buttons={categoryButtons}
          activeCategory={activeCategory}
          onSelectCategory={onSelectCategory}
          categoryCounts={categoryCounts}
        />

        {/* ── 4. ESTADO DE CARREGAMENTO & ERRO ── */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <CircleNotch size={32} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <div className="mx-4 p-4 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-2">
            <WarningCircle size={28} className="text-destructive mx-auto" />
            <p className="text-xs font-semibold text-foreground">
              Não foi possível carregar a programação de eventos no momento.
            </p>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {/* ── 5. SEÇÃO: "Eventos pra você >" (Cards Horizontais Compactos) ── */}
            {eventsForYou.length > 0 && (
              <section aria-label="Eventos pra você" className="space-y-2">
                <div className="px-3 sm:px-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-1">
                    <span>Eventos pra você</span>
                    <CaretRight size={14} weight="bold" className="text-primary" />
                  </h2>
                  <span className="text-3xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                    {eventsForYou.length} {eventsForYou.length === 1 ? "evento" : "eventos"}
                  </span>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-3 sm:px-4 snap-x snap-mandatory">
                  {eventsForYou.map((ev) => (
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
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── 6. SEÇÃO: " Eventos em alta >" (Cards Verticais Spotlight) ── */}
            {trendingEvents.length > 0 && (
              <section aria-label="Eventos em alta" className="space-y-2">
                <div className="px-3 sm:px-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                    <TrendUp size={18} weight="bold" className="text-primary" />
                    <span>Eventos em alta</span>
                    <CaretRight size={14} weight="bold" className="text-primary" />
                  </h2>
                  <span className="text-3xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                    Destaques
                  </span>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-3 sm:px-4 snap-x snap-mandatory">
                  {trendingEvents.map((ev) => (
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

            {/* ── 7. MINI-BANNERS VERTICAIS ("No Waesy Eventos também tem") ── */}
            <EventFeatureMiniBannersRail items={miniBanners} />

            {/* ── 8. SEÇÃO: "Produtoras e Casas de Show" (Espelho Lojas iFood) ── */}
            <EventProducersRail producers={producers} />

            {/* ── 9. RÉGUA DE FILTROS RÁPIDOS POR DATA ── */}
            {onSelectDateFilter && (
              <section aria-label="Filtro Rápido de Data" className="space-y-2 px-3 sm:px-4">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { id: "all", label: "Todos os Dias" },
                    { id: "today", label: "Hoje" },
                    { id: "tomorrow", label: "Amanhã" },
                    { id: "weekend", label: "Fim de Semana" },
                    { id: "month", label: "Este Mês" },
                  ].map((pill) => {
                    const isSelected = selectedDateFilter === pill.id;
                    return (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => onSelectDateFilter(pill.id)}
                        className={cn(
                          "h-11 px-4 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isSelected
                            ? "bg-foreground text-background font-bold shadow-xs"
                            : "bg-card border border-border/60 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {pill.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── 10. TRILHOS TEMÁTICOS ADICIONAIS (Shows, Gastronomia, Teatro...) ── */}
            {thematicRails.map((rail) => (
              <section key={rail.id} aria-label={rail.title} className="space-y-2">
                <div className="px-3 sm:px-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-1">
                    <span>{rail.title}</span>
                    <CaretRight size={14} weight="bold" className="text-primary" />
                  </h2>
                  <button
                    type="button"
                    onClick={() => onSelectCategory && onSelectCategory(rail.categoryKey)}
                    className="text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                  >
                    Ver todos
                  </button>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-3 sm:px-4 snap-x snap-mandatory">
                  {rail.items.map((ev) => (
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
            ))}

            {/* ── 11. ESTADO VAZIO QUANDO FILTRO NÃO ENCONTRAR NADA ── */}
            {allFilteredEvents.length === 0 && (
              <div className="py-12 px-4">
                <EmptyState
                  title="Nenhum evento encontrado"
                  description="Tente alterar os filtros de data ou categoria para visualizar atrações."
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
