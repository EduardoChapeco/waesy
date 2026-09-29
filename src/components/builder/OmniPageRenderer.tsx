/**
 * OmniPageRenderer.tsx — Renderizador Público Ultraleve & SSR-Ready
 * Isolação estrita: Não carrega nenhuma dependência ou código do Editor.
 * Lê o JSONB canônico e renderiza o HTML/CSS exato.
 */

import React from "react";
import { OmniPageDocument } from "./types";
import { getSiteBlockById } from "./registry";

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
    backgroundColor: document.theme?.backgroundColor || "#ffffff",
    color: document.theme?.textColor || "#09090b",
    fontFamily: document.theme?.fontFamily || "Inter, sans-serif",
  };

  return (
    <div
      style={pageThemeStyle}
      className={`min-h-screen w-full flex flex-col overflow-x-hidden ${className}`}
    >
      {document.blocks.map((block) => {
        if (block.isHidden) return null;

        const def = getSiteBlockById(block.type);
        const Component = def.component;

        return (
          <Component
            key={block.id}
            id={block.id}
            data={block.config}
            styling={block.styling}
          />
        );
      })}
    </div>
  );
};
