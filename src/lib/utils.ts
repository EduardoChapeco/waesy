import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatCents(cents: number): string {
  return formatBRL((cents || 0) / 100);
}

const HTML_ENTITY_MAP: Record<string, string> = {
  aacute: "á", Aacute: "Á",
  agrave: "à", Agrave: "À",
  atilde: "ã", Atilde: "Ã",
  acirc: "â", Acirc: "Â",
  eacute: "é", Eacute: "É",
  egrave: "è", Egrave: "È",
  ecirc: "ê", Ecirc: "Ê",
  iacute: "í", Iacute: "Í",
  igrave: "ì", Igrave: "Ì",
  icirc: "î", Icirc: "Î",
  oacute: "ó", Oacute: "Ó",
  ograve: "ò", Ograve: "Ò",
  otilde: "õ", Otilde: "Õ",
  ocirc: "ô", Ocirc: "Ô",
  uacute: "ú", Uacute: "Ú",
  ugrave: "ù", Ugrave: "Ù",
  ucirc: "û", Ucirc: "Û",
  uuml: "ü", Uuml: "Ü",
  ccedil: "ç", Ccedil: "Ç",
  ntilde: "ñ", Ntilde: "Ñ",
  nbsp: " ", amp: "&", quot: '"', apos: "'",
  lsquo: "'", rsquo: "'", ldquo: '"', rdquo: '"',
  ndash: "—", mdash: "—", hellip: "...",
  lt: "<", gt: ">",
  ordm: "º", orda: "ª", deg: "°",
  copy: "©", reg: "®", trade: "™",
  bull: "•", middot: "·",
  euro: "€", pound: "£", yen: "¥", cent: "¢",
  plusmn: "±", times: "×", divide: "÷",
  sect: "§", para: "¶",
};

/**
 * Decodifica entidades HTML nomeadas e numéricas (&#...; e &...;)
 */
export function decodeHtmlEntities(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : " ";
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : " ";
    })
    .replace(/&([a-zA-Z]+);/g, (match, entity) => {
      return HTML_ENTITY_MAP[entity] ?? HTML_ENTITY_MAP[entity.toLowerCase()] ?? match;
    });
}

/**
 * Sanitiza e extrai de forma determinística mensagens de erro legíveis,
 * impedindo vazamento de "[object Object]" na UI e desempacotando erros Zod/RPC.
 */
export function extractErrorMessage(err: unknown, fallback = "Ocorreu um erro inesperado."): string {
  if (!err) return fallback;
  if (typeof err === "string") {
    const trimmed = err.trim();
    return trimmed && trimmed !== "[object Object]" ? trimmed : fallback;
  }
  if (err instanceof Error) {
    const msg = err.message;
    if (typeof msg === "string" && msg.trim() && msg !== "[object Object]") {
      try {
        const parsed = JSON.parse(msg);
        if (typeof parsed === "string" && parsed.trim() && parsed !== "[object Object]") return parsed.trim();
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.message === "string" && parsed.message.trim() && parsed.message !== "[object Object]") {
            return parsed.message.trim();
          }
          if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error.trim();
          if (Array.isArray(parsed) && parsed[0]?.message && typeof parsed[0].message === "string") {
            return parsed[0].message.trim();
          }
        }
      } catch {}
      return msg.trim();
    }
  }
  if (typeof err === "object") {
    const record = err as Record<string, any>;
    if (typeof record.message === "string" && record.message.trim() && record.message !== "[object Object]") {
      try {
        const parsed = JSON.parse(record.message);
        if (typeof parsed === "string") return parsed;
        if (parsed?.message && typeof parsed.message === "string") return parsed.message;
      } catch {}
      return record.message.trim();
    }
    if (typeof record.error === "string" && record.error.trim() && record.error !== "[object Object]") {
      return record.error.trim();
    }
    if (typeof record.statusText === "string" && record.statusText.trim()) {
      return record.statusText.trim();
    }
    if (Array.isArray(record.issues) && record.issues[0]?.message && typeof record.issues[0].message === "string") {
      return record.issues[0].message.trim();
    }
    if (Array.isArray(record.errors) && record.errors[0]?.message && typeof record.errors[0].message === "string") {
      return record.errors[0].message.trim();
    }
    if (record.data && typeof record.data === "object") {
      return extractErrorMessage(record.data, fallback);
    }
  }
  return fallback;
}
