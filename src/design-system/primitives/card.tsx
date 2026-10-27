import * as React from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Play,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Base Card Container                                                        */
/* -------------------------------------------------------------------------- */

export interface CardBaseProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "interactive";
}

export const Card = React.forwardRef<HTMLDivElement, CardBaseProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-border/70 bg-card text-card-foreground p-5",
          variant === "subtle" && "bg-muted/30 border-border/40",
          variant === "interactive" &&
            "cursor-pointer hover:border-primary/50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "DSCard";

/* -------------------------------------------------------------------------- */
/* 1. MetricCard                                                              */
/* -------------------------------------------------------------------------- */

export interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: {
    value: string;
    isPositive?: boolean;
    period?: string;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({
  label,
  value,
  delta,
  icon,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-card p-5 flex flex-col justify-between gap-4",
        className
      )}
    >
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium tracking-tight truncate">{label}</span>
        {icon && <span className="size-5 shrink-0 text-muted-foreground">{icon}</span>}
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
          {value}
        </div>

        {delta && (
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "inline-flex items-center font-medium",
                delta.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}
            >
              {delta.isPositive ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {delta.value}
            </span>
            {delta.period && (
              <span className="text-muted-foreground">{delta.period}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. EntityCard                                                              */
/* -------------------------------------------------------------------------- */

export interface EntityCardProps {
  title: string;
  subtitle?: string;
  avatarSlot?: React.ReactNode;
  statusSlot?: React.ReactNode;
  metadataSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function EntityCard({
  title,
  subtitle,
  avatarSlot,
  statusSlot,
  metadataSlot,
  actionSlot,
  onClick,
  className,
}: EntityCardProps) {
  const isInteractive = Boolean(onClick);

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-lg border border-border/70 bg-card text-card-foreground select-none",
        isInteractive &&
          "cursor-pointer hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        {avatarSlot && <div className="shrink-0">{avatarSlot}</div>}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
            {statusSlot && <div className="shrink-0">{statusSlot}</div>}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
          {metadataSlot && <div className="pt-1">{metadataSlot}</div>}
        </div>
      </div>

      {actionSlot && <div className="shrink-0">{actionSlot}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. OfferCard                                                               */
/* -------------------------------------------------------------------------- */

export interface DSOfferCardProps {
  title: string;
  price: string;
  originalPrice?: string;
  imageUrl?: string;
  category?: string;
  location?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  badgeText?: string;
  className?: string;
}

export function OfferCard({
  title,
  price,
  originalPrice,
  imageUrl,
  category,
  location,
  ctaText = "Ver Oferta",
  onCtaClick,
  badgeText,
  className,
}: DSOfferCardProps) {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border/70 bg-card overflow-hidden transition-colors hover:border-primary/40",
        className
      )}
    >
      {/* Visual Area */}
      <div className="relative aspect-4-3 w-full bg-muted/40 overflow-hidden">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            Sem Imagem
          </div>
        )}
        {badgeText && (
          <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-md bg-background/90 backdrop-blur-xs text-2xs font-semibold text-foreground shadow-xs">
            {badgeText}
          </span>
        )}
      </div>

      {/* Content Area */}
      <div className="flex flex-col flex-1 p-4 gap-3 justify-between">
        <div className="space-y-1">
          {category && (
            <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">
              {category}
            </span>
          )}
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
            {title}
          </h3>
          {location && (
            <p className="text-xs text-muted-foreground truncate">{location}</p>
          )}
        </div>

        {/* Price & Primary CTA */}
        <div className="flex items-end justify-between gap-3 pt-2 border-t border-border/40">
          <div className="space-y-1">
            {originalPrice && (
              <span className="text-xs line-through text-muted-foreground font-mono tabular-nums">
                {originalPrice}
              </span>
            )}
            <div className="text-base font-bold text-foreground font-mono tabular-nums">
              {price}
            </div>
          </div>

          <button
            type="button"
            onClick={onCtaClick}
            className="h-11 min-h-11 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. ActionCard                                                              */
/* -------------------------------------------------------------------------- */

export interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string;
  className?: string;
}

export function ActionCard({
  title,
  description,
  icon,
  onClick,
  badge,
  className,
}: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-4 p-5 rounded-lg border border-border/70 bg-card text-left transition-colors cursor-pointer select-none",
        "hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>

      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
          {badge && (
            <span className="px-2 py-1 rounded-md bg-muted text-3xs font-medium text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. MediaCard                                                               */
/* -------------------------------------------------------------------------- */

export interface MediaCardProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  duration?: string;
  aspectRatio?: "video" | "square" | "portrait";
  onPlay?: () => void;
  badge?: string;
  className?: string;
}

export function MediaCard({
  title,
  subtitle,
  imageUrl,
  duration,
  aspectRatio = "video",
  onPlay,
  badge,
  className,
}: MediaCardProps) {
  const aspectClass =
    aspectRatio === "square"
      ? "aspect-square"
      : aspectRatio === "portrait"
      ? "aspect-4-3"
      : "aspect-video";

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-lg border border-border/70 bg-card overflow-hidden transition-colors hover:border-primary/50",
        className
      )}
    >
      <div className={cn("relative w-full bg-muted/40 overflow-hidden", aspectClass)}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            Mídia
          </div>
        )}

        {badge && (
          <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-md bg-background/90 text-2xs font-semibold text-foreground shadow-xs">
            {badge}
          </span>
        )}

        {duration && (
          <span className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-md bg-foreground/75 text-2xs font-mono tabular-nums text-primary-foreground">
            {duration}
          </span>
        )}

        {onPlay && (
          <button
            type="button"
            onClick={onPlay}
            aria-label={`Reproduzir ${title}`}
            className="absolute inset-0 flex items-center justify-center bg-foreground/25 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="size-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
              <Play className="size-5 fill-current ml-1" />
            </div>
          </button>
        )}
      </div>

      <div className="p-4 space-y-1">
        <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. DataSummaryCard                                                         */
/* -------------------------------------------------------------------------- */

export interface SummaryMetricItem {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface DataSummaryCardProps {
  title: string;
  category?: string;
  items: SummaryMetricItem[];
  footerNote?: string;
  className?: string;
}

export function DataSummaryCard({
  title,
  category,
  items,
  footerNote,
  className,
}: DataSummaryCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-card p-5 space-y-4 flex flex-col justify-between",
        className
      )}
    >
      <div className="space-y-1">
        {category && (
          <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">
            {category}
          </span>
        )}
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>

      <div className="divide-y divide-border/40">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between py-2 text-xs"
          >
            <span className="text-muted-foreground">{item.label}</span>
            <span
              className={cn(
                "font-mono tabular-nums font-semibold",
                item.highlight ? "text-primary" : "text-foreground"
              )}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {footerNote && (
        <div className="pt-2 border-t border-border/40 text-2xs text-muted-foreground">
          {footerNote}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. PreviewCard                                                             */
/* -------------------------------------------------------------------------- */

export interface PreviewCardProps {
  title: string;
  fileType: string;
  fileSize?: string;
  updatedAt?: string;
  onOpen?: () => void;
  className?: string;
}

export function PreviewCard({
  title,
  fileType,
  fileSize,
  updatedAt,
  onOpen,
  className,
}: PreviewCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-lg border border-border/70 bg-card hover:border-primary/40 transition-colors",
        className
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="size-11 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0">
          <FileText className="size-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
          <div className="flex items-center gap-2 text-2xs text-muted-foreground">
            <span className="uppercase font-mono">{fileType}</span>
            {fileSize && <span>• {fileSize}</span>}
            {updatedAt && <span>• {updatedAt}</span>}
          </div>
        </div>
      </div>

      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Abrir ${title}`}
          className="size-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer shrink-0"
        >
          <ExternalLink className="size-4" />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. InteractiveCard                                                         */
/* -------------------------------------------------------------------------- */

export interface InteractiveCardProps {
  title: string;
  description?: string;
  selected?: boolean;
  onSelect?: () => void;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string;
  className?: string;
}

export function InteractiveCard({
  title,
  description,
  selected = false,
  onSelect,
  children,
  icon,
  badge,
  className,
}: InteractiveCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={cn(
        "relative flex flex-col p-5 rounded-lg border transition-colors duration-200 cursor-pointer select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/5 shadow-xs"
          : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/20",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0">
              {icon}
            </div>
          )}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground truncate">
                {title}
              </h4>
              {badge && (
                <span className="px-2 py-1 rounded-md bg-muted text-3xs font-medium text-muted-foreground">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>

        <div
          className={cn(
            "size-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/80 bg-background"
          )}
        >
          {selected && <CheckCircle2 className="size-4" />}
        </div>
      </div>

      {children && <div className="mt-4 pt-3 border-t border-border/40">{children}</div>}
    </div>
  );
}
