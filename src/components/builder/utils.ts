import React from "react";
import { OmniBlockStyling } from "./types";

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
  const legacyTwBgClass =
    styling.backgroundColor && styling.backgroundColor.startsWith("bg-")
      ? styling.backgroundColor
      : "";

  const style: React.CSSProperties = {};
  if (styling.backgroundColor && !styling.backgroundColor.startsWith("bg-")) {
    style.backgroundColor = styling.backgroundColor;
    if (styling.backgroundColor !== "var(--background)") {
      (style as Record<string, string>)["--background"] = styling.backgroundColor;
      (style as Record<string, string>)["--color-background"] = styling.backgroundColor;
    }
  }
  if (styling.textColor && !styling.textColor.startsWith("text-")) {
    style.color = styling.textColor;
    if (styling.textColor !== "var(--foreground)") {
      (style as Record<string, string>)["--foreground"] = styling.textColor;
      (style as Record<string, string>)["--color-foreground"] = styling.textColor;
      (style as Record<string, string>)["--muted-foreground"] = `color-mix(in srgb, ${styling.textColor} 72%, transparent)`;
      (style as Record<string, string>)["--color-muted-foreground"] = `color-mix(in srgb, ${styling.textColor} 72%, transparent)`;
    }
  }
  if (typeof styling.animationDelayMs === "number" && styling.animationDelayMs > 0) {
    style.animationDelay = `${styling.animationDelayMs}ms`;
  }

  return {
    className: [pyClass, roundedClass, surfaceClass, legacyTwBgClass, widthClass, borderClass]
      .filter(Boolean)
      .join(" ")
      .trim(),
    style,
  };
}
