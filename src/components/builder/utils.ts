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

  const roundedMap: Record<string, string> = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-lg",
    "2xl": "rounded-lg",
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
  const pyClass = paddingYMap[activePaddingKey] || "py-20 lg:py-28";
  const roundedClass = roundedMap[styling.borderRadius || "xl"] || "";
  const surfaceClass = styling.surfacePreset ? surfaceMap[styling.surfacePreset] || "" : "";
  const widthClass = styling.maxWidth ? maxWidthMap[styling.maxWidth] || "" : "";
  const borderClass = styling.border ? "border border-border/70" : "";

  const style: React.CSSProperties = {};
  if (styling.backgroundColor) {
    style.backgroundColor = styling.backgroundColor;
  }
  if (styling.textColor) {
    style.color = styling.textColor;
  }

  return {
    className: [pyClass, roundedClass, surfaceClass, widthClass, borderClass]
      .filter(Boolean)
      .join(" ")
      .trim(),
    style,
  };
}
