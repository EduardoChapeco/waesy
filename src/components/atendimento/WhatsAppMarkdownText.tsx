import type { ReactNode } from "react";
import { SmartPhoneText } from "@/components/atendimento/SmartPhoneText";
import type { WhatsAppChannelInstanceDTO } from "@/services/whatsapp-channel-instances.functions";

interface WhatsAppMarkdownTextProps {
  text: string;
  instances?: WhatsAppChannelInstanceDTO[];
  onStartWhatsAppCall?: (phoneE164: string, instanceId?: string) => void;
}

const TOKEN_RE =
  /(https?:\/\/[^\s<>"'`]+)|(`[^`\n]+`)|(\*(?=\S)[^\n*]+?\S?\*)|(_(?=\S)[^\n_]+?\S?_)|(~(?=\S)[^\n~]+?\S?~)/g;

/**
 * Renderiza formatacao nativa segura do WhatsApp (*negrito*, _italico_, ~tachado~, `codigo` e links https)
 * como nos React puros (zero dangerouslySetInnerHTML), preservando SmartPhoneText clicavel.
 */
export function WhatsAppMarkdownText({
  text,
  instances = [],
  onStartWhatsAppCall,
}: WhatsAppMarkdownTextProps) {
  const source = String(text || "");
  if (!source) return null;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  let tokenIdx = 0;

  for (const match of source.matchAll(TOKEN_RE)) {
    const rawMatch = match[0] || "";
    const start = match.index ?? -1;
    if (start < 0 || !rawMatch) continue;

    // Respeitar delimitadores embutidos dentro de identificadores (ex.: link_com_underscore)
    const prevChar = start > 0 ? source[start - 1] : "";
    const nextChar = start + rawMatch.length < source.length ? source[start + rawMatch.length] : "";
    const isDelimiterFormatted =
      rawMatch.startsWith("*") || rawMatch.startsWith("_") || rawMatch.startsWith("~");
    if (isDelimiterFormatted && /[a-zA-Z0-9]/.test(prevChar) && /[a-zA-Z0-9]/.test(nextChar)) {
      continue;
    }

    if (start > cursor) {
      const plain = source.slice(cursor, start);
      nodes.push(
        <SmartPhoneText
          key={`pl-${tokenIdx++}`}
          text={plain}
          instances={instances}
          onStartWhatsAppCall={onStartWhatsAppCall}
        />,
      );
    }

    if (match[1]) {
      const cleanHref = match[1].replace(/[),.;!?]+$/, "");
      const trailingPunct = match[1].slice(cleanHref.length);
      nodes.push(
        <a
          key={`lnk-${tokenIdx++}`}
          href={cleanHref}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 font-medium break-all hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          {cleanHref}
        </a>,
      );
      if (trailingPunct) {
        nodes.push(<span key={`tr-${tokenIdx++}`}>{trailingPunct}</span>);
      }
    } else if (match[2]) {
      nodes.push(
        <code
          key={`cd-${tokenIdx++}`}
          className="px-1 py-1 rounded bg-muted/70 font-mono text-xs"
        >
          {match[2].slice(1, -1)}
        </code>,
      );
    } else if (match[3]) {
      const inner = match[3].slice(1, -1);
      nodes.push(
        <strong key={`b-${tokenIdx++}`} className="font-bold">
          <SmartPhoneText
            text={inner}
            instances={instances}
            onStartWhatsAppCall={onStartWhatsAppCall}
          />
        </strong>,
      );
    } else if (match[4]) {
      const inner = match[4].slice(1, -1);
      nodes.push(
        <em key={`i-${tokenIdx++}`} className="italic">
          <SmartPhoneText
            text={inner}
            instances={instances}
            onStartWhatsAppCall={onStartWhatsAppCall}
          />
        </em>,
      );
    } else if (match[5]) {
      const inner = match[5].slice(1, -1);
      nodes.push(
        <s key={`s-${tokenIdx++}`} className="line-through opacity-80">
          <SmartPhoneText
            text={inner}
            instances={instances}
            onStartWhatsAppCall={onStartWhatsAppCall}
          />
        </s>,
      );
    }

    cursor = start + rawMatch.length;
  }

  if (cursor < source.length) {
    nodes.push(
      <SmartPhoneText
        key={`tail-${tokenIdx++}`}
        text={source.slice(cursor)}
        instances={instances}
        onStartWhatsAppCall={onStartWhatsAppCall}
      />,
    );
  }

  return <>{nodes.length > 0 ? nodes : source}</>;
}
