import * as React from "react";
import { Mail, Phone, Calendar, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* 1. CustomerRow                                                             */
/* -------------------------------------------------------------------------- */

export interface CustomerRowProps {
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  statusBadge?: React.ReactNode;
  spentTotal?: string;
  lastInteraction?: string;
  onClick?: () => void;
  className?: string;
}

export function CustomerRow({
  name,
  email,
  phone,
  avatarUrl,
  statusBadge,
  spentTotal,
  lastInteraction,
  onClick,
  className,
}: CustomerRowProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-lg border border-border/60 bg-card transition-colors select-none",
        onClick && "hover:border-primary/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground overflow-hidden shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h5 className="text-xs font-semibold text-foreground truncate">{name}</h5>
            {statusBadge}
          </div>
          <div className="flex items-center gap-2 text-2xs text-muted-foreground truncate">
            <span>{email}</span>
            {phone && <span>• {phone}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 text-right">
        {spentTotal && (
          <div>
            <span className="text-xs font-bold font-mono tabular-nums text-foreground block">
              {spentTotal}
            </span>
            {lastInteraction && (
              <span className="text-3xs text-muted-foreground block">
                {lastInteraction}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. LeadRow                                                                 */
/* -------------------------------------------------------------------------- */

export interface LeadRowProps {
  title: string;
  company?: string;
  estimatedValue: string;
  stageBadge?: React.ReactNode;
  owner?: string;
  onClick?: () => void;
  className?: string;
}

export function LeadRow({
  title,
  company,
  estimatedValue,
  stageBadge,
  owner,
  onClick,
  className,
}: LeadRowProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-4 p-3 rounded-lg border border-border/60 bg-card hover:border-primary/50 transition-colors select-none",
        onClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <h5 className="text-xs font-semibold text-foreground truncate">{title}</h5>
          {stageBadge}
        </div>
        {company && <p className="text-2xs text-muted-foreground truncate">{company}</p>}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs font-bold font-mono tabular-nums text-foreground">
          {estimatedValue}
        </span>
        {owner && <span className="text-3xs text-muted-foreground hidden sm:inline">{owner}</span>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. ActivityTimeline                                                        */
/* -------------------------------------------------------------------------- */

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  icon?: React.ReactNode;
}

export interface ActivityTimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function ActivityTimeline({ items, className }: ActivityTimelineProps) {
  return (
    <div className={cn("relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-border/60", className)}>
      {items.map((item) => (
        <div key={item.id} className="relative space-y-1">
          <div className="absolute -left-6 top-1 size-3 rounded-full border-2 border-background bg-primary ring-2 ring-primary/20" />
          <div className="flex items-center justify-between gap-2">
            <h6 className="text-xs font-semibold text-foreground">{item.title}</h6>
            <span className="text-3xs text-muted-foreground font-mono">{item.timestamp}</span>
          </div>
          {item.description && (
            <p className="text-2xs text-muted-foreground leading-relaxed">{item.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
