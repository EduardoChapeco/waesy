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
  gradient = "from-amber-500 via-orange-500 to-red-600",
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
        "group relative overflow-hidden rounded-lg bg-card w-56 sm:w-64 h-96 min-h-96 transition-all duration-200 active:scale-95 select-none block shrink-0 snap-start border border-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
    >
      {coverImage ? (
        <img
          src={coverImage}
          alt={ariaLabel}
          className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
          loading="lazy"
        />
      ) : (
        <div className={`size-full bg-linear-to-br ${gradient} flex flex-col justify-between p-4 text-white`}>
          {badge ? (
            <span className="self-start px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/25 text-white shadow-xs">
              {badge}
            </span>
          ) : (
            <div className="size-10 sm:size-12 rounded-lg bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-lg sm:text-xl font-mono">#1</span>
            </div>
          )}

          {title ? (
            <div className="space-y-1 z-10">
              <h3 className="font-extrabold text-sm sm:text-base leading-tight drop-shadow-sm text-white line-clamp-2">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-white/80 line-clamp-2 leading-relaxed drop-shadow-xs">
                  {subtitle}
                </p>
              )}
              <div className="pt-1 flex items-center gap-1 text-xs font-bold text-white/95 group-hover:translate-x-1 transition-transform">
                <span>{actionLabel}</span>
                <ArrowRight className="size-4" />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Se houver coverImage e title, exibe gradiente de sobreposição com textos */}
      {coverImage && title && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3.5 sm:p-4 flex flex-col justify-between text-white">
          {badge && (
            <span className="self-start px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/25 text-white">
              {badge}
            </span>
          )}
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm sm:text-base leading-tight drop-shadow-sm text-white line-clamp-2">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-white/80 line-clamp-2 leading-relaxed drop-shadow-xs">
                {subtitle}
              </p>
            )}
            <div className="pt-1 flex items-center gap-1 text-xs font-bold text-white/95 group-hover:translate-x-1 transition-transform">
              <span>{actionLabel}</span>
              <ArrowRight className="size-3.5" />
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}
