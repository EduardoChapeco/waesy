import React from "react";
import { Link } from "@tanstack/react-router";
import { Star, Heart, Tag, Storefront, Crown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface IFoodStoreCardData {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  isAd?: boolean;
  rating?: number | null;
  reviewCount?: number | null;
  deliveryTime?: string | null;
  deliveryFee?: string | null;
  couponBadge?: string | null;
  secondaryBadges?: string[];
  isFavorite?: boolean;
  hasHighlightCrown?: boolean;
}

export interface IFoodStoreFeedCardProps {
  store: IFoodStoreCardData;
  variant?: "list" | "spotlight";
  onFavoriteToggle?: (id: string) => void;
  className?: string;
}

export function IFoodStoreFeedCard({
  store,
  variant = "list",
  onFavoriteToggle,
  className,
}: IFoodStoreFeedCardProps) {
  const isSpotlight = variant === "spotlight";
  const [logoFailed, setLogoFailed] = React.useState(false);
  const [coverFailed, setCoverFailed] = React.useState(false);

  const displayLogo = !logoFailed ? (store.logoUrl || store.coverUrl || null) : null;
  const displayCover = !coverFailed ? (store.coverUrl || store.logoUrl || null) : null;
  const initial = (store.name || "L").trim().charAt(0).toUpperCase();

  // Regra B.33: Só exibe rating se for numérico e estritamente positivo
  const hasRealRating = typeof store.rating === "number" && store.rating > 0;
  const hasRealReviews = typeof store.reviewCount === "number" && store.reviewCount > 0;
  const hasDeliveryInfo = Boolean(store.deliveryTime || store.deliveryFee);

  if (isSpotlight) {
    return (
      <div
        className={cn(
          "w-60 sm:w-68 rounded-2xl bg-card border border-border/70 overflow-hidden shrink-0 snap-start flex flex-col shadow-xs group transition-transform active:scale-98 select-none",
          className,
        )}
        data-testid="ifood-store-spotlight-card"
      >
        {/* Foto Grande Superior com Overlay de Avaliação */}
        <div className="relative w-full aspect-4/3 bg-muted overflow-hidden">
          {displayCover ? (
            <img
              src={displayCover}
              alt={store.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-muted text-primary">
              <span className="text-2xl font-black">{initial}</span>
              <span className="text-3xs font-bold text-muted-foreground mt-1 max-w-[80%] truncate">
                {store.name}
              </span>
            </div>
          )}

          {/* Badge de Nota e Coroa Superior Esquerda (Apenas se houver avaliação real) */}
          {hasRealRating && (
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-xs text-white text-xs font-black flex items-center gap-1 shadow-xs">
              <Star size={13} weight="fill" className="text-amber-400" />
              <span>{store.rating!.toFixed(1)}</span>
              {store.hasHighlightCrown && (
                <Crown size={12} weight="fill" className="text-amber-300 ml-0.5" />
              )}
            </div>
          )}

          {/* Botão de Favorito Superior Direita */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavoriteToggle?.(store.id);
            }}
            aria-label="Favoritar loja"
            className="absolute top-2.5 right-2.5 size-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Heart size={16} weight={store.isFavorite ? "fill" : "bold"} className={store.isFavorite ? "text-destructive" : ""} />
          </button>
        </div>

        {/* Informações da Loja */}
        <Link
          to={`/loja/${store.slug}` as any}
          className="p-3 flex flex-col gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full overflow-hidden border border-border/60 shrink-0 bg-muted flex items-center justify-center">
              {displayLogo ? (
                <img src={displayLogo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xs font-black text-primary">{initial}</span>
              )}
            </div>
            <span className="text-sm font-bold text-foreground leading-tight truncate">
              {store.name}
            </span>
          </div>

          {/* Informações reais de entrega (Omitidas se ausentes no banco) */}
          {hasDeliveryInfo && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium leading-none">
              {store.deliveryTime && <span>{store.deliveryTime}</span>}
              {store.deliveryTime && store.deliveryFee && <span>•</span>}
              {store.deliveryFee && (
                <span className={cn(store.deliveryFee === "Grátis" && "text-emerald-600 dark:text-emerald-400 font-bold")}>
                  {store.deliveryFee}
                </span>
              )}
            </div>
          )}

          {store.couponBadge && (
            <div className="inline-flex items-center gap-1 text-2xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-md leading-none mt-0.5 self-start">
              <Tag size={12} weight="bold" />
              <span>{store.couponBadge}</span>
            </div>
          )}
        </Link>
      </div>
    );
  }

  // Padrão Lista Horizontal
  return (
    <Link
      to={`/loja/${store.slug}` as any}
      className={cn(
        "w-full p-3 rounded-2xl bg-card hover:bg-muted/30 border border-border/60 flex items-center justify-between gap-3 transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs group",
        className,
      )}
      data-testid="ifood-store-list-card"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Logo Redondo da Loja */}
        <div className="size-14 sm:size-16 rounded-full overflow-hidden border border-border/80 bg-background flex items-center justify-center shrink-0 shadow-2xs relative">
          {displayLogo ? (
            <img
              src={displayLogo}
              alt={store.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="size-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-black text-base">
              {initial}
            </div>
          )}
        </div>

        {/* Detalhes da Loja */}
        <div className="flex flex-col min-w-0 gap-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-foreground leading-tight truncate">
              {store.name}
            </span>
            {store.isAd && (
              <span className="px-1.5 py-0.2 rounded-xs border border-border/80 text-3xs font-semibold text-muted-foreground uppercase">
                Ad
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground leading-none flex-wrap">
            {/* Avaliação Real ou Omissão Total */}
            {hasRealRating && (
              <span className="inline-flex items-center gap-0.5 font-bold text-amber-500">
                <Star size={12} weight="fill" />
                <span>{store.rating!.toFixed(1)}</span>
                {hasRealReviews && (
                  <span className="text-muted-foreground font-normal">({store.reviewCount})</span>
                )}
              </span>
            )}
            {hasRealRating && hasDeliveryInfo && <span>•</span>}
            {store.deliveryTime && <span>{store.deliveryTime}</span>}
            {store.deliveryTime && store.deliveryFee && <span>•</span>}
            {store.deliveryFee && (
              <span className={cn(store.deliveryFee === "Grátis" && "text-emerald-600 dark:text-emerald-400 font-bold")}>
                {store.deliveryFee}
              </span>
            )}
          </div>

          {/* Badges de Cupons */}
          {(store.couponBadge || (store.secondaryBadges && store.secondaryBadges.length > 0)) && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {store.couponBadge && (
                <span className="px-1.5 py-0.5 rounded-sm bg-purple-500/10 text-purple-600 dark:text-purple-400 text-3xs font-extrabold flex items-center gap-0.5">
                  <Tag size={10} weight="bold" />
                  <span>{store.couponBadge}</span>
                </span>
              )}
              {store.secondaryBadges?.map((b, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground text-3xs font-semibold"
                >
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Botão de Favoritar com Alvo de Toque de 44px */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFavoriteToggle?.(store.id);
        }}
        aria-label="Favoritar"
        className="size-11 min-w-11 min-h-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted/40 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Heart size={20} weight={store.isFavorite ? "fill" : "bold"} className={store.isFavorite ? "text-destructive" : ""} />
      </button>
    </Link>
  );
}
