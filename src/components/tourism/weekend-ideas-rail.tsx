import { Link } from "@tanstack/react-router";
import { Star, MapPin, Bed, ArrowRight, AirplaneTilt } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { TourismItemDTO } from "@/services/tourism.functions";

interface WeekendIdeasRailProps {
  title?: string;
  subtitle?: string;
  items: TourismItemDTO[];
  onOpenQuote: (destination?: string) => void;
  className?: string;
}

export function WeekendIdeasRail({
  title = "Ideias para o fim de semana",
  subtitle = "Hospedagens, resorts e experiências selecionadas",
  items,
  onOpenQuote,
  className,
}: WeekendIdeasRailProps) {
  if (!items || items.length === 0) return null;

  return (
    <section aria-label={title} className={cn("w-full space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* ── Trilho Horizontal com Snap Scroll e Física Tátil ── */}
      <div className="flex items-stretch gap-4 overflow-x-auto no-scrollbar py-2 px-1 snap-x snap-mandatory [mask-image:linear-gradient(to_right,black_92%,transparent_100%)]">
        {items.map((item) => {
          const priceCents = item.price_cents || 0;
          const displayPrice = item.price_display || (priceCents > 0 ? formatMoney(priceCents) : "Consulte");
          const photoUrl = item.cover_image || item.cover_image_url || item.image_url;
          const ratingVal = item.rating || 9.2;
          const locationText = item.location_name || item.destination_city || item.destination || "Regional";

          return (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card overflow-hidden hover:border-foreground/30 transition-all shadow-xs shrink-0 w-68 sm:w-80 snap-start"
            >
              {/* Contêiner de Imagem com Aspect Ratio Fixo (Anti-CLS) */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground/40">
                    <AirplaneTilt size={36} />
                  </div>
                )}

                {/* Badge "a partir de R$ ..." Estilo iFood / Decolar */}
                <div className="absolute bottom-2 left-2 z-10 px-3 py-1.5 rounded-lg bg-indigo-950/90 backdrop-blur-md text-white border border-white/10 shadow-sm">
                  <span className="text-3xs block opacity-80 leading-tight">a partir de</span>
                  <span className="text-xs sm:text-sm font-black font-mono leading-tight">
                    {displayPrice}
                  </span>
                </div>

                {/* Badge de Nota / Avaliação */}
                {ratingVal > 0 && (
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-background/90 backdrop-blur-md text-foreground border border-border/40 text-3xs font-extrabold shadow-2xs">
                    <Star size={12} weight="fill" className="text-amber-500" />
                    <span>{ratingVal.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Informações da Hospedagem / Pacote */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-3xs font-bold text-muted-foreground uppercase tracking-wider">
                    <MapPin size={12} className="text-primary" />
                    <span className="truncate">{locationText}</span>
                  </div>

                  <Link
                    to="/turismo/$id"
                    params={{ id: item.id }}
                    className="block focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                      {item.title}
                    </h3>
                  </Link>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5 text-3xs text-muted-foreground">
                    <Bed size={14} className="text-muted-foreground" />
                    <span>Hospedagem · 1 noite, 2 pessoas</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-3xs text-muted-foreground font-medium">
                      Taxas e impostos inclusos
                    </span>
                    <Button
                      asChild
                      size="sm"
                      className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Link to="/turismo/$id" params={{ id: item.id }}>
                        Ver Oferta
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
