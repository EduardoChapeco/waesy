import type { ReactNode } from "react";
import { Flame } from "lucide-react";
import type { HotFlameStyle } from "@/lib/tourism/hot-offer-sanitizer";
import { cn } from "@/lib/utils";

export interface HotFlameAvatarProps {
  logoUrl?: string | null;
  storeName: string;
  activeStoriesCount: number;
  hasHotOfferStory?: boolean;
  flameStyle?: HotFlameStyle;
  badgeLabel?: string | null;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

/**
 * Wraps the agency avatar/logo in the Branded App header.
 * - When `activeStoriesCount === 0`, renders a clean static logo container.
 * - When `activeStoriesCount > 0`, renders either an Instagram-style story ring or a pixelated fire
 *   aura ("Aceso em Chamas" / "Hot Black") using semantic design tokens and honoring `prefers-reduced-motion`.
 */
export function HotFlameAvatar({
  logoUrl,
  storeName,
  activeStoriesCount,
  hasHotOfferStory = false,
  flameStyle = "pixel_fire",
  badgeLabel,
  onClick,
  className,
}: HotFlameAvatarProps) {
  const isActive = activeStoriesCount > 0;
  const effectiveStyle: HotFlameStyle = !isActive
    ? "none"
    : hasHotOfferStory
      ? flameStyle === "none"
        ? "pixel_fire"
        : flameStyle
      : "instagram_ring";

  const isPixelFlame = effectiveStyle === "pixel_fire" || effectiveStyle === "hot_black";
  const isHotBlack = effectiveStyle === "hot_black";
  const effectiveBadge =
    badgeLabel || (isHotBlack ? "BLACK" : hasHotOfferStory ? "HOT" : "STORY");

  const initials = (storeName || "AG").trim().slice(0, 2).toUpperCase();

  if (!isActive) {
    return (
      <div
        className={cn(
          "relative flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card overflow-hidden",
          className
        )}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={storeName}
            className="size-full object-cover"
          />
        ) : (
          <span className="text-xs font-black text-foreground">{initials}</span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver ${activeStoriesCount} story(s) e ofertas quentes de ${storeName}`}
      data-testid="hot-flame-avatar-trigger"
      data-flame-style={effectiveStyle}
      className={cn(
        "group relative flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {/* Outer Animated Pixel-Fire or Story Ring Aura */}
      {isPixelFlame ? (
        <span
          aria-hidden="true"
          data-testid="pixel-flame-aura"
          className={cn(
            "pointer-events-none absolute -inset-1 rounded-2xl p-1 transition-transform duration-200 group-hover:scale-105 animate-pulse motion-reduce:animate-none motion-reduce:transition-none",
            isHotBlack
              ? "bg-foreground text-warning ring-2 ring-warning/80"
              : "bg-warning/25 text-warning ring-2 ring-warning"
          )}
        >
          {/* SVG 8-Bit Pixelated Flame Crown around the top/sides of the avatar */}
          <svg
            viewBox="0 0 48 48"
            fill="none"
            className="size-full overflow-visible"
            aria-hidden="true"
          >
            {/* Outer pixel embers */}
            <rect x="6" y="0" width="4" height="4" className="fill-warning" />
            <rect x="14" y="-2" width="4" height="4" className="fill-destructive" />
            <rect x="22" y="-3" width="4" height="4" className="fill-warning" />
            <rect x="30" y="-2" width="4" height="4" className="fill-destructive" />
            <rect x="38" y="0" width="4" height="4" className="fill-warning" />
            {/* Side pixel sparks */}
            <rect x="-2" y="10" width="3" height="4" className="fill-warning" />
            <rect x="-2" y="22" width="3" height="4" className="fill-destructive" />
            <rect x="47" y="10" width="3" height="4" className="fill-warning" />
            <rect x="47" y="22" width="3" height="4" className="fill-destructive" />
          </svg>
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-primary transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
        />
      )}

      {/* Inner Avatar Container */}
      <span className="relative z-10 flex size-10 items-center justify-center rounded-lg bg-card border border-border overflow-hidden">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={storeName}
            className="size-full object-cover"
          />
        ) : (
          <span className="text-xs font-black text-foreground">{initials}</span>
        )}
      </span>

      {/* Bottom Micro-Badge ("HOT" / "BLACK" / "STORY") */}
      <span
        data-testid="hot-flame-badge"
        className={cn(
          "pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black uppercase tracking-tighter leading-none border",
          isHotBlack
            ? "bg-foreground text-warning border-warning"
            : isPixelFlame
              ? "bg-destructive text-destructive-foreground border-background"
              : "bg-primary text-primary-foreground border-background"
        )}
      >
        {isPixelFlame ? <Flame className="size-3 shrink-0" /> : null}
        <span>{effectiveBadge}</span>
      </span>
    </button>
  );
}
