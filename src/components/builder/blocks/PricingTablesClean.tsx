import React, { useState } from "react";
import { PricingBlockData } from "../types";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PricingTablesCleanProps {
  data: PricingBlockData;
  className?: string;
}

export const PricingTablesClean: React.FC<PricingTablesCleanProps> = ({ data, className = "" }) => {
  const [isAnnual, setIsAnnual] = useState(false);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <section className={`w-full bg-background py-20 lg:py-28 border-b border-border/40 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Cabeçalho */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-4 [text-wrap:balance]">
            {data.title}
          </h2>
          {data.subtitle && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8">
              {data.subtitle}
            </p>
          )}

          {/* Toggle Mensal / Anual */}
          <div className="inline-flex items-center gap-3 p-1.5 rounded-full bg-muted/60 border border-border/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-1.5 rounded-full transition-all ${
                !isAnnual ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground"
              }`}
            >
              Faturamento Mensal
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                isAnnual ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground"
              }`}
            >
              <span>Faturamento Anual</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                -20% OFF
              </span>
            </button>
          </div>
        </div>

        {/* Grid de 3 Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {data.tiers.map((tier) => {
            const rawPrice = isAnnual && tier.priceAnnualCents ? tier.priceAnnualCents : tier.priceMonthlyCents;
            const priceFormatted = formatPrice(rawPrice);

            return (
              <div
                key={tier.id}
                className={`relative rounded-3xl p-8 sm:p-10 flex flex-col justify-between transition-all ${
                  tier.isPopular
                    ? "bg-foreground text-background shadow-xl ring-2 ring-foreground"
                    : "bg-card text-foreground border border-border/80 shadow-xs hover:border-border"
                }`}
              >
                {/* Badge Popular */}
                {tier.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-md flex items-center gap-1.5">
                    <Sparkles className="size-3.5 fill-current" />
                    <span>Mais Escolhido</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold tracking-tight">
                      {tier.name}
                    </h3>
                    {tier.badge && !tier.isPopular && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {tier.badge}
                      </span>
                    )}
                  </div>

                  <p className={`text-xs sm:text-sm leading-relaxed mb-6 ${
                    tier.isPopular ? "text-background/80" : "text-muted-foreground"
                  }`}>
                    {tier.description}
                  </p>

                  <div className="flex items-baseline gap-1.5 mb-8">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight font-mono">
                      {priceFormatted}
                    </span>
                    <span className={`text-xs font-semibold uppercase tracking-wider ${
                      tier.isPopular ? "text-background/60" : "text-muted-foreground"
                    }`}>
                      /mês
                    </span>
                  </div>

                  {/* Lista de Recursos */}
                  <div className="space-y-3 mb-8">
                    {tier.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm">
                        <Check className={`size-4 shrink-0 mt-0.5 ${
                          tier.isPopular ? "text-emerald-400" : "text-emerald-600"
                        }`} />
                        <span className={tier.isPopular ? "text-background/90" : "text-foreground"}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botão de Contratação */}
                <Button
                  size="lg"
                  className={`w-full h-12 rounded-xl text-sm font-bold transition-transform active:scale-95 ${
                    tier.isPopular
                      ? "bg-background text-foreground hover:bg-background/90 shadow-md"
                      : "bg-foreground text-background hover:bg-foreground/90"
                  }`}
                >
                  {tier.ctaLabel}
                </Button>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
