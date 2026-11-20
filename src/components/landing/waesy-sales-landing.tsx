import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaesySalesTabs } from "./waesy-sales-tabs";
import { VerticalLandingSections } from "./vertical-landing-sections";
import { VerticalPillarShowcase, VerticalProductPreview } from "./vertical-product-preview";
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
    <div className="space-y-0">
      <section className="py-8 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {heroBadge}
              </p>

              <div className="space-y-4">
                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight text-balance">
                  {heroTitle}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
                  {heroSubtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
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
                <Link
                  to="/explorer"
                  className="inline-flex h-11 min-h-11 items-center px-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                >
                  Explorar Cidade
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
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
              ) : heroDesktopMedia ? (
                <div className="rounded-2xl overflow-hidden border border-border bg-muted aspect-video">
                  <img src={heroDesktopMedia} alt={heroTitle} className="size-full object-cover" />
                </div>
              ) : (
                <VerticalProductPreview verticalId="pro" brandName="Waesy Pro" />
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-border/60 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground mr-2">Apps do Hub:</span>
            {hubApps.slice(0, 8).map((app) => {
              const target = resolveSubsystemHref(app, currentHost);
              return (
                <a
                  key={app.id}
                  href={target.href}
                  target={target.external ? "_blank" : undefined}
                  rel={target.external ? "noopener noreferrer" : undefined}
                  className="inline-flex h-11 min-h-11 items-center gap-1 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>{app.shortName}</span>
                  {target.external && <ExternalLink className="size-3 text-muted-foreground" />}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <VerticalPillarShowcase verticalId="pro" brandName="Waesy Pro" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
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
    </div>
  );
}
