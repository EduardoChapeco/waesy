import React from "react";
import { Check, MapPin, Quote as QuoteIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CreativeThemeId =
  | "obsidian"
  | "emerald"
  | "gold"
  | "cobalt"
  | "terracotta"
  | "paper";

export type CreativeArchetype =
  | "headline_lead"
  | "bullet_checklist"
  | "promo_offer"
  | "quote"
  | "product"
  | "carousel"
  | "presentation"
  | "travel"
  | "news";

export type CreativeAspectRatio = "1:1" | "4:5" | "9:16" | "16:9";

export interface CreativeThemeTokens {
  id: CreativeThemeId;
  label: string;
  shellClass: string;
  accentPillClass: string;
  ctaClass: string;
  mutedClass: string;
  highlightClass: string;
  dividerClass: string;
  scrimClass: string;
  isLight: boolean;
}

export const CREATIVE_THEMES: Record<CreativeThemeId, CreativeThemeTokens> = {
  obsidian: {
    id: "obsidian",
    label: "Obsidian Pro",
    shellClass: "bg-neutral-950 text-neutral-50 border-neutral-800",
    accentPillClass: "bg-neutral-900 text-emerald-300 border-emerald-500/30",
    ctaClass: "bg-neutral-50 text-neutral-950",
    mutedClass: "text-neutral-300",
    highlightClass: "text-emerald-400",
    dividerClass: "border-neutral-800",
    scrimClass: "bg-neutral-950",
    isLight: false,
  },
  emerald: {
    id: "emerald",
    label: "Esmeralda Waesy",
    shellClass: "bg-emerald-950 text-emerald-50 border-emerald-800",
    accentPillClass: "bg-emerald-900 text-emerald-200 border-emerald-500/40",
    ctaClass: "bg-emerald-400 text-emerald-950",
    mutedClass: "text-emerald-200",
    highlightClass: "text-emerald-300",
    dividerClass: "border-emerald-800",
    scrimClass: "bg-emerald-950",
    isLight: false,
  },
  gold: {
    id: "gold",
    label: "Ouro Editorial",
    shellClass: "bg-stone-950 text-stone-50 border-warning/40",
    accentPillClass: "bg-stone-900 text-warning border-warning/40",
    ctaClass: "bg-warning text-warning-foreground",
    mutedClass: "text-stone-300",
    highlightClass: "text-warning",
    dividerClass: "border-warning/30",
    scrimClass: "bg-stone-950",
    isLight: false,
  },
  cobalt: {
    id: "cobalt",
    label: "Azul Cobalto",
    shellClass: "bg-slate-950 text-sky-50 border-sky-700/40",
    accentPillClass: "bg-sky-950 text-sky-200 border-sky-400/40",
    ctaClass: "bg-sky-400 text-slate-950",
    mutedClass: "text-slate-300",
    highlightClass: "text-sky-300",
    dividerClass: "border-sky-800/60",
    scrimClass: "bg-slate-950",
    isLight: false,
  },
  terracotta: {
    id: "terracotta",
    label: "Terracota Solar",
    shellClass: "bg-orange-950 text-orange-50 border-orange-700/40",
    accentPillClass: "bg-orange-900 text-orange-100 border-orange-400/40",
    ctaClass: "bg-orange-300 text-orange-950",
    mutedClass: "text-orange-200",
    highlightClass: "text-orange-300",
    dividerClass: "border-orange-800/60",
    scrimClass: "bg-orange-950",
    isLight: false,
  },
  paper: {
    id: "paper",
    label: "Papel Editorial",
    shellClass: "bg-stone-100 text-stone-900 border-stone-300",
    accentPillClass: "bg-stone-200 text-stone-900 border-stone-400/50",
    ctaClass: "bg-stone-900 text-stone-50",
    mutedClass: "text-stone-600",
    highlightClass: "text-emerald-700",
    dividerClass: "border-stone-300",
    scrimClass: "bg-stone-100",
    isLight: true,
  },
};

export interface CreativeArtboardProps {
  id?: string;
  archetype: CreativeArchetype;
  themeId: CreativeThemeId;
  aspectRatio: CreativeAspectRatio;
  badge?: string;
  headline: string;
  subheadline?: string;
  bullets?: string[];
  offerBadge?: string;
  offerPrice?: string;
  installments?: string;
  ctaText?: string;
  brandName?: string;
  brandHandle?: string;
  logoUrl?: string;
  imageUrl?: string;
  imageOverlayPercent?: number;
  qrDataUri?: string;
  slideIndex?: number;
  slideTotal?: number;
  locationLabel?: string;
  className?: string;
}

export function resolveAspectRatioClass(ratio: CreativeAspectRatio): string {
  switch (ratio) {
    case "4:5":
      return "aspect-4/5 w-full max-w-sm min-h-96";
    case "9:16":
      return "aspect-9/16 w-full max-w-xs min-h-140";
    case "16:9":
      return "aspect-video w-full max-w-xl";
    case "1:1":
    default:
      return "aspect-square w-full max-w-sm min-h-88";
  }
}

export const CreativeArtboardRenderer = React.forwardRef<HTMLDivElement, CreativeArtboardProps>(
  function CreativeArtboardRenderer(
    {
      id,
      archetype,
      themeId,
      aspectRatio,
      badge,
      headline,
      subheadline,
      bullets = [],
      offerBadge,
      offerPrice,
      installments,
      ctaText = "Saiba Mais",
      brandName = "Waesy Studio",
      brandHandle,
      logoUrl,
      imageUrl,
      imageOverlayPercent = 60,
      qrDataUri,
      slideIndex,
      slideTotal,
      locationLabel,
      className,
    },
    ref
  ) {
    const theme = CREATIVE_THEMES[themeId] || CREATIVE_THEMES.obsidian;
    const overlayOpacity = Math.max(0.15, Math.min(0.92, imageOverlayPercent / 100));

    return (
      <div
        ref={ref}
        id={id}
        className={cn(
          "relative overflow-hidden rounded-xl border p-6 sm:p-7 flex flex-col justify-between select-none transition-colors motion-reduce:transition-none",
          theme.shellClass,
          resolveAspectRatioClass(aspectRatio),
          className
        )}
      >
        {/* Fundo com imagem e scrim controlado */}
        {archetype !== "quote" && imageUrl && (
          <>
            <img
              src={imageUrl}
              alt={headline}
              crossOrigin="anonymous"
              className="absolute inset-0 size-full object-cover z-0 pointer-events-none"
            />
            <div
              className={cn("absolute inset-0 z-0 pointer-events-none", theme.scrimClass)}
              /* design-lint-ignore DL-05 reason:"Dynamic user scrim opacity slider for contrast preservation" expiry:"2030-01-01" */
              style={{ opacity: overlayOpacity }}
            />
          </>
        )}

        {/* Cabeçalho do Artboard */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName}
                crossOrigin="anonymous"
                className="size-9 rounded-full object-cover border border-current/20 shrink-0"
              />
            ) : (
              <div
                className={cn(
                  "size-9 rounded-full border flex items-center justify-center text-xs font-black shrink-0",
                  theme.accentPillClass
                )}
              >
                {(brandName || "WS").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight truncate">{brandName}</p>
              {brandHandle && (
                <p className={cn("text-2xs font-mono leading-tight truncate", theme.mutedClass)}>
                  {brandHandle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {typeof slideIndex === "number" && typeof slideTotal === "number" && slideTotal > 1 && (
              <span
                className={cn(
                  "px-2 py-1 rounded-md border text-2xs font-mono font-bold",
                  theme.accentPillClass
                )}
              >
                {String(slideIndex + 1).padStart(2, "0")}/{String(slideTotal).padStart(2, "0")}
              </span>
            )}
            {badge && (
              <span
                className={cn(
                  "px-3 py-1 rounded-full border text-2xs font-bold uppercase tracking-wider",
                  theme.accentPillClass
                )}
              >
                {badge}
              </span>
            )}
          </div>
        </div>

        {/* Corpo conforme o arquétipo */}
        <div className="relative z-10 my-auto py-4 space-y-3">
          {archetype === "quote" ? (
            <div className="space-y-4">
              <QuoteIcon className={cn("size-7 opacity-70", theme.highlightClass)} />
              <h3 className="text-lg sm:text-xl font-serif italic font-semibold leading-snug break-words">
                &ldquo;{headline}&rdquo;
              </h3>
              {subheadline && (
                <p className={cn("text-xs font-semibold tracking-wide", theme.mutedClass)}>
                  &mdash; {subheadline}
                </p>
              )}
            </div>
          ) : archetype === "bullet_checklist" ? (
            <div className="space-y-3">
              <h3 className="text-lg sm:text-xl font-extrabold leading-tight break-words">
                {headline}
              </h3>
              {subheadline && (
                <p className={cn("text-xs leading-relaxed", theme.mutedClass)}>{subheadline}</p>
              )}
              {bullets.length > 0 && (
                <ul className="space-y-2 text-xs">
                  {bullets.slice(0, 5).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className={cn("size-3.5 shrink-0 mt-1", theme.highlightClass)} />
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : archetype === "promo_offer" || archetype === "product" ? (
            <div className="space-y-3">
              {offerBadge && (
                <span className="inline-block px-2 py-1 rounded-md bg-destructive text-destructive-foreground text-2xs font-bold uppercase tracking-wider">
                  {offerBadge}
                </span>
              )}
              <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight break-words">
                {headline}
              </h3>
              {subheadline && (
                <p className={cn("text-xs leading-relaxed line-clamp-3", theme.mutedClass)}>
                  {subheadline}
                </p>
              )}
              {offerPrice && (
                <div className={cn("pt-2 border-t flex items-baseline justify-between gap-2", theme.dividerClass)}>
                  <div>
                    <span className={cn("text-2xs block", theme.mutedClass)}>A partir de</span>
                    <span className={cn("text-2xl sm:text-3xl font-black tracking-tight font-mono", theme.highlightClass)}>
                      {offerPrice}
                    </span>
                  </div>
                  {installments && (
                    <span className={cn("text-xs font-medium", theme.mutedClass)}>{installments}</span>
                  )}
                </div>
              )}
            </div>
          ) : archetype === "travel" ? (
            <div className="space-y-3">
              {locationLabel && (
                <div className={cn("inline-flex items-center gap-2 text-2xs font-bold uppercase tracking-wider", theme.highlightClass)}>
                  <MapPin className="size-3.5" />
                  <span>{locationLabel}</span>
                </div>
              )}
              <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight break-words">
                {headline}
              </h3>
              {subheadline && (
                <p className={cn("text-xs leading-relaxed", theme.mutedClass)}>{subheadline}</p>
              )}
              {bullets.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {bullets.slice(0, 4).map((tag, i) => (
                    <span
                      key={i}
                      className={cn("px-3 py-1 rounded-md border text-2xs font-semibold", theme.accentPillClass)}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {offerPrice && (
                <div className="pt-1 flex items-baseline gap-2">
                  <span className={cn("text-xl sm:text-2xl font-black font-mono", theme.highlightClass)}>
                    {offerPrice}
                  </span>
                  {installments && <span className={cn("text-2xs", theme.mutedClass)}>{installments}</span>}
                </div>
              )}
            </div>
          ) : archetype === "presentation" ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-8 space-y-2">
                <span className={cn("inline-flex items-center gap-1 text-2xs font-mono uppercase tracking-wider", theme.highlightClass)}>
                  Apresentação Comercial
                </span>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight break-words">
                  {headline}
                </h3>
                {subheadline && (
                  <p className={cn("text-xs leading-relaxed", theme.mutedClass)}>{subheadline}</p>
                )}
              </div>
              {bullets.length > 0 && (
                <div className={cn("sm:col-span-4 rounded-lg border p-3 space-y-2", theme.accentPillClass)}>
                  {bullets.slice(0, 3).map((b, i) => (
                    <p key={i} className="text-2xs font-semibold leading-snug">
                      {i + 1}. {b}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : archetype === "news" ? (
            <div className="space-y-3">
              <span className="inline-block px-2 py-1 rounded bg-destructive text-destructive-foreground text-2xs font-bold uppercase tracking-wider">
                {offerBadge || "Plantão"}
              </span>
              <h3 className="text-lg sm:text-xl font-black leading-snug break-words">{headline}</h3>
              {subheadline && (
                <p className={cn("text-xs leading-relaxed line-clamp-3", theme.mutedClass)}>
                  {subheadline}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xl sm:text-2xl font-black leading-tight break-words">
                {headline}
              </h3>
              {subheadline && (
                <p className={cn("text-xs sm:text-sm leading-relaxed", theme.mutedClass)}>
                  {subheadline}
                </p>
              )}
              {offerBadge && (
                <span className={cn("inline-block px-3 py-1 rounded-lg text-2xs font-bold border", theme.accentPillClass)}>
                  {offerBadge}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Rodapé com CTA e QR opcional */}
        <div className={cn("relative z-10 pt-3 border-t flex items-center justify-between gap-3", theme.dividerClass)}>
          <div className="min-w-0">
            <span className={cn("text-2xs block truncate", theme.mutedClass)}>
              {ctaText ? "Ação recomendada" : brandName}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ctaText && (
              <span className={cn("px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap", theme.ctaClass)}>
                {ctaText}
              </span>
            )}
            {qrDataUri && (
              // design-lint-ignore DL-18 reason:"QR code scanner quiet-zone requires guaranteed white backing regardless of dark theme" expiry:"2027-12-31"
              <div className="p-1 rounded bg-white shrink-0">
                <img
                  src={qrDataUri}
                  alt="QR Code"
                  crossOrigin="anonymous"
                  className="size-8 object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
