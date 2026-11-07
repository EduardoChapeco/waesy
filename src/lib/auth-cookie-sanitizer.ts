/**
 * auth-cookie-sanitizer.ts — Resolução Determinística e Auto-Cura de Cookies de Sessão
 *
 * Resolve colisões entre:
 * 1. Cookies host-only vs cookies com Domain=.waesy.com.br / .usewaesy.com
 * 2. Sessões unchunked (`waesy-auth-token` <= 3180 bytes) vs sessões chunked (`waesy-auth-token.0`, `.1`)
 * 3. Chunks órfãos superiores (`.2`, `.3`) deixados por sessões antigas maiores
 * 4. Cookies legados `sb-<project>-auth-token*`
 *
 * Garante que tanto o Servidor (`getSSRClient`) quanto o Navegador (`getBrowserClient`)
 * entreguem ao `@supabase/ssr` exclusivamente o conjunto de cookies íntegro com o
 * maior `exp` (token mais recente), eliminando desconexões espontâneas e loops de login.
 */

export interface RawCookieEntry {
  name: string;
  value: string;
}

interface ParsedSessionMetadata {
  accessToken: string;
  refreshToken: string;
  userId: string | null;
  expiresAt: number;
  issuedAt: number;
}

const AUTH_COOKIE_BASE = "waesy-auth-token";
const CODE_VERIFIER_COOKIE = "waesy-auth-token-code-verifier";
const LEGACY_SB_REGEX = /^sb-\w+-auth-token(\.\d+)?$/;
const LEGACY_SB_VERIFIER_REGEX = /^sb-\w+-auth-token-code-verifier$/;

function decodeBase64Flexible(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + "=".repeat(padLen);

    if (typeof atob === "function") {
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    }
    if (typeof Buffer !== "undefined") {
      return Buffer.from(padded, "base64").toString("utf-8");
    }
    return null;
  } catch {
    return null;
  }
}

function extractJwtTimestamps(jwt: string): { exp: number; iat: number } {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return { exp: 0, iat: 0 };
    const decoded = decodeBase64Flexible(parts[1]);
    if (!decoded) return { exp: 0, iat: 0 };
    const payload = JSON.parse(decoded);
    return {
      exp: typeof payload?.exp === "number" ? payload.exp : 0,
      iat: typeof payload?.iat === "number" ? payload.iat : 0,
    };
  } catch {
    return { exp: 0, iat: 0 };
  }
}

/**
 * Decodifica uma string bruta de sessão do `@supabase/ssr` (com ou sem prefixo `base64-` e URL-encoding)
 * e retorna seus metadados se e somente se for um JSON de sessão válido com `access_token` e `refresh_token`.
 */
export function inspectEncodedSessionString(raw: string): ParsedSessionMetadata | null {
  if (!raw || typeof raw !== "string") return null;
  let candidate = raw.trim();
  if (!candidate) return null;

  // Remove aspas envolventes se presentes
  if (candidate.startsWith('"') && candidate.endsWith('"') && candidate.length >= 2) {
    candidate = candidate.slice(1, -1);
  }

  // Tenta decodificar URL encoding se houver %
  if (candidate.includes("%")) {
    try {
      candidate = decodeURIComponent(candidate);
    } catch {
      // mantém original se falhar
    }
  }

  let jsonStr = candidate;
  if (candidate.startsWith("base64-")) {
    const decoded = decodeBase64Flexible(candidate.slice("base64-".length));
    if (!decoded) return null;
    jsonStr = decoded;
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.access_token !== "string" ||
      !parsed.access_token ||
      typeof parsed.refresh_token !== "string" ||
      !parsed.refresh_token
    ) {
      return null;
    }

    const jwtTimes = extractJwtTimestamps(parsed.access_token);
    const expiresAt =
      jwtTimes.exp ||
      (typeof parsed.expires_at === "number" ? parsed.expires_at : 0);

    return {
      accessToken: parsed.access_token,
      refreshToken: parsed.refresh_token,
      userId: parsed.user?.id || null,
      expiresAt,
      issuedAt: jwtTimes.iat,
    };
  } catch {
    return null;
  }
}

interface CandidateCookieSet {
  cookies: RawCookieEntry[];
  meta: ParsedSessionMetadata;
  orderIndex: number;
}

/**
 * Recebe a lista bruta de cookies (de `parseCookieHeader` ou `document.cookie`),
 * testa todas as combinações possíveis de sessão (unchunked e chunked) e retorna
 * uma lista limpa contendo apenas o conjunto vencedor (mais recente e íntegro).
 */
export function resolveCanonicalAuthCookies(rawCookies: RawCookieEntry[]): RawCookieEntry[] {
  if (!rawCookies || rawCookies.length === 0) return [];

  const nonAuthCookies = new Map<string, string>();
  const unchunkedOccurrences: Array<{ value: string; index: number }> = [];
  const chunkOccurrences = new Map<number, Array<{ value: string; index: number }>>();
  let latestCodeVerifier: string | null = null;

  // Verifica se há tokens waesy-auth-token*; se não houver, permite mapear sb-*-auth-token*
  const hasAnyWaesyToken = rawCookies.some(
    (c) =>
      (c.name === AUTH_COOKIE_BASE || /^waesy-auth-token\.\d+$/.test(c.name)) &&
      Boolean(c.value?.trim()),
  );

  rawCookies.forEach((raw, idx) => {
    const val = (raw.value ?? "").trim();
    let name = raw.name?.trim() || "";
    if (!name) return;

    if (!hasAnyWaesyToken) {
      if (LEGACY_SB_REGEX.test(name)) {
        name = name.replace(/^sb-\w+-auth-token/, AUTH_COOKIE_BASE);
      } else if (LEGACY_SB_VERIFIER_REGEX.test(name)) {
        name = CODE_VERIFIER_COOKIE;
      }
    } else if (LEGACY_SB_REGEX.test(name) || LEGACY_SB_VERIFIER_REGEX.test(name)) {
      // Ignora cookies legados sb-* quando já existem cookies waesy-auth-token
      return;
    }

    if (name === CODE_VERIFIER_COOKIE) {
      if (val) latestCodeVerifier = val;
      return;
    }

    if (name === AUTH_COOKIE_BASE) {
      if (val) {
        unchunkedOccurrences.push({ value: val, index: idx });
      }
      return;
    }

    const chunkMatch = name.match(/^waesy-auth-token\.(\d+)$/);
    if (chunkMatch) {
      if (val) {
        const chunkIdx = parseInt(chunkMatch[1], 10);
        const list = chunkOccurrences.get(chunkIdx) || [];
        list.push({ value: val, index: idx });
        chunkOccurrences.set(chunkIdx, list);
      }
      return;
    }

    // Demais cookies da plataforma: mantém a última ocorrência não vazia
    if (val || !nonAuthCookies.has(name)) {
      nonAuthCookies.set(name, raw.value ?? "");
    }
  });

  const validCandidates: CandidateCookieSet[] = [];

  // 1. Avalia candidatos unchunked (`waesy-auth-token`)
  for (const item of unchunkedOccurrences) {
    const meta = inspectEncodedSessionString(item.value);
    if (meta) {
      validCandidates.push({
        cookies: [{ name: AUTH_COOKIE_BASE, value: item.value }],
        meta,
        orderIndex: item.index,
      });
    }
  }

  // 2. Avalia candidatos chunked (`waesy-auth-token.0`, `.1`, ...)
  const chunk0List = chunkOccurrences.get(0) || [];
  if (chunk0List.length > 0) {
    // Determina o maior índice contíguo disponível a partir de 0
    let maxContiguous = 0;
    while (chunkOccurrences.has(maxContiguous + 1)) {
      maxContiguous++;
    }

    // Gera combinações por slot (ex: primeira ocorrência de cada chunk vs última ocorrência de cada chunk)
    const maxVariants = Math.max(
      ...Array.from(chunkOccurrences.values()).map((arr) => arr.length),
    );

    const variantSelectors: Array<(arr: Array<{ value: string; index: number }>) => { value: string; index: number }> = [
      // Última ocorrência de cada chunk (frequentemente a mais recente no header)
      (arr) => arr[arr.length - 1],
      // Primeira ocorrência de cada chunk
      (arr) => arr[0],
    ];
    for (let v = 0; v < maxVariants; v++) {
      variantSelectors.push((arr) => arr[Math.min(v, arr.length - 1)]);
    }

    // Testa comprimentos de 1 até maxContiguous + 1 (ignora chunks órfãos finais se uma sessão menor for válida!)
    for (let endIdx = 0; endIdx <= maxContiguous; endIdx++) {
      for (const selectFn of variantSelectors) {
        const chosenChunks: RawCookieEntry[] = [];
        let combinedValue = "";
        let maxOrderIdx = 0;

        for (let cIdx = 0; cIdx <= endIdx; cIdx++) {
          const list = chunkOccurrences.get(cIdx)!;
          const picked = selectFn(list);
          chosenChunks.push({
            name: `${AUTH_COOKIE_BASE}.${cIdx}`,
            value: picked.value,
          });
          combinedValue += picked.value;
          if (picked.index > maxOrderIdx) maxOrderIdx = picked.index;
        }

        const meta = inspectEncodedSessionString(combinedValue);
        if (meta) {
          validCandidates.push({
            cookies: chosenChunks,
            meta,
            orderIndex: maxOrderIdx,
          });
        }
      }
    }
  }

  const result: RawCookieEntry[] = [];
  for (const [name, value] of nonAuthCookies.entries()) {
    result.push({ name, value });
  }
  if (latestCodeVerifier) {
    result.push({ name: CODE_VERIFIER_COOKIE, value: latestCodeVerifier });
  }

  if (validCandidates.length > 0) {
    // Ordena pelo maior `expiresAt`, depois maior `issuedAt`, depois maior `orderIndex` (último cookie no header)
    validCandidates.sort((a, b) => {
      if (b.meta.expiresAt !== a.meta.expiresAt) {
        return b.meta.expiresAt - a.meta.expiresAt;
      }
      if (b.meta.issuedAt !== a.meta.issuedAt) {
        return b.meta.issuedAt - a.meta.issuedAt;
      }
      return b.orderIndex - a.orderIndex;
    });

    const winner = validCandidates[0];
    result.push(...winner.cookies);
    return result;
  }

  // Fallback defensivo caso o formato seja opaco/desconhecido:
  // Prioriza o último unchunked ou a última sequência de chunks sem misturar ambos
  if (unchunkedOccurrences.length > 0 && chunk0List.length === 0) {
    result.push({
      name: AUTH_COOKIE_BASE,
      value: unchunkedOccurrences[unchunkedOccurrences.length - 1].value,
    });
  } else if (chunk0List.length > 0) {
    let idx = 0;
    while (chunkOccurrences.has(idx)) {
      const list = chunkOccurrences.get(idx)!;
      result.push({
        name: `${AUTH_COOKIE_BASE}.${idx}`,
        value: list[list.length - 1].value,
      });
      idx++;
    }
  }

  return result;
}

/**
 * Parseia uma string `Cookie` (ou `document.cookie`) preservando TODAS as ocorrências
 * (inclusive cookies duplicados de escopos de domínio distintos).
 */
export function parseRawCookieStringPreservingDuplicates(cookieString: string): RawCookieEntry[] {
  if (!cookieString || typeof cookieString !== "string") return [];
  const entries: RawCookieEntry[] = [];
  const parts = cookieString.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const name = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (name) {
      entries.push({ name, value });
    }
  }
  return entries;
}

/**
 * Retorna a lista de domínios legados que devem ser expirados proativamente
 * para erradicar cookies duplicados (`Domain=.waesy.com.br` vs host-only).
 */
export function getLegacyCookieDomainsToPurge(hostname: string): string[] {
  const clean = (hostname || "").toLowerCase().split(":")[0].trim();
  const domains = new Set<string>();
  if (clean.includes("waesy.com.br")) {
    domains.add(".waesy.com.br");
    domains.add("waesy.com.br");
  }
  if (clean.includes("usewaesy.com")) {
    domains.add(".usewaesy.com");
    domains.add("usewaesy.com");
  }
  if (clean && !clean.includes("localhost") && !/^\d+\.\d+\.\d+\.\d+$/.test(clean)) {
    domains.add(`.${clean}`);
  }
  return Array.from(domains);
}

/**
 * Nomes de todos os cookies de autenticação e chunks que devem ser higienizados.
 */
export const AUTH_COOKIE_CHUNK_NAMES = [
  AUTH_COOKIE_BASE,
  `${AUTH_COOKIE_BASE}.0`,
  `${AUTH_COOKIE_BASE}.1`,
  `${AUTH_COOKIE_BASE}.2`,
  `${AUTH_COOKIE_BASE}.3`,
  `${AUTH_COOKIE_BASE}.4`,
];
