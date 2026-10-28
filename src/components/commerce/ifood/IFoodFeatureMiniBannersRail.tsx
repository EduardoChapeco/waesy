import React from "react";
import { Link } from "@tanstack/react-router";
import { CaretRight, Sparkle, CookingPot, Car, Hamburger, Tag, Ticket, Storefront } from "@phosphor-icons/react";
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
  iconName?: string | null;
  iconUrl?: string | null;
  showText?: boolean;
}

export interface IFoodFeatureMiniBannersRailProps {
  title?: string | null;
  subtitle?: string | null;
  items?: FeatureMiniBannerItem[];
  className?: string;
}

const DEFAULT_MINI_BANNERS: FeatureMiniBannerItem[] = [
  {
    id: "fmb-clube",
    title: "Confira ofertas do clube para você",
    subtitle: "Economize em cada pedido",
    targetUrl: "/conta/creditos",
    badgeText: "CLUBE",
    actionText: "Clube >",
  },
  {
    id: "fmb-gourmet",
    title: "Experiência diferenciada",
    subtitle: "Alta gastronomia e chefs",
    targetUrl: "/gastronomia",
    badgeText: "GOURMET",
    actionText: "Gourmet >",
  },
  {
    id: "fmb-corridas",
    title: "Peça corridas e entregas rápidas",
    subtitle: "Mobilidade urbana taxa fixa",
    targetUrl: "/mobilidade",
    badgeText: "WAESY GO",
    actionText: "Corridas >",
  },
  {
    id: "fmb-turbo",
    title: "Burguer com entrega grátis",
    subtitle: "Hamburguerias da sua região",
    targetUrl: "/gastronomia",
    badgeText: "TURBO",
    actionText: "Pedir agora",
  },
];

const DEFAULT_COLORS = [
  "bg-purple-700",
  "bg-amber-700",
  "bg-rose-700",
  "bg-emerald-700",
  "bg-neutral-800",
];

function resolveMiniBannerIcon(iconName?: string | null, fallbackId?: string) {
  const map: Record<string, any> = {
    Ticket,
    Sparkle,
    CookingPot,
    Car,
    Hamburger,
    Tag,
    Storefront,
  };
  if (iconName && map[iconName]) return map[iconName];
  if (fallbackId?.includes("clube")) return Ticket;
  if (fallbackId?.includes("gourmet")) return CookingPot;
  if (fallbackId?.includes("corrida") || fallbackId?.includes("go")) return Car;
  if (fallbackId?.includes("turbo") || fallbackId?.includes("burg")) return Hamburger;
  return Sparkle;
}

export type FeatureMiniBannersRailProps = IFoodFeatureMiniBannersRailProps;

export function IFoodFeatureMiniBannersRail({
  title = "No Waesy também tem",
  subtitle,
  items = DEFAULT_MINI_BANNERS,
  className,
}: IFoodFeatureMiniBannersRailProps) {
  if (!items || items.length === 0) return null;

  return (
    <section
      aria-label={title || "Destaques Especiais"}
      className={cn("w-full space-y-2 py-1", className)}
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
          const fallbackColor = DEFAULT_COLORS[index % DEFAULT_COLORS.length];
          const hasCustomBg = Boolean(item.bgColor && item.bgColor.trim());
          const IconComponent = resolveMiniBannerIcon(item.iconName, item.id);
          const cleanAction = (item.actionText || item.title || "Conferir").replace(/\s*>\s*$/, "");

          return (
            <Link
              key={item.id}
              to={item.targetUrl as any}
              className={cn(
                "w-36 sm:w-40 h-48 sm:h-52 rounded-2xl p-3 flex flex-col justify-between shrink-0 snap-start overflow-hidden relative group transition-transform duration-200 active:scale-95 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs",
                !hasCustomBg && fallbackColor,
              )}
              style={hasCustomBg ? { backgroundColor: item.bgColor! } : undefined}
            >
              {/* Topo do Card: Badge + Título */}
              <div className="z-10 space-y-1">
                {item.badgeText && (
                  <span className="inline-block px-2 py-1 rounded-full bg-card/20 backdrop-blur-xs text-primary-foreground text-3xs font-extrabold uppercase tracking-wider">
                    {item.badgeText}
                  </span>
                )}
                {item.showText !== false && (
                  <>
                    <h3 className="text-sm font-extrabold text-primary-foreground leading-snug line-clamp-2 drop-shadow-xs">
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <p className="text-xs text-primary-foreground/80 line-clamp-1">{item.subtitle}</p>
                    )}
                  </>
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

              {/* Minifaixa Inferior Canônica (Ícone/Mídia + Rótulo + Chevron) */}
              <div className="z-10 mt-auto pt-2 flex items-center">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-neutral-950/75 backdrop-blur-md text-neutral-50 text-xs font-bold leading-none shadow-xs group-hover:bg-neutral-950/85 transition-colors max-w-full">
                  {item.iconUrl ? (
                    <img
                      src={item.iconUrl}
                      alt=""
                      className="size-4 object-contain rounded-xs shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <IconComponent size={14} weight="fill" className="shrink-0 text-neutral-100" />
                  )}
                  <span className="truncate">{cleanAction}</span>
                  <CaretRight size={12} weight="bold" className="shrink-0 text-neutral-300" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export const FeatureMiniBannersRail = IFoodFeatureMiniBannersRail;
