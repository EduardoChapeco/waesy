import React from "react";
import { Link } from "@tanstack/react-router";
import { CalendarBlank, MapPin, Ticket } from "@phosphor-icons/react";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export interface EventSpotlightCardProps {
  id: string;
  title: string;
  eventDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  venue?: string | null;
  coverImage?: string | null;
  priceCents?: number | null;
  priceMinCents?: number | null;
  isFree?: boolean;
  category?: string | null;
  className?: string;
}

export function EventSpotlightCard({
  id,
  title,
  eventDate,
  endDate,
  location,
  venue,
  coverImage,
  priceCents,
  priceMinCents,
  isFree,
  category,
  className,
}: EventSpotlightCardProps) {
  const [imageError, setImageError] = React.useState(false);

  const hasCover = Boolean(!imageError && coverImage && coverImage.trim());
  const displayLocation = venue || location || "Local a confirmar";

  const effectivePrice = typeof priceMinCents === "number" ? priceMinCents : priceCents;
  const isActuallyFree = isFree || !effectivePrice || effectivePrice === 0;

  const formattedDate = React.useMemo(() => {
    if (!eventDate) return "Data a confirmar";
    try {
      const d = new Date(eventDate);
      const day = d.getDate();
      const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      const monthStr = monthNames[d.getMonth()];

      if (endDate) {
        const endD = new Date(endDate);
        if (endD.getMonth() === d.getMonth()) {
          return `${day} a ${endD.getDate()} de ${monthStr}`;
        }
      }
      return `${day} de ${monthStr}`;
    } catch {
      return formatDate(eventDate);
    }
  }, [eventDate, endDate]);

  return (
    <Link
      to="/evento/$id"
      params={{ id }}
      className={cn(
        "w-60 sm:w-68 rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col justify-between shrink-0 snap-start select-none",
        "hover:border-foreground/30 hover:shadow-xs transition-colors duration-200 group cursor-pointer shadow-2xs",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
      aria-label={title}
    >
      <div className="space-y-2">
        {/* ── Banner Superior Panorâmico (Proporção 16:10) ── */}
        <div className="aspect-16/10 relative overflow-hidden bg-muted flex items-center justify-center">
          {hasCover ? (
            <img
              src={coverImage!}
              alt={title}
              loading="lazy"
              className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={() => setImageError(true)}
            />
          ) : (
            <CalendarBlank size={40} weight="duotone" className="text-muted-foreground/30" />
          )}

          {/* Badge de Data Flutuante no Topo */}
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="bg-background/65 text-primary-foreground backdrop-blur-xs text-3xs sm:text-2xs font-mono font-bold px-2 py-1 rounded-md border border-white/20">
              {formattedDate}
            </span>
          </div>

          {category && (
            <div className="absolute top-2.5 right-2.5 z-10">
              <span className="bg-primary/90 text-primary-foreground text-3xs font-black uppercase tracking-wider px-2 py-1 rounded-md">
                {category}
              </span>
            </div>
          )}
        </div>

        {/* ── Informações Textuais: Título, Data e Local ── */}
        <div className="px-3 space-y-1">
          <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {title}
          </h3>

          <div className="space-y-1 pt-1">
            <div className="flex items-center gap-2 text-2xs text-muted-foreground font-mono">
              <CalendarBlank size={12} weight="bold" className="shrink-0 text-primary" />
              <span className="truncate">{formattedDate}</span>
            </div>

            <div className="flex items-center gap-2 text-2xs text-muted-foreground">
              <MapPin size={12} weight="bold" className="shrink-0" />
              <span className="truncate">{displayLocation}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Rodapé Comercial: Preço e Botão Tátil "Garantir" ── */}
      <div className="p-3 pt-2 flex items-center justify-between border-t border-border/40 mt-3 gap-2">
        <div className="min-w-0">
          <span className="text-3xs text-muted-foreground block uppercase font-mono tracking-wider">
            {isActuallyFree ? "Ingresso" : "A partir de"}
          </span>
          <span className="text-xs font-bold text-foreground font-mono">
            {isActuallyFree ? "Gratuito" : `R$ ${(effectivePrice! / 100).toFixed(2)}`}
          </span>
        </div>

        <span className="h-11 min-h-11 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs inline-flex items-center justify-center gap-2 shrink-0 group-hover:bg-primary/90 transition-colors">
          <Ticket size={14} weight="bold" />
          <span>Garantir</span>
        </span>
      </div>
    </Link>
  );
}
