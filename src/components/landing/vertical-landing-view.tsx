import { Link } from "@tanstack/react-router";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VerticalLandingPageDTO } from "@/lib/vertical-landing-types";
import type { VerticalSubsystemDescriptor } from "@/lib/vertical-subsystems";
import { VerticalLandingHero, buildVerticalAuthHref } from "./vertical-landing-hero";
import { VerticalLandingSections } from "./vertical-landing-sections";
import { VerticalLandingPlans } from "./vertical-landing-plans";

export interface VerticalLandingViewProps {
  landing: VerticalLandingPageDTO;
  subsystem: VerticalSubsystemDescriptor | null;
}

export function VerticalLandingView({ landing, subsystem }: VerticalLandingViewProps) {
  const signupHref = buildVerticalAuthHref(landing, { aba: "cadastro" });
  const loginHref = buildVerticalAuthHref(landing, { aba: "login" });
  const faqs = landing.faq_items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
      <VerticalLandingHero landing={landing} subsystem={subsystem} />

      <VerticalLandingSections
        sections={landing.sections || []}
        defaultSignupHref={signupHref}
      />

      <VerticalLandingPlans landing={landing} />

      {faqs.length > 0 && (
        <section className="space-y-5">
          <div className="space-y-1">
            <Badge variant="outline" className="text-2xs font-mono gap-1">
              <HelpCircle className="size-3" />
              <span>Dúvidas Comuns</span>
            </Badge>
            <h2 className="text-xl font-bold text-foreground">Perguntas sobre o Sistema</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-5 space-y-2">
                <h3 className="text-sm font-bold text-foreground">{faq.question}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-muted/30 p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Pronto para operar no {landing.display_name}?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Seu cadastro configura automaticamente os módulos deste nicho com login unificado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button asChild variant="outline" className="h-11 min-h-11 px-5 text-xs font-semibold gap-2">
            <a href={loginHref}>
              <span>Já tenho conta</span>
            </a>
          </Button>
          <Button asChild variant="default" className="h-11 min-h-11 px-6 text-xs font-semibold gap-2">
            <a href={signupHref}>
              <span>Criar Acesso</span>
              <ArrowRight className="size-3.5" />
            </a>
          </Button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
        <span>Parte do ecossistema modular Waesy</span>
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
