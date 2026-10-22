import React from "react";
import { cn } from "@/lib/utils";

interface RichBioContentProps {
  content?: string | null;
  className?: string;
}

/**
 * Parser seguro de Bio Rica (Máximo 150 caracteres).
 * Suporta:
 * - ==destaque suave== (bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded)
 * - **negrito** (font-bold)
 * - *itálico* (italic)
 * - [mono]texto[/mono] (font-mono text-xs bg-muted/50 px-1 py-0.5 rounded)
 *
 * Bloqueio absoluto contra injeção de tags HTML cruas ou scripts.
 */
export function RichBioContent({ content, className }: RichBioContentProps) {
  if (!content || !content.trim()) {
    return null;
  }

  // Limite estrito defensivo de 150 caracteres
  // Renderização integral da biografia conforme Invariante B.35
  const text = content.trim();

  // Regex unificada para capturar tokens sem permitir HTML
  const tokens = parseRichBioTokens(text);

  return (
    <p
      className={cn(
        "text-xs sm:text-sm text-foreground/90 font-normal leading-relaxed whitespace-pre-line break-words",
        className
      )}
    >
      {tokens.map((token, idx) => {
        if (token.type === "highlight") {
          return (
            <span
              key={idx}
              className="inline-block bg-primary/10 text-primary font-medium px-2 py-1 rounded text-xs sm:text-xs"
            >
              {token.text}
            </span>
          );
        }
        if (token.type === "bold") {
          return (
            <strong key={idx} className="font-bold text-foreground">
              {token.text}
            </strong>
          );
        }
        if (token.type === "italic") {
          return (
            <em key={idx} className="italic text-foreground/90">
              {token.text}
            </em>
          );
        }
        if (token.type === "mono") {
          return (
            <code
              key={idx}
              className="font-mono text-xs bg-muted/60 text-foreground px-1 py-1 rounded border border-border/40"
            >
              {token.text}
            </code>
          );
        }
        return <React.Fragment key={idx}>{token.text}</React.Fragment>;
      })}
    </p>
  );
}

interface BioToken {
  type: "text" | "highlight" | "bold" | "italic" | "mono";
  text: string;
}

export function parseRichBioTokens(input: string): BioToken[] {
  const tokens: BioToken[] = [];
  const regex = /(==(.*?)==|\*\*(.*?)\*\*|\*(.*?)\*|\[mono\](.*?)\[\/mono\])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        text: input.slice(lastIndex, match.index),
      });
    }

    if (match[2] !== undefined) {
      tokens.push({ type: "highlight", text: match[2] });
    } else if (match[3] !== undefined) {
      tokens.push({ type: "bold", text: match[3] });
    } else if (match[4] !== undefined) {
      tokens.push({ type: "italic", text: match[4] });
    } else if (match[5] !== undefined) {
      tokens.push({ type: "mono", text: match[5] });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    tokens.push({
      type: "text",
      text: input.slice(lastIndex),
    });
  }

  return tokens;
}
