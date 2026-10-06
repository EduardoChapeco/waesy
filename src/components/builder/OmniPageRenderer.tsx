/**
 * OmniPageRenderer.tsx — Renderizador Público Ultraleve & SSR-Ready
 * Isolação estrita: Não carrega nenhuma dependência ou código do Editor.
 * Lê o JSONB canônico e renderiza o HTML/CSS exato.
 */

import React from "react";
import { OmniPageDocument } from "./types";
import { getSiteBlockByIdStrict } from "./registry";

export interface OmniPageRendererProps {
  document: OmniPageDocument;
  className?: string;
}

export const OmniPageRenderer: React.FC<OmniPageRendererProps> = ({
  document,
  className = "",
}) => {
  if (!document || !document.blocks || document.blocks.length === 0) {
    return null;
  }

  const pageThemeStyle: React.CSSProperties = {
    backgroundColor: document.theme?.backgroundColor,
    color: document.theme?.textColor,
    fontFamily: document.theme?.fontFamily,
  };

  const getAnimationClass = (anim?: string) => {
    switch (anim) {
      case "fade":
        return "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300";
      case "slide-up":
        return "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-8 motion-safe:duration-300";
      case "zoom-in":
        return "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300";
      case "stagger":
        return "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300";
      default:
        return "";
    }
  };

  return (
    <div
      style={pageThemeStyle}
      className={`min-h-dvh w-full flex flex-col overflow-x-hidden bg-background text-foreground ${className}`}
    >
      {document.blocks.map((block) => {
        if (block.isHidden) return null;

        const def = getSiteBlockByIdStrict(block.type);
        if (!def) {
          if (import.meta.env?.DEV) {
            console.warn(`[OmniPageRenderer] Bloco não registrado ignorado: ${block.type}`);
          }
          return null;
        }
        const Component = def.component;
        const animClass = getAnimationClass(block.styling?.scrollAnimation);

        return (
          <div key={block.id} className={animClass ? `w-full ${animClass}` : "w-full"}>
            <Component
              id={block.id}
              data={block.config}
              styling={block.styling}
            />
          </div>
        );
      })}
    </div>
  );
};
