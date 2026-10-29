import React from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export interface RichPostContentProps {
  content: string;
  className?: string;
  isExpanded?: boolean;
  maxCharacters?: number;
}

const HIGHLIGHTER_PALETTES: Record<string, { bg: string; text: string }> = {
  yellow: { bg: "bg-amber-300/90 dark:bg-amber-300/90", text: "text-neutral-950" },
  cyan: { bg: "bg-cyan-300/90 dark:bg-cyan-300/90", text: "text-neutral-950" },
  blue: { bg: "bg-sky-300/90 dark:bg-sky-300/90", text: "text-neutral-950" },
  pink: { bg: "bg-pink-300/90 dark:bg-pink-300/90", text: "text-neutral-950" },
  green: { bg: "bg-emerald-300/90 dark:bg-emerald-300/90", text: "text-neutral-950" },
  purple: { bg: "bg-purple-300/90 dark:bg-purple-300/90", text: "text-neutral-950" },
  orange: { bg: "bg-orange-300/90 dark:bg-orange-300/90", text: "text-neutral-950" },
};

/**
 * Renderiza subformatações estilo WhatsApp / Markdown: *bold*, _italic_, ~strike~, `code`
 */
function renderInlineFormatting(text: string, baseKey: string): React.ReactNode {
  // Regex para capturar *bold*, _italic_, ~strike~, `code`
  const formattingRegex = /(\*[^*]+\*|_[^_]+_|~[^~]+~|`[^`]+`)/g;
  const parts = text.split(formattingRegex);

  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    const key = `${baseKey}-fmt-${i}`;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <strong key={key} className="font-bold text-foreground">{part.slice(1, -1)}</strong>;
    }
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      return <em key={key} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("~") && part.endsWith("~") && part.length > 2) {
      return <del key={key} className="line-through opacity-80">{part.slice(1, -1)}</del>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={key} className="px-2 py-1 rounded-sm bg-muted text-xs font-mono text-primary font-semibold">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * RichPostContent — Renderizador de Texto com Marcador Dinâmico (Highlighter Note)
 * 
 * Suporta:
 * 1. Marca-texto cromático: `==cor:texto==` (yellow, cyan, pink, green, purple, orange) e `==texto==`
 * 2. Formatações inline: `*bold*`, `_italic_`, `~strike~`, `` `code` ``
 * 3. Menções a usuários `@usuario`
 * 4. Hashtags `#tema`
 * 5. Links automáticos
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

  // Regex para capturar `==destaque==` ou `==cor:destaque==`
  const parts = displayContent.split(/(==[^=]+==)/g);

  return (
    <span className={cn("whitespace-pre-wrap leading-relaxed font-sans", className)}>
      {parts.map((part, index) => {
        // 1. Marca-texto cromático: ==texto== ou ==cor:texto==
        if (part.startsWith("==") && part.endsWith("==") && part.length > 4) {
          const rawInner = part.slice(2, -2);
          let colorKey = "yellow";
          let highlightedText = rawInner;

          const matchColor = rawInner.match(/^([a-z]+):(.*)$/);
          if (matchColor && HIGHLIGHTER_PALETTES[matchColor[1].toLowerCase()]) {
            colorKey = matchColor[1].toLowerCase();
            highlightedText = matchColor[2];
          }

          const palette = HIGHLIGHTER_PALETTES[colorKey] || HIGHLIGHTER_PALETTES.yellow;

          return (
            <span
              key={index}
              className={cn("relative inline-block px-2 py-1 mx-1 font-bold leading-tight select-text rounded-xs", palette.text)}
            >
              <span
                className={cn("absolute inset-x-0 inset-y-0 -rotate-1 rounded-xs -z-10 shadow-2xs transition-transform", palette.bg)}
                aria-hidden="true"
              />
              {renderInlineFormatting(highlightedText, `hl-${index}`)}
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
                    className="text-primary font-medium hover:underline inline-block break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    className="font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

              // Renderiza formatações inline de texto (*bold*, _italic_, ~strike~, `code`)
              return <React.Fragment key={subIndex}>{renderInlineFormatting(token, `t-${index}-${subIndex}`)}</React.Fragment>;
            })}
          </React.Fragment>
        );
      })}
    </span>
  );
}
