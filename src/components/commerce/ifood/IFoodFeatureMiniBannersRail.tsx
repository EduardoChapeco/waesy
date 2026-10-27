import React from "react";
import { Link } from "@tanstack/react-router";
import { CaretRight, Sparkle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface FeatureMiniBannerItem {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  targetUrl: string;
  badgeText?: string | null;
  actionText?: string | null;
  bgColor?: string | null;
  textColor?: string | null;
}

export interface IFoodFeatureMiniBannersRailProps {
  title?: string | null;
  subtitle?: string | null;
  items: FeatureMiniBannerItem[];
  className?: string;
}

const DEFAULT_GRADIENTS = [
  "from-purple-600 to-indigo-700",
  "from-amber-600 to-orange-700",
  "from-rose-600 to-red-800",
  "from-emerald-600 to-teal-800",
  "from-neutral-800 to-neutral-950",
];

export function IFoodFeatureMiniBannersRail({
  title = "No Waesy também tem",
  subtitle,
  items,
  className,
}: IFoodFeatureMiniBannersRailProps) {
  if (!items || items.length === 0) return null;

  return (
    <section
      aria-label={title || "Destaques Especiais"}
      className={cn("w-full space-y-2.5 py-1", className)}
      data-testid="ifood-feature-mini-banners-rail"
    >
      {title && (
        <div className="px-3 sm:px-4 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground line-clamp-1">{subtitle}</p>
            )}
          </div>
        </div>
      )}

      {/* Trilho Snap-Scroll de Mini Banners Verticais */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-3 sm:px-4 snap-x snap-mandatory [mask-image:linear-gradient(to_right,black_92%,transparent_100%)]">
        {items.map((item, index) => {
          const fallbackGradient = DEFAULT_GRADIENTS[index % DEFAULT_GRADIENTS.length];
          const hasCustomBg = Boolean(item.bgColor && item.bgColor.trim());

          return (
            <Link
              key={item.id}
              to={item.targetUrl as any}
              className={cn(
                "w-36 sm:w-40 h-48 sm:h-52 rounded-2xl p-3 flex flex-col justify-between shrink-0 snap-start overflow-hidden relative group transition-transform duration-200 active:scale-95 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs",
                !hasCustomBg && `bg-gradient-to-br ${fallbackGradient}`,
              )}
              style={hasCustomBg ? { backgroundColor: item.bgColor! } : undefined}
            >
              {/* Topo do Card: Badge + Título */}
              <div className="z-10 space-y-1">
                {item.badgeText && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-3xs font-extrabold uppercase tracking-wider">
                    {item.badgeText}
                  </span>
                )}
                <h3 className="text-sm font-extrabold text-white leading-snug line-clamp-2 drop-shadow-xs">
                  {item.title}
                </h3>
                {item.subtitle && (
                  <p className="text-2xs text-white/80 line-clamp-1">{item.subtitle}</p>
                )}
              </div>

              {/* Imagem Central/Inferior com Aspecto Recortado */}
              {item.imageUrl && (
                <div className="absolute inset-0 flex items-end justify-center pointer-events-none overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-32 object-contain object-bottom transform group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Botão Pílula Inferior ("Clube >", "Gourmet >", etc.) */}
              {item.actionText && (
                <div className="z-10 mt-auto pt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-xs text-white text-2xs font-bold leading-none shadow-xs group-hover:bg-white/35 transition-colors">
                    <span>{item.actionText}</span>
                    <CaretRight size={12} weight="bold" />
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
