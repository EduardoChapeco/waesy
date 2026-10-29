import React from "react";
import { Link } from "@tanstack/react-router";
import { CalendarBlank, MapPin } from "@phosphor-icons/react";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export interface EventHorizontalCardProps {
  id: string;
  title: string;
  eventDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  venue?: string | null;
  coverImage?: string | null;
  priceCents?: number | null;
  isFree?: boolean;
  className?: string;
}

export function EventHorizontalCard({
  id,
  title,
  eventDate,
  endDate,
  location,
  venue,
  coverImage,
  priceCents,
  isFree,
  className,
}: EventHorizontalCardProps) {
  const [imageError, setImageError] = React.useState(false);

  const hasCover = Boolean(!imageError && coverImage && coverImage.trim());
  const displayLocation = venue || location || "Local a confirmar";

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
        "w-72 sm:w-80 h-24 rounded-2xl border border-border/60 bg-card p-2 flex items-center gap-3 shrink-0 snap-start select-none",
        "hover:border-foreground/30 hover:bg-muted/20 transition-colors duration-200 shadow-2xs group cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
      aria-label={title}
    >
      {/* ── Imagem Thumbnail Esquerda (Proporção 4:3) ── */}
      <div className="w-24 sm:w-28 h-full rounded-xl overflow-hidden bg-muted relative shrink-0 flex items-center justify-center">
        {hasCover ? (
          <img
            src={coverImage!}
            alt={title}
            loading="lazy"
            className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={() => setImageError(true)}
          />
        ) : (
          <CalendarBlank size={28} weight="duotone" className="text-muted-foreground/40" />
        )}
      </div>

      {/* ── Conteúdo Textual Direito: Título, Data com Ícone, Local com Pin ── */}
      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-1">
        <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {title}
        </h3>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-2xs text-muted-foreground font-mono">
            <CalendarBlank size={12} weight="bold" className="shrink-0 text-primary" />
            <span className="truncate">{formattedDate}</span>
          </div>

          <div className="flex items-center gap-1 text-2xs text-muted-foreground">
            <MapPin size={12} weight="bold" className="shrink-0 text-muted-foreground" />
            <span className="truncate">{displayLocation}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
