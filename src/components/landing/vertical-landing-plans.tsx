import { useState } from "react";
import { ArrowRight, CheckCircle2, Layers, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/state/states";
import { formatMoney } from "@/lib/money";
import type { VerticalLandingPageDTO } from "@/lib/vertical-landing-types";
import { buildVerticalAuthHref } from "./vertical-landing-hero";

export interface VerticalLandingPlansProps {
  landing: VerticalLandingPageDTO;
}

export function VerticalLandingPlans({ landing }: VerticalLandingPlansProps) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const modules = landing.isolated_modules || [];
  const plans = landing.plans || [];

  return (
    <div className="space-y-12">
      {/* Módulos Exclusivos deste Sistema / Nicho */}
      <section id="modulos" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-border/60 pb-4">
          <div className="space-y-1">
            <Badge variant="outline" className="text-2xs font-mono">
              Módulos Exclusivos
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Recursos do Nicho em Foco
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Interface focada sem recursos estranhos ao seu segmento.
          </p>
        </div>

        {modules.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Módulos em configuração"
            description="Configure os módulos exclusivos deste sistema pelo painel Admin Master."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {mod.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-border/60 aspect-video bg-muted">
                      <img
                        src={mod.imageUrl}
                        alt={mod.title}
                        className="size-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-2xs font-mono">
                      {mod.category}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">{mod.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {mod.description}
                    </p>
                  </div>
                </div>

                {mod.highlights.length > 0 && (
                  <ul className="space-y-2 pt-3 border-t border-border/50">
                    {mod.highlights.map((hl, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-foreground">
                        <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                        <span>{hl}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Planos & Pacotes Específicos do Sistema */}
      <section id="planos" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-4">
          <div className="space-y-1">
            <Badge variant="outline" className="text-2xs font-mono">
              Pacotes do Sistema
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Planos Dedicados ao Seu Nicho
            </h2>
          </div>

          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`h-11 min-h-11 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                billing === "monthly"
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={`h-11 min-h-11 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                billing === "annual"
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual (-20%)
            </button>
          </div>
        </div>

        {plans.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Planos sob consulta"
            description="Edite os pacotes desta vertical pelo painel Admin Master."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const monthlyDisplay =
                billing === "annual"
                  ? Math.round(plan.annualPriceCents / 12)
                  : plan.monthlyPriceCents;
              const ctaHref = buildVerticalAuthHref(landing, {
                aba: "cadastro",
                sku: plan.sku,
                billing,
              });

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl bg-card p-6 flex flex-col justify-between gap-6 ${
                    plan.isFeatured ? "border-2 border-primary" : "border border-border"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                      {plan.badge && (
                        <Badge
                          variant={plan.isFeatured ? "default" : "secondary"}
                          className="text-2xs font-mono shrink-0"
                        >
                          {plan.badge}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{plan.tagline}</p>

                    <div className="pt-1">
                      <span className="text-3xl font-bold font-mono tabular-nums text-foreground">
                        {formatMoney(monthlyDisplay)}
                      </span>
                      <span className="text-xs text-muted-foreground">/mês</span>
                      {billing === "annual" && (
                        <p className="text-2xs text-muted-foreground mt-1">
                          Total anual: {formatMoney(plan.annualPriceCents)}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2 pt-3 border-t border-border/50">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-foreground">
                          <CheckCircle2 className="size-4 text-primary shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.limits.length > 0 && (
                      <div className="pt-2 space-y-1">
                        {plan.limits.map((lim, idx) => (
                          <p key={idx} className="text-2xs font-mono text-muted-foreground">
                            {lim}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    asChild
                    variant={plan.isFeatured ? "default" : "outline"}
                    className="w-full h-11 min-h-11 rounded-xl text-xs font-semibold gap-2"
                  >
                    <a href={ctaHref}>
                      <span>{plan.ctaLabel}</span>
                      <ArrowRight className="size-3.5" />
                    </a>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
