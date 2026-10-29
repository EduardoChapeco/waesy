import React, { useState } from "react";
import { Megaphone, X, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export interface PromoCouponBannerProps {
  title?: string;
  badge?: string;
  subtitle?: string;
  iconUrl?: string | null;
  bgColor?: string | null;
  textColor?: string | null;
  actionUrl?: string;
  actionLabel?: string;
  className?: string;
}

/**
 * PromoCouponBanner — Pílula Canônica de Cupom iFood (Paridade Estrita Image 4)
 * - Formato: Pill completa (rounded-full), sem bordas, fundo lavanda translúcido suave.
 * - Elementos: Ícone/mídia na esquerda, texto violeta em linha única clicável, botão fechar na direita.
 */
export function PromoCouponBanner({
  title = "Você ganhou 2 meses grátis em cupons!",
  iconUrl,
  bgColor,
  textColor,
  actionUrl = "/ofertas",
  className,
}: PromoCouponBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "w-full rounded-full border-0 bg-purple-100/70 dark:bg-purple-950/40 px-4 py-2 flex items-center justify-between gap-2 shadow-2xs select-none transition-colors",
        className,
      )}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
      data-testid="ifood-promo-coupon-pill"
    >
      {/* Área Clicável Principal: Ícone + Mensagem */}
      <Link
        to={actionUrl as any}
        className="flex items-center gap-2 min-w-0 flex-1 h-11 min-h-11 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full group"
      >
        <div className="size-6 min-w-6 min-h-6 flex items-center justify-center shrink-0">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              className="size-5 object-contain"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <Megaphone className="size-5 text-purple-600 dark:text-purple-400 fill-purple-500/20 group-hover:scale-110 transition-transform" />
          )}
        </div>

        <p
          className="text-xs font-semibold text-purple-900 dark:text-purple-200 truncate group-hover:underline leading-none"
          style={textColor ? { color: textColor } : undefined}
        >
          {title}
        </p>
      </Link>

      {/* Botão Dispensar (X) — Piso 44px Apple HIG */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dispensar aviso de cupom"
        className="size-11 min-w-11 min-h-11 rounded-full text-purple-700/60 dark:text-purple-300/60 hover:text-purple-900 dark:hover:text-purple-100 hover:bg-purple-200/50 dark:hover:bg-purple-900/50 flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
