import * as React from "react";
import { ChevronRight, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* 1. CategoryBubbleCarousel                                                  */
/* -------------------------------------------------------------------------- */

export interface CategoryBubbleItem {
  id: string;
  label: string;
  imageUrl?: string;
  icon?: React.ReactNode;
  badge?: string;
  count?: number;
}

export interface CategoryBubbleCarouselProps {
  items: CategoryBubbleItem[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

function CategoryBubbleButton({
  item,
  isSelected,
  onSelect,
}: {
  item: CategoryBubbleItem;
  isSelected: boolean;
  onSelect?: (id: string) => void;
}) {
  const [imgError, setImgError] = React.useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(item.id)}
      className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer focus-visible:outline-none"
    >
      <div
        className={cn(
          "size-16 rounded-full flex items-center justify-center p-1 border-2 transition-all",
          "focus-visible:ring-2 focus-visible:ring-ring",
          isSelected
            ? "border-primary shadow-xs ring-2 ring-primary/20"
            : "border-border/60 hover:border-primary/50 group-hover:scale-105"
        )}
      >
        {item.imageUrl && !imgError ? (
          <img
            src={item.imageUrl}
            alt={item.label}
            className="w-full h-full object-cover rounded-full"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
            {item.icon ?? <Sparkles className="size-5" />}
          </div>
        )}
      </div>

      <span
        className={cn(
          "text-2xs font-medium text-center truncate max-w-20 transition-colors",
          isSelected ? "text-primary font-bold" : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        {item.label}
      </span>
    </button>
  );
}

export function CategoryBubbleCarousel({
  items,
  selectedId,
  onSelect,
  className,
}: CategoryBubbleCarouselProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 overflow-x-auto scrollbar-none py-2 px-1 select-none",
        className
      )}
    >
      {items.map((item) => (
        <CategoryBubbleButton
          key={item.id}
          item={item}
          isSelected={item.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. HorizontalProductShelf                                                  */
/* -------------------------------------------------------------------------- */

export interface HorizontalProductShelfProps {
  title: string;
  subtitle?: string;
  viewAllLabel?: string;
  onViewAll?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function HorizontalProductShelf({
  title,
  subtitle,
  viewAllLabel = "Ver todos",
  onViewAll,
  children,
  className,
}: HorizontalProductShelfProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-end justify-between gap-4 px-1">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-2xs font-semibold text-primary hover:underline cursor-pointer shrink-0"
          >
            <span>{viewAllLabel}</span>
            <ChevronRight className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-stretch gap-4 overflow-x-auto scrollbar-none py-1 px-1">
        {children}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. OfferHero                                                               */
/* -------------------------------------------------------------------------- */

export interface OfferHeroProps {
  title: string;
  subtitle: string;
  badge?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  secondaryCtaText?: string;
  onSecondaryCtaClick?: () => void;
  imageUrl?: string;
  className?: string;
}

export function OfferHero({
  title,
  subtitle,
  badge,
  ctaText = "Aproveitar Agora",
  onCtaClick,
  secondaryCtaText,
  onSecondaryCtaClick,
  imageUrl,
  className,
}: OfferHeroProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border border-border/70 bg-card overflow-hidden p-6 md:p-10 flex flex-col justify-between gap-6",
        className
      )}
    >
      <div className="max-w-xl space-y-3 z-10">
        {badge && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-2xs font-semibold">
            {badge}
          </span>
        )}
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {subtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 z-10">
        {onCtaClick && (
          <button
            type="button"
            onClick={onCtaClick}
            className="min-h-11 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            {ctaText}
          </button>
        )}
        {secondaryCtaText && onSecondaryCtaClick && (
          <button
            type="button"
            onClick={onSecondaryCtaClick}
            className="min-h-11 px-5 py-2 rounded-lg border border-border/80 bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            {secondaryCtaText}
          </button>
        )}
      </div>

      {imageUrl && (
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 md:opacity-35 pointer-events-none overflow-hidden">
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. MediaMosaic                                                             */
/* -------------------------------------------------------------------------- */

export interface MediaMosaicItem {
  id: string;
  imageUrl: string;
  title: string;
  span?: "normal" | "featured";
}

export interface MediaMosaicProps {
  items: MediaMosaicItem[];
  onItemClick?: (id: string) => void;
  className?: string;
}

export function MediaMosaic({
  items,
  onItemClick,
  className,
}: MediaMosaicProps) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
      {items.map((item, idx) => {
        const isFeatured = item.span === "featured" || idx === 0;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick?.(item.id)}
            className={cn(
              "group relative rounded-lg overflow-hidden border border-border/60 bg-muted cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isFeatured ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
            )}
          >
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
              <span className="text-xs font-semibold text-primary-foreground truncate">
                {item.title}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. SearchResultsGrid                                                       */
/* -------------------------------------------------------------------------- */

export interface SearchResultsGridProps {
  totalCount?: number;
  isLoading?: boolean;
  emptyStateSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SearchResultsGrid({
  totalCount,
  isLoading = false,
  emptyStateSlot,
  children,
  className,
}: SearchResultsGridProps) {
  if (!isLoading && totalCount === 0 && emptyStateSlot) {
    return <div className="py-8">{emptyStateSlot}</div>;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
        className
      )}
    >
      {children}
    </div>
  );
}
