import * as React from "react";
import { Link as LinkIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface MarkdownInspectorFieldProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
}

/**
 * Campo editor de Markdown canônico para o Inspetor do OmniBuilder.
 * Preserva a barra tátil de atalhos (**Negrito**, *Itálico*, H2, H3, lista, citação, link)
 * e contador de caracteres com piso 44x44px e foco visível WCAG 2.2 AA.
 */
export function MarkdownInspectorField({
  value,
  onChange,
  label,
  placeholder,
}: MarkdownInspectorFieldProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (prefix: string, suffix = "") => {
    const el = textareaRef.current;
    const currentVal = value || "";
    if (!el) {
      onChange(`${currentVal}${prefix}texto${suffix}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = currentVal.substring(start, end) || "texto";
    const newVal =
      currentVal.substring(0, start) + prefix + selected + suffix + currentVal.substring(end);
    onChange(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 10);
  };

  const toolbarBtnClass =
    "min-h-11 min-w-11 px-2 h-11 flex items-center justify-center rounded-lg hover:bg-muted text-xs cursor-pointer text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <div className="space-y-2 p-3 rounded-xl bg-muted/20 border border-border/60">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-bold text-foreground">
          {label || "Texto Formatado (Markdown)"}
        </Label>
        <span className="text-2xs font-mono text-muted-foreground">
          {(value || "").length} chars
        </span>
      </div>

      <div className="flex items-center gap-1 p-1 bg-background border border-border/70 rounded-lg flex-wrap">
        <button
          type="button"
          onClick={() => insertFormatting("**", "**")}
          title="Negrito (**texto**)"
          aria-label="Inserir negrito"
          className={`${toolbarBtnClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-black`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => insertFormatting("*", "*")}
          title="Itálico (*texto*)"
          aria-label="Inserir itálico"
          className={`${toolbarBtnClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary italic font-serif`}
        >
          I
        </button>
        <div className="w-px h-5 bg-border/60 mx-1" aria-hidden="true" />
        <button
          type="button"
          onClick={() => insertFormatting("## ")}
          title="Título (H2)"
          aria-label="Inserir título H2"
          className={`${toolbarBtnClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-bold`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => insertFormatting("### ")}
          title="Subtítulo (H3)"
          aria-label="Inserir subtítulo H3"
          className={`${toolbarBtnClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-semibold`}
        >
          H3
        </button>
        <div className="w-px h-5 bg-border/60 mx-1" aria-hidden="true" />
        <button
          type="button"
          onClick={() => insertFormatting("- ")}
          title="Lista (- item)"
          aria-label="Inserir lista com marcadores"
          className={`${toolbarBtnClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
        >
          •
        </button>
        <button
          type="button"
          onClick={() => insertFormatting("> ")}
          title="Citação (> destaque)"
          aria-label="Inserir citação"
          className={`${toolbarBtnClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
        >
          ”
        </button>
        <button
          type="button"
          onClick={() => insertFormatting("[link](", ")")}
          title="Inserir Link ([texto](url))"
          aria-label="Inserir link Markdown"
          className={`${toolbarBtnClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-primary`}
        >
          <LinkIcon className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <Textarea
        ref={textareaRef}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg text-xs min-h-24 bg-background font-sans leading-relaxed resize-y border-border/80"
        placeholder={
          placeholder || "Escreva o texto aqui... Suporta **negrito**, *itálico*, links e listas."
        }
      />
    </div>
  );
}
