import React from "react";
import { OmniBlockStyling } from "./types";

/**
 * getSectionStyle — Mapeia o OmniBlockStyling para classes utilitárias e estilos CSS inline isolados.
 * Garante que personalização profunda (cor de fundo, padding, cantos arredondados, cor do texto)
 * opere em escopo atômico no bloco, sem poluir variáveis globais ou outros blocos.
 */
export function getSectionStyle(styling?: OmniBlockStyling): {
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
  };

  const pyClass = paddingYMap[styling.paddingY || "md"] || "py-20 lg:py-28";
  const roundedClass = roundedMap[styling.borderRadius || "xl"] || "";

  const style: React.CSSProperties = {};
  if (styling.backgroundColor) {
    style.backgroundColor = styling.backgroundColor;
  }
  if (styling.textColor) {
    style.color = styling.textColor;
  }

  return {
    className: `${pyClass} ${roundedClass}`.trim(),
    style,
  };
}
