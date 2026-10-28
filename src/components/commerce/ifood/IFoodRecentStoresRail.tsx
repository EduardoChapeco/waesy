import React from "react";
import { Link } from "@tanstack/react-router";
import { Storefront, Tag, ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface RecentStoreItem {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  badge?: string | null;
  category?: string | null;
}

export interface IFoodRecentStoresRailProps {
  title?: string;
  viewMoreTo?: string;
  stores: RecentStoreItem[];
  className?: string;
}

export type RecentStoresRailProps = IFoodRecentStoresRailProps;

export function IFoodRecentStoresRail({
  title = "Últimas lojas",
  viewMoreTo = "/lojas",
  stores,
  className,
}: IFoodRecentStoresRailProps) {
  if (!stores || stores.length === 0) return null;

  return (
    <section
      aria-label={title}
      className={cn("w-full space-y-2 py-1", className)}
      data-testid="ifood-recent-stores-rail"
    >
      <div className="px-3 sm:px-4 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
          {title}
        </h2>
        {viewMoreTo && (
          <Link
            to={viewMoreTo as any}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 select-none"
          >
            <span>Ver mais</span>
            <ArrowRight size={12} weight="bold" />
          </Link>
        )}
      </div>

      {/* Trilho de Cards Squircle de Lojas Recentes */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-3 sm:px-4 snap-x snap-mandatory [mask-image:linear-gradient(to_right,black_92%,transparent_100%)]">
        {stores.map((store) => (
          <Link
            key={store.id}
            to={`/loja/${store.slug}` as any}
            className="w-28 sm:w-32 h-32 sm:h-36 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/60 p-2 flex flex-col items-center justify-between shrink-0 snap-start transition-transform duration-200 active:scale-95 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs group text-center"
          >
            {/* Logo Redondo Central com Sombra */}
            <div className="size-14 sm:size-16 rounded-full overflow-hidden border border-border/80 bg-background flex items-center justify-center shrink-0 shadow-xs relative group-hover:scale-105 transition-transform">
              {store.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="size-full bg-muted flex items-center justify-center text-primary font-black text-lg">
                  {(store.name || "L").trim().charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Badge Verde ("R$ 5 off" ou "Grátis") */}
            {store.badge && (
              <div className="inline-flex items-center gap-1 px-2 py-0.2 rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-3xs font-black tracking-tight leading-none">
                <Tag size={10} weight="bold" />
                <span>{store.badge}</span>
              </div>
            )}

            {/* Nome da Loja */}
            <span className="text-xs font-bold text-foreground leading-tight line-clamp-2 w-full break-words">
              {store.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export const RecentStoresRail = IFoodRecentStoresRail;
