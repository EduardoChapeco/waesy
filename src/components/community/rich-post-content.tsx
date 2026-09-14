import React from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export interface RichPostContentProps {
  content: string;
  className?: string;
  isExpanded?: boolean;
  maxCharacters?: number;
}

/**
 * RichPostContent — Renderizador de Texto com Marcador Estilo Threads (Highlighter Note)
 * 
 * Suporta:
 * 1. Marca-texto Threads Style via sintaxe `==texto destacado==`
 * 2. Menções a usuários `@usuario`
 * 3. Hashtags `#tema`
 * 4. Links automáticos
 */
export function RichPostContent({
  content,
  className,
  isExpanded = true,
  maxCharacters = 280,
}: RichPostContentProps) {
  if (!content) return null;

  const displayContent = !isExpanded && content.length > maxCharacters
    ? `${content.slice(0, maxCharacters)}...`
    : content;

  // Regex para capturar `==destaque==`, URLs, hashtags e menções
  // Delimitador `==` captura grupos
  const parts = displayContent.split(/(==[^=]+==)/g);

  return (
    <span className={cn("whitespace-pre-wrap leading-relaxed font-sans", className)}>
      {parts.map((part, index) => {
        // 1. Marca-texto estilo Threads: ==texto==
        if (part.startsWith("==") && part.endsWith("==") && part.length > 4) {
          const highlightedText = part.slice(2, -2);
          return (
            <span
              key={index}
              className="relative inline-block px-1.5 py-0.5 mx-0.5 text-neutral-950 dark:text-neutral-950 font-bold leading-tight select-text rounded-xs"
            >
              <span
                className="absolute inset-x-0 bottom-0.5 top-0.5 bg-amber-300/90 dark:bg-amber-300/95 -rotate-1 rounded-xs -z-10 shadow-2xs transition-transform"
                aria-hidden="true"
              />
              {highlightedText}
            </span>
          );
        }

        // 2. Subdivisão para hashtags, menções e links
        const subTokens = part.split(/((?:https?:\/\/[^\s]+)|(?:@[a-zA-Z0-9._-]+)|(?:#[a-zA-Z0-9_\u00C0-\u00FF]+))/g);

        return (
          <React.Fragment key={index}>
            {subTokens.map((token, subIndex) => {
              // URL
              if (token.startsWith("http://") || token.startsWith("https://")) {
                return (
                  <a
                    key={subIndex}
                    href={token}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium hover:underline inline-block break-all"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {token.replace(/^https?:\/\/(www\.)?/, "").slice(0, 30)}
                    {token.length > 35 ? "..." : ""}
                  </a>
                );
              }

              // Menção: @usuario
              if (token.startsWith("@") && token.length > 1) {
                const handle = token.slice(1);
                return (
                  <Link
                    key={subIndex}
                    to="/u/$username"
                    params={{ username: handle }}
                    className="font-bold text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {token}
                  </Link>
                );
              }

              // Hashtag: #tema
              if (token.startsWith("#") && token.length > 1) {
                return (
                  <span
                    key={subIndex}
                    className="font-semibold text-primary/90 hover:text-primary cursor-pointer hover:underline"
                  >
                    {token}
                  </span>
                );
              }

              return token;
            })}
          </React.Fragment>
        );
      })}
    </span>
  );
}
