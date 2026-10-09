import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Copy,
  Check,
  ChalkboardTeacher,
  Code as CodeIcon,
  Sparkle,
  BookmarkSimple,
  Info,
  Warning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface CopilotMessageRendererProps {
  content: string;
  isUser?: boolean;
  className?: string;
}

/**
 * Pre-processa texto para suportar recursos visuais solicitados:
 * - Marca-texto: ==destaque== -> <mark>destaque</mark>
 * - Sublinhado: ~sublinhado~ ou <u>sublinhado</u> ou ++sublinhado++ -> <u>sublinhado</u>
 * - Lousa / Quadro interativo: blocos :::lousa ... ::: ou ```lousa ... ```
 */
function preprocessMarkdown(text: string): string {
  if (!text) return "";

  let processed = text;

  // Normaliza marca-texto: ==palavra== -> <mark class="copilot-highlight">palavra</mark>
  processed = processed.replace(/==([^=\n]+)==/g, '<mark class="copilot-highlight">$1</mark>');

  // Normaliza sublinhado: ~palavra~ ou ++palavra++ -> <u class="copilot-underline">$1</u>
  processed = processed.replace(/(?<!\w)\+\+([^\+\n]+)\+\+(?!\w)/g, '<u class="copilot-underline">$1</u>');
  processed = processed.replace(/(?<!\w)~([^~\n]+)~(?!~)(?!\w)/g, '<u class="copilot-underline">$1</u>');

  return processed;
}

/**
 * Componente de Lousa Interativa (Quadro Negro / Whiteboard Digital)
 * Permite que a IA desenhe tabelas de raciocínio, esquemas e tópicos em formato de lousa
 */
function BlackboardBlock({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-slate-700/80 bg-slate-950/95 text-slate-100 shadow-lg overflow-hidden font-sans">
      {/* Moldura superior da lousa com giz e ferramentas */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <ChalkboardTeacher className="size-3.5" weight="bold" />
          </div>
          <span className="font-semibold text-2xs tracking-wide uppercase text-slate-300">
            {title || "Lousa Interativa do Copilot"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-2xs text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 cursor-pointer"
          title="Copiar conteúdo da lousa"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>

      {/* Superfície da Lousa com efeito sutil de giz e tipografia nítida */}
      <div className="p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed space-y-1.5 text-emerald-300/90 selection:bg-emerald-500/30">
        <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm text-slate-200">
          {code}
        </pre>
      </div>
    </div>
  );
}

/**
 * Bloco de Código Estilizado com Botão de Cópia
 */
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-lg border border-border/60 bg-muted/50 overflow-hidden text-xs font-mono">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/80 border-b border-border/40 text-2xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider">
          <CodeIcon className="size-3 text-primary" />
          <span>{language || "código"}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
        >
          {copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
          <span>{copied ? "Copiado" : "Copiar"}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto leading-relaxed text-foreground/90 font-mono text-2xs sm:text-xs">
        {code}
      </pre>
    </div>
  );
}

export function CopilotMessageRenderer({ content, isUser = false, className }: CopilotMessageRendererProps) {
  if (isUser) {
    return (
      <div className={cn("text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words", className)}>
        {content}
      </div>
    );
  }

  const sanitizedContent = preprocessMarkdown(content);

  return (
    <div
      className={cn(
        "copilot-rich-renderer text-xs sm:text-sm leading-relaxed text-foreground break-words space-y-2",
        className
      )}
    >
      <ReactMarkdown
        components={{
          // Parágrafo com entrelinha ergonômica
          p: ({ children }) => (
            <p className="my-1.5 leading-relaxed text-foreground/95 break-words">
              {children}
            </p>
          ),

          // Negrito elegante e destacado
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">
              {children}
            </strong>
          ),

          // Itálico sutil
          em: ({ children }) => (
            <em className="italic text-foreground/90 font-medium">
              {children}
            </em>
          ),

          // Cabeçalhos proporcionais e limpos
          h1: ({ children }) => (
            <h1 className="text-base sm:text-lg font-extrabold text-foreground mt-3 mb-1.5 tracking-tight border-b border-border/40 pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm sm:text-base font-bold text-foreground mt-2.5 mb-1 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs sm:text-sm font-bold text-primary mt-2 mb-1">
              {children}
            </h3>
          ),

          // Listas não-ordenadas e ordenadas
          ul: ({ children }) => (
            <ul className="my-2 ml-4 list-disc space-y-1 text-foreground/90 marker:text-primary">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 ml-4 list-decimal space-y-1 text-foreground/90 marker:text-primary font-medium">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1 text-foreground/90">
              {children}
            </li>
          ),

          // Citações em estilo callout moderno
          blockquote: ({ children }) => (
            <blockquote className="my-2.5 pl-3.5 py-1.5 border-l-2 border-primary bg-primary/5 rounded-r-lg text-foreground/90 italic text-xs leading-relaxed">
              {children}
            </blockquote>
          ),

          // Tabelas limpas e responsivas
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border/50 bg-card">
              <table className="w-full border-collapse text-2xs sm:text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/60 border-b border-border/60 text-foreground font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/30 text-foreground/90">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/20 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="p-2 sm:p-2.5 text-left font-bold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="p-2 sm:p-2.5 text-left">
              {children}
            </td>
          ),

          // Links externos seguros com estilo semântico
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-primary font-medium underline underline-offset-2 hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
            >
              {children}
            </a>
          ),

          // Blocos de código / Lousa interativa
          code: ({ className: codeClassName, children }) => {
            const match = /language-(\w+)/.exec(codeClassName || "");
            const language = match ? match[1].toLowerCase() : "";
            const rawText = String(children).replace(/\n$/, "");

            // Se for marcado como lousa, quadro, chalkboard, board -> renderiza Lousa
            if (language === "lousa" || language === "quadro" || language === "chalkboard" || language === "board") {
              return <BlackboardBlock code={rawText} title="Quadro de Raciocínio & Ideias" />;
            }

            // Se for bloco multiline
            if (codeClassName && match) {
              return <CodeBlock code={rawText} language={language} />;
            }

            // Inline code
            return (
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-2xs sm:text-xs text-primary font-semibold border border-border/40">
                {children}
              </code>
            );
          },
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
}
