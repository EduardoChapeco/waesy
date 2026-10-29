import React from "react";
import { Link } from "@tanstack/react-router";
import { CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface EventFeatureMiniBannerItem {
  id: string;
  title: string;
  subtitle?: string | null;
  targetUrl: string;
  badgeText?: string | null;
  actionText?: string | null;
  bgColor?: string;
  imageUrl?: string | null;
}

export interface EventFeatureMiniBannersRailProps {
  title?: string;
  items?: EventFeatureMiniBannerItem[];
  className?: string;
}

export function EventFeatureMiniBannersRail({
  title = "No Waesy Eventos também tem",
  items = [],
  className,
}: EventFeatureMiniBannersRailProps) {
  // Regra B.8 & B.33: Se não há banners configurados no Admin Master / CMS, omite silenciosamente
  if (!items || items.length === 0) return null;

  return (
    <section
      aria-label={title}
      className={cn("w-full space-y-2 py-2 select-none", className)}
      data-testid="event-feature-mini-banners-rail"
    >
      <div className="px-3 sm:px-4 flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-tight">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-3 sm:px-4 snap-x snap-mandatory">
        {items.map((item) => {
          return (
            <Link
              key={item.id}
              to={item.targetUrl as any}
              className={cn(
                "w-36 h-48 sm:w-40 sm:h-52 shrink-0 snap-start rounded-2xl p-3 flex flex-col justify-between text-primary-foreground relative overflow-hidden select-none",
                "shadow-xs hover:opacity-95 active:scale-95 transition-colors duration-150 group cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              )}
              style={{
                background: item.imageUrl
                  ? undefined
                  : `linear-gradient(145deg, ${item.bgColor || "#0284c7"} 0%, #0f172a 120%)`,
              }}
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="absolute inset-0 size-full object-cover"
                />
              )}

              <div className="absolute inset-0 bg-black/50 pointer-events-none" />

              {/* Topo: Badge */}
              <div className="relative z-10">
                {item.badgeText && (
                  <span className="text-3xs font-black uppercase tracking-wider px-2 py-1 rounded-full bg-card/20 backdrop-blur-xs border border-white/30 text-primary-foreground inline-block">
                    {item.badgeText}
                  </span>
                )}
              </div>

              {/* Base: Chamada e Chip de Ação */}
              <div className="relative z-10 space-y-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold leading-tight line-clamp-2 drop-shadow-xs">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="text-3xs text-primary-foreground/80 line-clamp-1 mt-1 drop-shadow-xs">
                      {item.subtitle}
                    </p>
                  )}
                </div>

                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-card/20 backdrop-blur-md text-primary-foreground text-3xs font-bold group-hover:bg-card/30 transition-colors">
                  <span>{item.actionText || "Conferir"}</span>
                  <CaretRight size={10} weight="bold" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
