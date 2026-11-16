import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ExternalLink, Layers, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VerticalLandingPageDTO } from "@/lib/vertical-landing-types";
import type { VerticalSubsystemDescriptor } from "@/lib/vertical-subsystems";

export interface VerticalLandingHeroProps {
  landing: VerticalLandingPageDTO;
  subsystem: VerticalSubsystemDescriptor | null;
}

export function buildVerticalAuthHref(
  landing: VerticalLandingPageDTO,
  opts?: { aba?: "login" | "cadastro"; sku?: string; billing?: "monthly" | "annual" },
): string {
  const params = new URLSearchParams();
  params.set("vertical", landing.slug);
  if (landing.niche_id) params.set("niche", landing.niche_id);
  const resolvedSku = opts?.sku || landing.vertical_sku;
  if (resolvedSku) params.set("sku", resolvedSku);
  if (opts?.billing) params.set("billing", opts.billing);
  if (opts?.aba) params.set("aba", opts.aba);
  return `/painel?${params.toString()}`;
}

export function VerticalLandingHero({ landing, subsystem }: VerticalLandingHeroProps) {
  const isPublicApp = subsystem?.category === "public_app";
  const signupHref = buildVerticalAuthHref(landing, { aba: "cadastro" });
  const loginHref = buildVerticalAuthHref(landing, { aba: "login" });
  const desktopMedia = landing.hero_image_desktop_url || landing.login_split_image_url || null;
  const mobileMedia = landing.hero_image_mobile_url || desktopMedia;

  return (
    <section className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {landing.logo_url && (
              <img
                src={landing.logo_url}
                alt={landing.display_name}
                className="h-8 w-auto max-w-32 object-contain"
              />
            )}
            <Badge variant="outline" className="text-xs font-mono gap-2">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>{landing.badge_label || subsystem?.shortName || landing.display_name}</span>
            </Badge>
            {subsystem?.canonicalDomain && (
              <Badge variant="secondary" className="text-xs font-mono">
                {subsystem.canonicalDomain}
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight text-balance">
              {landing.hero_title}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
              {landing.hero_subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button asChild variant="default" className="h-11 min-h-11 px-6 text-xs font-semibold gap-2">
              <a href={isPublicApp && subsystem?.targetPath ? subsystem.targetPath : signupHref}>
                <span>{landing.hero_cta_label}</span>
                <ArrowRight className="size-4" />
              </a>
            </Button>

            <Button asChild variant="outline" className="h-11 min-h-11 px-5 text-xs font-semibold gap-2">
              <a href={loginHref}>
                <span>{landing.hero_cta_secondary_label || "Entrar"}</span>
              </a>
            </Button>

            <a
              href="#planos"
              className="inline-flex h-11 min-h-11 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>Ver Planos</span>
            </a>
          </div>
        </div>

        <div className="lg:col-span-5">
          {landing.hero_video_url ? (
            <div className="rounded-2xl overflow-hidden border border-border bg-muted aspect-video">
              <video
                src={landing.hero_video_url}
                poster={desktopMedia || undefined}
                controls
                playsInline
                preload="metadata"
                className="size-full object-cover"
              />
            </div>
          ) : desktopMedia || mobileMedia ? (
            <div className="rounded-2xl overflow-hidden border border-border bg-muted aspect-video">
              {desktopMedia && (
                <img
                  src={desktopMedia}
                  alt={landing.display_name}
                  className="hidden sm:block size-full object-cover"
                />
              )}
              {mobileMedia && (
                <img
                  src={mobileMedia}
                  alt={landing.display_name}
                  className="sm:hidden size-full object-cover"
                />
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Layers className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">{landing.display_name}</p>
                    <p className="text-2xs font-mono text-muted-foreground">
                      {subsystem?.canonicalDomain || `${landing.slug}.waesy.com.br`}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-2xs font-mono shrink-0">
                  Isolado
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Módulos Exclusivos Ativos
                </p>
                {landing.isolated_modules.slice(0, 3).map((mod) => (
                  <div key={mod.id} className="flex items-start gap-2 text-xs text-foreground">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-1" />
                    <span className="font-medium leading-snug">{mod.title}</span>
                  </div>
                ))}
              </div>

              {isPublicApp && subsystem?.targetPath && (
                <a
                  href={subsystem.targetPath}
                  className="inline-flex h-11 min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>Acessar App</span>
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {landing.metrics_items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {landing.metrics_items.map((metric, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-card p-5 space-y-1">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                {metric.label}
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
                {metric.value}
              </p>
              {metric.detail && (
                <p className="text-xs text-muted-foreground">{metric.detail}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
