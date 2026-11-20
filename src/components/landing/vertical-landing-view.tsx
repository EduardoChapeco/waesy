import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VerticalLandingPageDTO } from "@/lib/vertical-landing-types";
import type { VerticalSubsystemDescriptor } from "@/lib/vertical-subsystems";
import { VerticalLandingHero, buildVerticalAuthHref } from "./vertical-landing-hero";
import { VerticalLandingSections } from "./vertical-landing-sections";
import { VerticalLandingPlans } from "./vertical-landing-plans";
import { VerticalPillarShowcase } from "./vertical-product-preview";

export interface VerticalLandingViewProps {
  landing: VerticalLandingPageDTO;
  subsystem: VerticalSubsystemDescriptor | null;
}

export function VerticalLandingView({ landing, subsystem }: VerticalLandingViewProps) {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const signupHref = buildVerticalAuthHref(landing, { aba: "cadastro" });
  const loginHref = buildVerticalAuthHref(landing, { aba: "login" });
  const faqs = landing.faq_items || [];

  return (
    <div className="space-y-0">
      <VerticalLandingHero landing={landing} subsystem={subsystem} />

      <VerticalPillarShowcase
        verticalId={landing.slug}
        brandName={landing.display_name}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-14">
        <VerticalLandingSections
          sections={landing.sections || []}
          defaultSignupHref={signupHref}
        />

        <VerticalLandingPlans landing={landing} />

        {faqs.length > 0 && (
          <section className="space-y-6 max-w-3xl">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Perguntas Frequentes
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Dúvidas sobre o {landing.display_name}
              </h2>
            </div>

            <div className="divide-y divide-border border-y border-border">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div key={idx}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full min-h-11 py-4 flex items-center justify-between gap-4 text-left text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="pb-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <section className="border-t border-border/60 bg-muted/30 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Comece sua operação no {landing.display_name}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Crie sua empresa agora ou acesse sua conta existente neste portal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button asChild variant="outline" className="h-11 min-h-11 px-5 text-xs font-semibold">
              <a href={loginHref}>Já tenho conta</a>
            </Button>
            <Button asChild variant="default" className="h-11 min-h-11 px-6 text-xs font-semibold gap-2">
              <a href={signupHref}>
                <span>Criar Acesso</span>
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Waesy — Sistemas Verticais</span>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/sistemas" className="hover:text-foreground underline-offset-4 hover:underline">
            Todos os Sistemas
          </Link>
          <Link to="/explorer" className="hover:text-foreground underline-offset-4 hover:underline">
            Explorar Cidade
          </Link>
          <Link to="/" className="hover:text-foreground underline-offset-4 hover:underline">
            Waesy Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
