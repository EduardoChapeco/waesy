import React from "react";
import { OmniBlockStyling } from "./types";
import { pickContrastForeground } from "@/lib/builder/block-data-resolver";

/**
 * getSectionStyle — Mapeia o OmniBlockStyling para classes utilitárias e estilos CSS inline isolados.
 * Suporta padding bidirecional (mobilePaddingY vs paddingY), presets de superfície e escopo atômico.
 */
export function getSectionStyle(styling?: OmniBlockStyling, isMobile = false): {
  className: string;
  style: React.CSSProperties;
} {
  if (!styling) {
    return {
      className: "py-20 lg:py-28",
      style: {},
    };
  }

  const paddingYMap: Record<string, string> = {
    none: "py-0",
    sm: "py-8 sm:py-10",
    md: "py-16 sm:py-20",
    lg: "py-20 sm:py-28",
    xl: "py-28 sm:py-36",
  };

  const paddingTopMap: Record<string, string> = {
    none: "pt-0",
    sm: "pt-8 sm:pt-10",
    md: "pt-16 sm:pt-20",
    lg: "pt-20 sm:pt-28",
    xl: "pt-28 sm:pt-36",
  };

  const paddingBottomMap: Record<string, string> = {
    none: "pb-0",
    sm: "pb-8 sm:pb-10",
    md: "pb-16 sm:pb-20",
    lg: "pb-20 sm:pb-28",
    xl: "pb-28 sm:pb-36",
  };

  const roundedMap: Record<string, string> = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    full: "rounded-full",
  };

  const surfaceMap: Record<string, string> = {
    default: "",
    muted: "bg-muted/40",
    card: "bg-card border border-border/60",
    accent: "bg-primary/5 border border-primary/20",
  };

  const maxWidthMap: Record<string, string> = {
    sm: "max-w-2xl mx-auto",
    md: "max-w-4xl mx-auto",
    lg: "max-w-5xl mx-auto",
    xl: "max-w-6xl mx-auto",
    "7xl": "max-w-7xl mx-auto",
    full: "w-full",
  };

  const alignMap: Record<string, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  const shadowMap: Record<string, string> = {
    none: "",
    sm: "shadow-xs",
    md: "shadow-xs ring-1 ring-border/50",
    lg: "shadow-xs ring-1 ring-border",
  };

  const gradientMap: Record<string, string> = {
    soft: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, var(--background)) 0%, var(--background) 100%)",
    vivid:
      "linear-gradient(135deg, color-mix(in srgb, var(--primary) 26%, var(--background)) 0%, color-mix(in srgb, var(--primary) 8%, var(--background)) 100%)",
    dark_scrim:
      "linear-gradient(180deg, color-mix(in srgb, var(--foreground) 88%, var(--background)) 0%, color-mix(in srgb, var(--foreground) 72%, var(--primary)) 100%)",
  };

  const activePaddingKey =
    isMobile && styling.mobilePaddingY ? styling.mobilePaddingY : styling.paddingY || "md";
  const hasGranularPadding = Boolean(styling.paddingTop || styling.paddingBottom);
  const pyClass = hasGranularPadding
    ? [
        paddingTopMap[styling.paddingTop || activePaddingKey] || "",
        paddingBottomMap[styling.paddingBottom || activePaddingKey] || "",
      ]
        .filter(Boolean)
        .join(" ")
    : paddingYMap[activePaddingKey] || "py-20 lg:py-28";
  const roundedClass = styling.borderRadius ? roundedMap[styling.borderRadius] || "" : "";
  const surfaceClass = styling.surfacePreset ? surfaceMap[styling.surfacePreset] || "" : "";
  const widthClass = styling.maxWidth ? maxWidthMap[styling.maxWidth] || "" : "";
  const borderClass = styling.border ? "border border-border/70" : "";
  const alignClass = styling.textAlign ? alignMap[styling.textAlign] || "" : "";
  const shadowClass = styling.shadow ? shadowMap[styling.shadow] || "" : "";
  const legacyTwBgClass =
    styling.backgroundColor && styling.backgroundColor.startsWith("bg-")
      ? styling.backgroundColor
      : "";

  const style: React.CSSProperties = {};
  const cssVars = style as Record<string, string>;
  const customBg =
    styling.backgroundColor && !styling.backgroundColor.startsWith("bg-")
      ? styling.backgroundColor
      : null;
  const explicitFg =
    styling.textColor && !styling.textColor.startsWith("text-")
      ? styling.textColor
      : null;
  const resolvedFg =
    explicitFg ||
    (customBg && customBg !== "var(--background)" ? pickContrastForeground(customBg) : null);

  if (customBg) {
    style.backgroundColor = customBg;
    if (customBg !== "var(--background)") {
      cssVars["--background"] = customBg;
      cssVars["--color-background"] = customBg;
      const fgMix = resolvedFg || "var(--foreground)";
      const derivedCard = `color-mix(in srgb, ${customBg} 94%, ${fgMix} 6%)`;
      const derivedMuted = `color-mix(in srgb, ${customBg} 88%, ${fgMix} 12%)`;
      const derivedBorder = `color-mix(in srgb, ${fgMix} 16%, ${customBg} 84%)`;
      cssVars["--card"] = derivedCard;
      cssVars["--color-card"] = derivedCard;
      cssVars["--muted"] = derivedMuted;
      cssVars["--color-muted"] = derivedMuted;
      cssVars["--border"] = derivedBorder;
      cssVars["--color-border"] = derivedBorder;
    }
  }
  if (resolvedFg) {
    style.color = resolvedFg;
    if (resolvedFg !== "var(--foreground)") {
      cssVars["--foreground"] = resolvedFg;
      cssVars["--color-foreground"] = resolvedFg;
      cssVars["--card-foreground"] = resolvedFg;
      cssVars["--color-card-foreground"] = resolvedFg;
      const derivedMutedFg = `color-mix(in srgb, ${resolvedFg} 70%, transparent)`;
      cssVars["--muted-foreground"] = derivedMutedFg;
      cssVars["--color-muted-foreground"] = derivedMutedFg;
    }
  }
  if (styling.accentColor && styling.accentColor !== "var(--primary)") {
    const primaryFg = pickContrastForeground(styling.accentColor);
    cssVars["--primary"] = styling.accentColor;
    cssVars["--color-primary"] = styling.accentColor;
    cssVars["--primary-foreground"] = primaryFg;
    cssVars["--color-primary-foreground"] = primaryFg;
    cssVars["--ring"] = styling.accentColor;
    cssVars["--color-ring"] = styling.accentColor;
  }
  if (styling.fontFamily && styling.fontFamily !== "inherit") {
    style.fontFamily = styling.fontFamily;
    cssVars["--font-sans"] = styling.fontFamily;
  }
  if (styling.backgroundGradient && gradientMap[styling.backgroundGradient]) {
    style.backgroundImage = gradientMap[styling.backgroundGradient];
  }
  if (typeof styling.animationDelayMs === "number" && styling.animationDelayMs > 0) {
    style.animationDelay = `${styling.animationDelayMs}ms`;
  }

  return {
    className: [
      pyClass,
      roundedClass,
      surfaceClass,
      legacyTwBgClass,
      widthClass,
      borderClass,
      alignClass,
      shadowClass,
    ]
      .filter(Boolean)
      .join(" ")
      .trim(),
    style,
  };
}
