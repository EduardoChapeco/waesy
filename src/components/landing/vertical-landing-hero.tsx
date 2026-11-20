import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VerticalLandingPageDTO } from "@/lib/vertical-landing-types";
import type { VerticalSubsystemDescriptor } from "@/lib/vertical-subsystems";
import { VerticalProductPreview } from "./vertical-product-preview";

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
    <section className="py-8 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-3">
              {landing.logo_url && (
                <img
                  src={landing.logo_url}
                  alt={landing.display_name}
                  className="h-8 w-auto max-w-32 object-contain"
                />
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {landing.badge_label || subsystem?.shortName || landing.display_name}
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight text-balance">
                {landing.hero_title}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
                {landing.hero_subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild variant="default" className="h-11 min-h-11 px-6 text-xs font-semibold gap-2">
                <a href={isPublicApp && subsystem?.targetPath ? subsystem.targetPath : signupHref}>
                  <span>{landing.hero_cta_label}</span>
                  <ArrowRight className="size-4" />
                </a>
              </Button>

              <Button asChild variant="outline" className="h-11 min-h-11 px-5 text-xs font-semibold">
                <a href={loginHref}>
                  <span>{landing.hero_cta_secondary_label || "Entrar"}</span>
                </a>
              </Button>

              <a
                href="#planos"
                className="inline-flex h-11 min-h-11 items-center px-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
              >
                Ver Planos
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
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
              <VerticalProductPreview
                verticalId={landing.slug}
                brandName={landing.display_name}
              />
            )}
          </div>
        </div>

        {landing.metrics_items.length > 0 && (
          <div className="border-y border-border/60 py-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {landing.metrics_items.map((metric, idx) => (
              <div key={idx} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {metric.label}
                </p>
                <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground">
                  {metric.value}
                </p>
                {metric.detail && (
                  <p className="text-xs text-muted-foreground">{metric.detail}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
