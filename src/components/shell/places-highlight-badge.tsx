import React from "react";
import { cn } from "@/lib/utils";

export interface PlacesHighlightBadgeProps {
  className?: string;
  subtle?: boolean;
  style?: React.CSSProperties;
}

/**
 * [USER_EXPLICIT_REQUIREMENT] — Identidade Canônica "Places (Lista Telefônica)"
 * Efeito visual de marcador de texto amarelo (Highlighter Note)
 * sobre a expressão "(Lista Telefônica)", modernizando o conceito e gerando contraste nostálgico.
 * NÃO REMOVER: Requisito explícito solicitado pelo usuário.
 */
export function PlacesHighlightBadge({ className, subtle = false, style }: PlacesHighlightBadgeProps) {
  return (
    <span style={style} className={cn("inline-flex items-center gap-1.5 font-bold tracking-tight text-foreground", className)}>
      <span>Places</span>
      <span className="relative inline-block px-1 text-neutral-950 dark:text-neutral-950 font-bold text-[0.82em] leading-tight select-none">
        <span
          className={cn(
            "absolute inset-x-0 bottom-0.5 top-0.5 bg-amber-300/90 -rotate-1 rounded-xs -z-10 shadow-2xs transition-transform",
            subtle ? "bg-amber-300/75" : "bg-amber-300/90"
          )}
          aria-hidden="true"
        />
        (Lista Telefônica)
      </span>
    </span>
  );
}
