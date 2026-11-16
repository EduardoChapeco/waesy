export type WaesyEntityKind =
  | "product"
  | "store"
  | "event"
  | "classified"
  | "travel"
  | "destination"
  | "hotel"
  | "news"
  | "job"
  | "directory"
  | "place"
  | "post"
  | "recipe"
  | "contest"
  | "builder_doc";

const VALID_PREFIX_PATTERNS: ReadonlyArray<RegExp> = [
  /^\/$/,
  /^\/buscar(?:[/?#].*)?$/,
  /^\/explorar(?:[/?#].*)?$/,
  /^\/mobilidade(?:[/?#].*)?$/,
  /^\/copilot(?:[/?#].*)?$/,
  /^\/eventos(?:[/?#].*)?$/,
  /^\/evento\/[^/?#]+(?:[/?#].*)?$/,
  /^\/turismo(?:\/(?:destinos|hoteis|aluguel-carros))?(?:\/[^/?#]+)?(?:[/?#].*)?$/,
  /^\/classificados(?:\/[^/?#]+)?(?:[/?#].*)?$/,
  /^\/diretorio(?:\/[^/?#]+)?(?:[/?#].*)?$/,
  /^\/empregos(?:\/[^/?#]+)?(?:[/?#].*)?$/,
  /^\/places(?:\/[^/?#]+)?(?:[/?#].*)?$/,
  /^\/produto\/[^/?#]+(?:[/?#].*)?$/,
  /^\/loja\/[^/?#]+(?:[/?#].*)?$/,
  /^\/noticias(?:\/[^/?#]+)?(?:[/?#].*)?$/,
  /^\/concursos?(?:\/[^/?#]+)?(?:[/?#].*)?$/,
  /^\/receitas?(?:\/[^/?#]+)?(?:[/?#].*)?$/,
  /^\/publicacao\/[^/?#]+(?:[/?#].*)?$/,
  /^\/workspace(?:\/(?:copilot|estudio|produtos|pedidos|crm|financeiro|lojas|turismo|eventos|empregos|noticias|marketing(?:\/studio|\/publicacoes|\/concursos)?|configuracoes(?:\/loja)?))?(?:[/?#].*)?$/,
  /^\/workspace\/builder(?:\/[^/?#]+(?:\/editor)?)?(?:[/?#].*)?$/,
];

const INTERNAL_ROUTE_REWRITES: ReadonlyArray<[RegExp, string]> = [
  [/^\/eventos\/([^/?#]+)(.*)$/i, "/evento/$1$2"],
  [/^\/viagens\/([^/?#]+)(.*)$/i, "/turismo/$1$2"],
  [/^\/viagens(\?.*)?$/i, "/turismo$1"],
  [/^\/builder(\?.*)?$/i, "/workspace/builder$1"],
  [/^\/builder\/([^/?#]+)(\/.*)?$/i, "/workspace/builder/$1$2"],
  [/^\/produtos\/([^/?#]+)(.*)$/i, "/produto/$1$2"],
  [/^\/lojas\/([^/?#]+)(.*)$/i, "/loja/$1$2"],
  [/^\/noticia\/([^/?#]+)(.*)$/i, "/noticias/$1$2"],
  [/^\/concursos\/([^/?#]+)(.*)$/i, "/concurso/$1$2"],
  [/^\/receita\/([^/?#]+)(.*)$/i, "/receitas/$1$2"],
  [/^\/vagas\/([^/?#]+)(.*)$/i, "/empregos/$1$2"],
  [/^\/vaga\/([^/?#]+)(.*)$/i, "/empregos/$1$2"],
];

export function normalizeInternalRoute(rawRoute?: string | null): string | null {
  if (!rawRoute || typeof rawRoute !== "string") return null;
  let candidate = rawRoute.trim();
  if (!candidate) return null;

  // Strip local origin if full internal URL was passed
  try {
    if (/^https?:\/\//i.test(candidate)) {
      const parsed = new URL(candidate);
      if (parsed.hostname.endsWith("waesy.com") || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        candidate = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      } else {
        return null;
      }
    }
  } catch {
    return null;
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//")) return null;

  for (const [pattern, replacement] of INTERNAL_ROUTE_REWRITES) {
    if (pattern.test(candidate)) {
      candidate = candidate.replace(pattern, replacement);
      break;
    }
  }

  return candidate;
}

export function isValidInternalRoute(rawRoute?: string | null): boolean {
  const normalized = normalizeInternalRoute(rawRoute);
  if (!normalized) return false;
  return VALID_PREFIX_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function validateInternalRoute(rawRoute?: string | null): string | null {
  const normalized = normalizeInternalRoute(rawRoute);
  if (!normalized) return null;
  return VALID_PREFIX_PATTERNS.some((pattern) => pattern.test(normalized)) ? normalized : null;
}

export function buildValidatedEntityRoute(kind: WaesyEntityKind, idOrSlug: string): string {
  const safe = encodeURIComponent(String(idOrSlug || "").trim());
  if (!safe) return "/explorar";
  switch (kind) {
    case "product":
      return `/produto/${safe}`;
    case "store":
      return `/loja/${safe}`;
    case "event":
      return `/evento/${safe}`;
    case "classified":
      return `/classificados/${safe}`;
    case "travel":
      return `/turismo/${safe}`;
    case "destination":
      return `/turismo/destinos/${safe}`;
    case "hotel":
      return `/turismo/hoteis/${safe}`;
    case "news":
      return `/noticias/${safe}`;
    case "job":
      return `/empregos/${safe}`;
    case "directory":
      return `/diretorio/${safe}`;
    case "place":
      return `/places/${safe}`;
    case "post":
      return `/publicacao/${safe}`;
    case "recipe":
      return `/receitas/${safe}`;
    case "contest":
      return `/concurso/${safe}`;
    case "builder_doc":
      return `/workspace/builder?doc=${safe}`;
    default:
      return "/explorar";
  }
}

export const INTERNAL_ROUTE_MARKDOWN_REGEX =
  /(^|[\s(])(\/(?:eventos|evento|turismo|viagens|classificados|diretorio|empregos|places|produtos|produto|lojas|loja|noticias|noticia|concursos|concurso|receitas|receita|publicacao|builder|workspace|copilot|buscar|explorar|mobilidade)(?=[/?#\s)\],;:!.]|$)(?:\/[a-zA-Z0-9._~:/?#[\]@!$&'*+,;=%-]*)?(?:\?[a-zA-Z0-9._~&=%+-]*)?)/g;
