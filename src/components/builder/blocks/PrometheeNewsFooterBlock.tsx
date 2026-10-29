import React from "react";
import type { BaseSiteBlockProps, PrometheeNewsFooterBlockData } from "@/types/omni-builder";
import { Logo } from "@/components/commerce/logo";

export interface PrometheeNewsFooterBlockProps extends BaseSiteBlockProps {
  data: PrometheeNewsFooterBlockData;
  isEditing?: boolean;
}

export function PrometheeNewsFooterBlock({
  id,
  className = "",
  styling,
  data,
  isEditing = false,
}: PrometheeNewsFooterBlockProps) {
  const brandName = data?.brandName || "Waesy News";
  const tagline = data?.tagline || "Jornalismo regional independente";
  const links =
    Array.isArray(data?.links) && data.links.length > 0
      ? data.links
      : [
          { id: "f1", label: "Início", href: "/paginas/noticias" },
          { id: "f2", label: "Enviar Pauta", href: "/paginas/enviar-pauta" },
          { id: "f3", label: "Anuncie", href: "/paginas/anuncie" },
        ];

  if (links.length === 0) {
    return null;
  }

  const inlineStyle: React.CSSProperties = {};
  if (styling?.backgroundColor) inlineStyle.backgroundColor = styling.backgroundColor;
  if (styling?.textColor) inlineStyle.color = styling.textColor;

  return (
    <footer
      id={id}
      style={inlineStyle}
      className={`border-t border-border bg-background text-foreground py-8 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-base font-black tracking-tight text-foreground block">
              {brandName}
            </span>
            <p className="text-xs text-muted-foreground">{tagline}</p>
          </div>

          <nav aria-label="Links institucionais" className="flex items-center flex-wrap gap-2">
            {links.map((lnk) => (
              <a
                key={lnk.id}
                href={isEditing ? undefined : lnk.href}
                onClick={(e) => {
                  if (isEditing) e.preventDefault();
                }}
                className="h-11 min-h-11 px-3 rounded-full inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {lnk.label}
              </a>
            ))}
          </nav>
        </div>

        {data?.showWaesySignature !== false && (
          <div className="pt-4 border-t border-border/50 flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} {brandName}</span>
            <a
              href={isEditing ? undefined : "/"}
              onClick={(e) => {
                if (isEditing) e.preventDefault();
              }}
              className="h-11 min-h-11 px-2 inline-flex items-center gap-2 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>Feito com</span>
              <Logo src="/brand-logo.png" className="h-4 w-auto opacity-80" />
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}
