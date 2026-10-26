import React, { useState } from "react";
import { Tag, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export interface PromoCouponBannerProps {
  title?: string;
  badge?: string;
  subtitle?: string;
  actionUrl?: string;
  actionLabel?: string;
  className?: string;
}

export function PromoCouponBanner({
  title = "Você ganhou 2 meses grátis em cupons de entrega",
  badge = "CUPOM",
  subtitle = "Economize até R$ 25 em pedidos locais",
  actionUrl = "/ofertas",
  actionLabel = "Ver Cupons",
  className,
}: PromoCouponBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-primary/20 bg-primary/5 p-3 sm:p-4 flex items-center justify-between gap-3 shadow-xs transition-colors duration-200 relative overflow-hidden",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-11 min-w-11 min-h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
          <Tag className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold uppercase px-2 py-1 rounded-md bg-primary/15 text-primary tracking-wide">
              {badge}
            </span>
          </div>
          <p className="text-xs font-bold text-foreground leading-snug line-clamp-1">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground leading-tight line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          to={actionUrl as any}
          className="h-11 min-h-11 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1 hover:opacity-90 active:scale-95 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="size-4" />
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dispensar aviso"
          className="size-11 min-w-11 min-h-11 rounded-xl text-muted-foreground/70 hover:text-foreground flex items-center justify-center hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
