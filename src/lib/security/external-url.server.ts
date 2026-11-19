/**
 * external-url.server.ts — Validador Central Anti-SSRF para Ingestão e Proxy de Mídia Externa
 * Bloqueia alvos de loopback, redes privadas IPv4/IPv6, link-local metadata e redirecionamentos abertos.
 */

const DEFAULT_MAX_BYTES = 15 * 1024 * 1024;
const MAX_REDIRECT_HOPS = 2;

function isPrivateOrBlockedIpv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255)) {
    return false;
  }
  const [a, b] = parts.map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // Cloud metadata / link-local
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const raw = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!raw) return true;

  if (
    raw === "localhost" ||
    raw === "0.0.0.0" ||
    raw === "::" ||
    raw === "::1" ||
    raw.endsWith(".localhost") ||
    raw.endsWith(".local") ||
    raw.endsWith(".internal") ||
    raw.endsWith(".arpa")
  ) {
    return true;
  }

  // Bloqueia notações numéricas/hex/octais usadas para bypass de IP
  if (/^\d+$/.test(raw) || /^0x[0-9a-f]+$/i.test(raw) || /^0[0-7]+\./.test(raw)) {
    return true;
  }

  if (isPrivateOrBlockedIpv4(raw)) {
    return true;
  }

  // IPv6 private (fc00::/7), link-local (fe80::/10) e IPv4-mapped (::ffff:127.0.0.1 / hex)
  if (raw.includes(":")) {
    if (raw.startsWith("fe80:") || raw.startsWith("fc") || raw.startsWith("fd")) {
      return true;
    }
    const mappedV4 = raw.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mappedV4 && isPrivateOrBlockedIpv4(mappedV4[1])) {
      return true;
    }
    if (raw.startsWith("::ffff:") && !mappedV4) {
      return true;
    }
  }

  return false;
}

/**
 * Valida URL externa garantindo HTTP(S), ausência de credenciais embutidas e bloqueio SSRF.
 */
export function assertSafeExternalMediaUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("URL externa inválida.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Apenas URLs HTTP/HTTPS são permitidas para ingestão.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("URLs com credenciais embutidas não são permitidas.");
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw new Error("Host bloqueado por política de segurança (SSRF Protection).");
  }

  return parsed;
}

/**
 * Realiza fetch server-side seguro com revalidação anti-SSRF em redirecionamentos e limite de tamanho.
 */
export async function fetchSafeExternalImageBuffer(
  rawUrl: string,
  options?: {
    maxBytes?: number;
    accept?: string;
    userAgent?: string;
    allowedMimePrefix?: string;
    timeoutMs?: number;
  },
): Promise<{
  buffer: Buffer;
  contentType: string;
  finalUrl: string;
}> {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = options?.timeoutMs ?? 15_000;
  let currentUrl = assertSafeExternalMediaUrl(rawUrl).toString();

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": options?.userAgent || "WaesyMediaFetcher/1.0",
          Accept: options?.accept || "image/avif,image/webp,image/apng,image/png,image/jpeg,*/*;q=0.8",
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || hop === MAX_REDIRECT_HOPS) {
        throw new Error("Redirecionamento externo inválido ou excessivo.");
      }
      const nextUrl = new URL(location, currentUrl).toString();
      currentUrl = assertSafeExternalMediaUrl(nextUrl).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText || "Falha ao baixar mídia externa."}`);
    }

    const rawType = (response.headers.get("content-type") || "").toLowerCase().split(";")[0].trim();
    if (options?.allowedMimePrefix && (!rawType || !rawType.startsWith(options.allowedMimePrefix))) {
      throw new Error(`Conteúdo retornado não permitido (${rawType || "desconhecido"}).`);
    }

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > maxBytes) {
      throw new Error(`Arquivo externo excede o limite de ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength <= 0 || arrayBuffer.byteLength > maxBytes) {
      throw new Error(`Arquivo externo inválido ou excede ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`);
    }

    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: rawType || "image/jpeg",
      finalUrl: currentUrl,
    };
  }

  throw new Error("Falha ao resolver URL externa segura.");
}
