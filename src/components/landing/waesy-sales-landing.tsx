import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Layers, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WaesySalesTabs } from "./waesy-sales-tabs";
import { VerticalLandingSections } from "./vertical-landing-sections";
import { resolveSubsystemHref, type VerticalSubsystemDescriptor } from "@/lib/vertical-subsystems";
import type { VerticalLandingPageDTO } from "@/lib/vertical-landing-types";

export interface WaesySalesLandingProps {
  subsystems: VerticalSubsystemDescriptor[];
  rootLanding?: VerticalLandingPageDTO | null;
  marketplaceProducts?: any[];
  places?: any[];
  classifieds?: any[];
  news?: any[];
}

export function WaesySalesLanding({
  subsystems,
  rootLanding,
  marketplaceProducts = [],
  places = [],
  classifieds = [],
  news = [],
}: WaesySalesLandingProps) {
  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
  const hubApps = subsystems.filter((s) => s.isActive && s.showInHub && s.id !== "waesy");
  const proSub = subsystems.find((s) => s.id === "pro");
  const proHref = proSub ? resolveSubsystemHref(proSub, currentHost) : { href: "/painel", external: false };
  const heroTitle = rootLanding?.hero_title || "Sistema Modular para Empresas e Cidades";
  const heroSubtitle =
    rootLanding?.hero_subtitle ||
    "Opere com o Waesy Pro All-in-One ou utilize nossos subsistemas especializados de forma independente — todos conectados no Hub Waesy com a mesma segurança e identidade.";
  const heroBadge = rootLanding?.badge_label || "Ecossistema Modular Waesy";
  const heroDesktopMedia = rootLanding?.hero_image_desktop_url || null;
  const heroVideoMedia = rootLanding?.hero_video_url || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-10 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className={`${heroDesktopMedia || heroVideoMedia ? "lg:col-span-7" : "lg:col-span-12"} space-y-6`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono gap-2">
                <ShieldCheck className="size-3.5 text-primary" />
                <span>{heroBadge}</span>
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono">
                ERP + CRM + IA + Apps Regionais
              </Badge>
            </div>

            <div className="space-y-3 max-w-3xl">
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
                {heroTitle}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {heroSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button asChild variant="default" className="h-11 min-h-11 px-6 text-xs font-semibold gap-2">
                <a href={proHref.href} target={proHref.external ? "_blank" : undefined} rel={proHref.external ? "noopener noreferrer" : undefined}>
                  <span>{rootLanding?.hero_cta_label || "Começar no Waesy Pro"}</span>
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button asChild variant="outline" className="h-11 min-h-11 px-5 text-xs font-semibold gap-2">
                <Link to="/sistemas">
                  <span>Ver Sistemas</span>
                  <Layers className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 min-h-11 px-5 text-xs font-semibold gap-2">
                <Link to="/explorer">
                  <span>Explorar Cidade</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          {(heroVideoMedia || heroDesktopMedia) && (
            <div className="lg:col-span-5">
              {heroVideoMedia ? (
                <div className="rounded-2xl overflow-hidden border border-border bg-muted aspect-video">
                  <video
                    src={heroVideoMedia}
                    poster={heroDesktopMedia || undefined}
                    controls
                    playsInline
                    preload="metadata"
                    className="size-full object-cover"
                  />
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden border border-border bg-muted aspect-video">
                  <img src={heroDesktopMedia!} alt={heroTitle} className="size-full object-cover" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border/60 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Acesso Direto ao Hub Waesy (Apps Independentes):</p>
          <div className="flex flex-wrap gap-2">
            {hubApps.map((app) => {
              const target = resolveSubsystemHref(app, currentHost);
              return (
                <a
                  key={app.id}
                  href={target.href}
                  target={target.external ? "_blank" : undefined}
                  rel={target.external ? "noopener noreferrer" : undefined}
                  className="inline-flex h-11 min-h-11 sm:h-9 sm:min-h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>{app.shortName}</span>
                  {target.external && <ExternalLink className="size-3 text-muted-foreground" />}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <WaesySalesTabs
        subsystems={subsystems}
        marketplaceProducts={marketplaceProducts}
        places={places}
        classifieds={classifieds}
        news={news}
        currentHost={currentHost}
      />

      {rootLanding?.sections && rootLanding.sections.length > 0 && (
        <VerticalLandingSections
          sections={rootLanding.sections}
          defaultSignupHref="/painel?vertical=pro&aba=cadastro"
        />
      )}
    </div>
  );
}
