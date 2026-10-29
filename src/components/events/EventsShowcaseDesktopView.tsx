import React, { useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDots,
  MapPin,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Ticket,
  TrendUp,
  Sparkle,
  Buildings,
  CheckCircle,
  Star,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { EmptyState } from "@/components/state/states";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { BannerDTO } from "@/services/banner.functions";
import type { EventFeatureMiniBannerItem } from "./EventFeatureMiniBannersRail";
import type { EventProducerItem } from "./EventProducersRail";
import { ALL_EXPANDED_EVENT_CATEGORIES } from "./EventCategoryButtonsGrid";

export interface EventsShowcaseDesktopViewProps {
  activeCity?: string;
  banners?: BannerDTO[];
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
  className?: string;
}

export function EventsShowcaseDesktopView({
  activeCity = "São Miguel do Oeste",
  banners = [],
  activeCategory = "todos",
  onSelectCategory,
  categoryCounts = {},
  eventsForYou = [],
  trendingEvents = [],
  producers = [],
  miniBanners = [],
  thematicRails = [],
  allFilteredEvents = [],
  selectedDateFilter = "all",
  onSelectDateFilter,
  isLoading = false,
  className,
}: EventsShowcaseDesktopViewProps) {
  const instagramRailRef = useRef<HTMLDivElement>(null);

  const scrollInstagramRail = (direction: "left" | "right") => {
    if (instagramRailRef.current) {
      const offset = direction === "left" ? -340 : 340;
      instagramRailRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div
      className={cn("w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 hidden md:block select-none", className)}
      data-testid="events-showcase-desktop-view"
    >
      {/* ── 1. CABEÇALHO WIDESCREEN EDITORIAL (Apple HIG) ── */}
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-2xs font-mono font-bold uppercase tracking-wider">
              {activeCity}
            </span>
            <span className="text-2xs text-muted-foreground font-mono">
              Programação Cultural & Ingressos
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Agenda de Eventos e Festivais
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Descubra os principais shows, festas, gastronomia e garanta seus ingressos oficiais.
          </p>
        </div>

        <Button
          asChild
          className="h-11 min-h-11 px-5 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary shadow-xs cursor-pointer"
        >
          <Link to="/conta/classificados/novo" search={{ tipo: "evento" }}>
            <CalendarDots size={16} weight="bold" className="mr-2" />
            <span>Criar Evento</span>
          </Link>
        </Button>
      </div>

      {/* ── 2. CARROSSEL DE BANNERS PRINCIPAIS PANORÂMICO ── */}
      {banners.length > 0 && (
        <section aria-label="Banners Principais">
          <BannerHeroCarousel banners={banners} className="rounded-2xl overflow-hidden" />
        </section>
      )}

      {/* ── 3. RÉGUA HORIZONTAL DE CATEGORIAS (Com Ícones e Contadores) ── */}
      <section aria-label="Filtro por Categorias">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {ALL_EXPANDED_EVENT_CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            const isSelected = activeCategory === cat.id;
            const count = categoryCounts[cat.id];

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory && onSelectCategory(cat.id)}
                className={cn(
                  "h-11 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-colors cursor-pointer whitespace-nowrap shrink-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95",
                  isSelected
                    ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                    : "bg-card border-border/60 hover:bg-muted/40 text-foreground",
                )}
              >
                <CatIcon size={16} weight="bold" className={isSelected ? "text-background" : "text-primary"} />
                <span>{cat.label}</span>
                {typeof count === "number" && count > 0 && (
                  <span
                    className={cn(
                      "text-3xs font-mono font-bold px-2 py-1 rounded-full ml-1",
                      isSelected ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 4. SEÇÃO: "Eventos pra você" (Grade de Cards Horizontais Expandidos) ── */}
      {eventsForYou.length > 0 && (
        <section aria-label="Eventos pra você" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Eventos pra você</span>
                <span className="text-xs font-mono font-normal text-muted-foreground">
                  ({eventsForYou.length} na sua região)
                </span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventsForYou.map((ev) => (
              <Link
                key={ev.id}
                to="/evento/$id"
                params={{ id: ev.id }}
                className="h-28 rounded-2xl border border-border/60 bg-card p-3 flex items-center gap-4 hover:border-foreground/30 hover:shadow-xs transition-colors duration-200 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="w-28 h-full rounded-xl overflow-hidden bg-muted relative shrink-0">
                  <img
                    src={ev.cover_image || ev.image_url}
                    alt={ev.title}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-1">
                  <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    {ev.title}
                  </h3>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <CalendarBlank size={13} weight="bold" className="text-primary" />
                      <span>{formatDate(ev.event_date)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                      <MapPin size={13} weight="bold" />
                      <span className="truncate">{ev.venue || ev.location || "Local a confirmar"}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end justify-between h-full py-1">
                  <span className="text-xs font-bold font-mono text-foreground">
                    {ev.is_free ? "Grátis" : ev.price_min_cents ? `R$ ${(ev.price_min_cents / 100).toFixed(2)}` : "Grátis"}
                  </span>
                  <span className="h-9 px-3 rounded-lg bg-primary text-primary-foreground font-bold text-xs inline-flex items-center gap-1 group-hover:bg-primary/90 transition-colors">
                    <Ticket size={13} weight="bold" />
                    <span>Ingressos</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 5. SEÇÃO: "Eventos em alta" (Cards Quadrados Estilo Instagram com Carrossel Contínuo) ── */}
      {trendingEvents.length > 0 && (
        <section aria-label="Eventos em alta" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <TrendUp size={20} weight="bold" className="text-primary" />
              <span>Eventos em alta</span>
            </h2>

            {/* Setas de Controle Interno do Carrossel Desktop */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollInstagramRail("left")}
                aria-label="Rolar para esquerda"
                className="size-10 rounded-full border border-border/80 bg-card hover:bg-muted/60 text-foreground flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <CaretLeft size={18} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => scrollInstagramRail("right")}
                aria-label="Rolar para direita"
                className="size-10 rounded-full border border-border/80 bg-card hover:bg-muted/60 text-foreground flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <CaretRight size={18} weight="bold" />
              </button>
            </div>
          </div>

          <div
            ref={instagramRailRef}
            className="flex items-center gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory py-1"
          >
            {trendingEvents.map((ev) => (
              <Link
                key={ev.id}
                to="/evento/$id"
                params={{ id: ev.id }}
                className="w-68 shrink-0 snap-start rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 hover:shadow-md transition-colors duration-200 group cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {/* Imagem Quadrada Estilo Post Instagram (Aspect Square) */}
                <div className="aspect-square relative overflow-hidden bg-muted">
                  <img
                    src={ev.cover_image || ev.image_url}
                    alt={ev.title}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 z-10">
                    <span className="bg-background/70 text-primary-foreground backdrop-blur-xs text-xs font-mono font-bold px-2 py-1 rounded-lg border border-white/20">
                      {formatDate(ev.event_date)}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {ev.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                      <MapPin size={13} weight="bold" />
                      <span className="truncate">{ev.venue || ev.location || "Local a confirmar"}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground font-mono">
                      {ev.is_free ? "Gratuito" : ev.price_min_cents ? `A partir de R$ ${(ev.price_min_cents / 100).toFixed(2)}` : "Gratuito"}
                    </span>
                    <span className="h-9 px-3 rounded-lg bg-primary text-primary-foreground font-bold text-xs inline-flex items-center gap-1 group-hover:bg-primary/90 transition-colors">
                      <Ticket size={13} weight="bold" />
                      <span>Garantir</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 6. SEÇÃO: "No Waesy Eventos também tem" (Mini Banners em Grid de 4 Colunas) ── */}
      {miniBanners.length > 0 && (
        <section aria-label="Destaques Especiais" className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            No Waesy Eventos também tem
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {miniBanners.map((item) => (
              <Link
                key={item.id}
                to={item.targetUrl as any}
                className="h-48 rounded-2xl p-4 flex flex-col justify-between text-primary-foreground relative overflow-hidden select-none shadow-xs hover:opacity-95 active:scale-98 transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{
                  background: item.imageUrl
                    ? undefined
                    : `linear-gradient(145deg, ${item.bgColor || "#7c3aed"} 0%, #0f172a 120%)`,
                }}
              >
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.title} className="absolute inset-0 size-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/50 pointer-events-none" />

                <div className="relative z-10">
                  {item.badgeText && (
                    <span className="text-3xs font-black uppercase tracking-wider px-2 py-1 rounded-full bg-card/20 backdrop-blur-xs border border-white/30 text-primary-foreground inline-block">
                      {item.badgeText}
                    </span>
                  )}
                </div>

                <div className="relative z-10 space-y-2">
                  <div>
                    <h3 className="text-base font-bold leading-tight line-clamp-2 drop-shadow-xs">
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <p className="text-xs text-primary-foreground/80 line-clamp-1 mt-1 drop-shadow-xs">
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/20 backdrop-blur-md text-primary-foreground text-xs font-bold group-hover:bg-card/30 transition-colors">
                    <span>{item.actionText || "Conferir"}</span>
                    <CaretRight size={12} weight="bold" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 7. SEÇÃO: "Produtoras e Casas de Show" (Grid Institucional Desktop) ── */}
      {producers.length > 0 && (
        <section aria-label="Produtoras e Casas de Show" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Produtoras e Casas de Show
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Organizadores oficiais e espaços culturais certificados
              </p>
            </div>
            <Link
              to="/places"
              search={{ categoria: "entretenimento" }}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>Ver todos</span>
              <CaretRight size={12} weight="bold" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {producers.map((prod) => (
              <Link
                key={prod.id}
                to={prod.slug ? `/places/${prod.slug}` : `/buscar?q=${encodeURIComponent(prod.name)}` as any}
                className="rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-4 hover:border-foreground/30 hover:shadow-xs transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="size-12 rounded-full border border-border/80 bg-muted overflow-hidden flex items-center justify-center shrink-0">
                  {prod.logoUrl ? (
                    <img src={prod.logoUrl} alt={prod.name} className="size-full object-cover" />
                  ) : (
                    <Buildings size={22} weight="bold" className="text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1">
                    <h3 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {prod.name}
                    </h3>
                    {prod.isVerified && (
                      <CheckCircle size={13} weight="fill" className="text-primary shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                    {prod.rating && (
                      <span className="flex items-center gap-1 font-bold text-amber-500 font-mono">
                        <Star size={11} weight="fill" />
                        <span>{prod.rating.toFixed(1)}</span>
                      </span>
                    )}
                    {typeof prod.activeEventsCount === "number" && (
                      <span>• {prod.activeEventsCount} eventos</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
