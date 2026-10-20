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
