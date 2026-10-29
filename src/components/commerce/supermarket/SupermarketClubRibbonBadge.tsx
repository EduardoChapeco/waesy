import React, { useState, useEffect } from "react";
import { Lightning, CurrencyCircleDollar, Users, Clock } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { SupermarketPromotionalRule } from "@/services/supermarket.functions";

interface SupermarketClubRibbonBadgeProps {
  rule?: SupermarketPromotionalRule | null;
  className?: string;
}

export function SupermarketClubRibbonBadge({
  rule,
  className,
}: SupermarketClubRibbonBadgeProps) {
  if (!rule || rule.is_active === false) return null;

  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!rule.ends_at) return;

    const calculateTime = () => {
      const diff = new Date(rule.ends_at!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [rule.ends_at]);

  const hasAnyBadge =
    Boolean(rule.badge_ribbon) ||
    Boolean(rule.max_per_cpf) ||
    Boolean(rule.cashback_cents) ||
    rule.rule_type === "buy_x_pay_y" ||
    rule.rule_type === "progressive" ||
    Boolean(timeLeft);

  if (!hasAnyBadge) return null;

  return (
    <div className={cn("flex flex-col gap-1 z-10 pointer-events-none select-none", className)}>
      {/* ── Fitas Angulares no Topo (Clube K / Oferta / Progressivo) ── */}
      <div className="flex flex-wrap items-center gap-1">
        {rule.badge_ribbon && rule.badge_ribbon !== "none" ? (
          <span
            className={cn(
              "px-2 py-0.5 text-3xs font-extrabold uppercase tracking-wider rounded-md text-primary-foreground",
              rule.badge_ribbon === "clube" && "bg-blue-600 dark:bg-blue-700",
              rule.badge_ribbon === "oferta" && "bg-destructive",
              rule.badge_ribbon === "progressivo" && "bg-amber-600 dark:bg-amber-700",
              rule.badge_ribbon === "mais_por_menos" && "bg-purple-600 dark:bg-purple-700",
              rule.badge_ribbon === "compre_e_ganhe" && "bg-emerald-600 dark:bg-emerald-700",
            )}
          >
            {rule.badge_ribbon.replace(/_/g, " ")}
          </span>
        ) : null}

        {rule.rule_type === "buy_x_pay_y" && rule.buy_qty && rule.pay_qty ? (
          <span className="px-2 py-0.5 text-3xs font-extrabold uppercase tracking-wider rounded-md bg-destructive text-destructive-foreground">
            Leve {rule.buy_qty}, Pague {rule.pay_qty}
          </span>
        ) : null}
      </div>

      {/* ── Badges Secundárias: Limite por CPF & Cashback ── */}
      <div className="flex flex-wrap items-center gap-1">
        {rule.max_per_cpf ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-3xs font-medium rounded bg-muted text-muted-foreground border border-border/40">
            <Users size={10} weight="bold" />
            Máx. {rule.max_per_cpf} un/CPF
          </span>
        ) : null}

        {rule.cashback_cents && rule.cashback_cents > 0 ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-3xs font-bold rounded bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-600/30">
            <CurrencyCircleDollar size={11} weight="fill" />
            R$ {(rule.cashback_cents / 100).toFixed(2).replace(".", ",")} Cashback
          </span>
        ) : null}
      </div>

      {/* ── Faixa de Urgência com Countdown ── */}
      {timeLeft ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-3xs font-bold rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 w-max">
          <Clock size={11} weight="fill" />
          Termina em: {timeLeft}
        </span>
      ) : null}
    </div>
  );
}
