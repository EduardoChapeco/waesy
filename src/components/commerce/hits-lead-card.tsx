import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HitsLeadCardProps {
  actionTo: string;
  coverImage?: string;
  gradient?: string;
  ariaLabel?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  actionLabel?: string;
  className?: string;
}

/**
 * HitsLeadCard — Card Líder de Seção / Feature Banner (Apple HIG / iFood Style)
 * Projetado para exibir banners verticais limpos ou editoriais de início de trilho.
 * Suporta modo visual limpo (#1 squircle) ou modo editorial rico com título e subtítulo.
 */
export function HitsLeadCard({
  actionTo,
  coverImage,
  gradient = "from-warning via-orange-500 to-red-600",
  ariaLabel = "Destaque da Seção",
  title,
  subtitle,
  badge,
  actionLabel = "Ver todos",
  className,
}: HitsLeadCardProps) {
  return (
    <Link
      to={actionTo as any}
      aria-label={ariaLabel}
      className={cn(
        "group relative overflow-hidden rounded-lg bg-card w-56 sm:w-64 h-96 min-h-96 transition-transform duration-200 active:scale-95 select-none block shrink-0 snap-start border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
    >
      {coverImage ? (
        <div className="relative size-full overflow-hidden bg-muted">
          <img
            src={coverImage}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover blur-xl opacity-35 scale-110 pointer-events-none select-none"
          />
          <img
            src={coverImage}
            alt={ariaLabel}
            className="relative size-full object-contain group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
            loading="lazy"
          />
        </div>
      ) : (
        <div className={cn("size-full bg-neutral-900 flex flex-col justify-between p-4 text-neutral-50", gradient && "bg-neutral-900")}>
          {badge ? (
            <span className="self-start px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-card border border-border text-foreground">
              {badge}
            </span>
          ) : (
            <div className="size-10 sm:size-12 rounded-lg bg-card border border-border flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-foreground font-black text-lg sm:text-xl font-mono">#1</span>
            </div>
          )}

          {title ? (
            <div className="space-y-1 z-10">
              <h3 className="font-extrabold text-sm sm:text-base leading-tight text-neutral-50 line-clamp-2">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-neutral-200 line-clamp-2 leading-relaxed">
                  {subtitle}
                </p>
              )}
              <div className="pt-1 flex items-center gap-1 text-xs font-bold text-neutral-50 group-hover:translate-x-1 transition-transform">
                <span>{actionLabel}</span>
                <ArrowRight className="size-4" />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Se houver coverImage e title, exibe sobreposição escura sólida para leitura */}
      {coverImage && title && (
        <div className="absolute inset-0 bg-neutral-950/70 p-4 flex flex-col justify-between text-neutral-50">
          {badge && (
            <span className="self-start px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-card border border-border text-foreground">
              {badge}
            </span>
          )}
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm sm:text-base leading-tight text-neutral-50 line-clamp-2">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-neutral-200 line-clamp-2 leading-relaxed">
                {subtitle}
              </p>
            )}
            <div className="pt-1 flex items-center gap-1 text-xs font-bold text-neutral-50 group-hover:translate-x-1 transition-transform">
              <span>{actionLabel}</span>
              <ArrowRight className="size-3.5" />
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}
