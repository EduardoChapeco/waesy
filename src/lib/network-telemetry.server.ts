/**
 * network-telemetry.server.ts — Motor de Extração de IP Real, GeoIP e Telemetria de Rede
 * 
 * Resolve Proxy Blindness inspecionando Cloudflare Headers (cf-connecting-ip),
 * proxies reversos (x-real-ip, x-forwarded-for cascateado) e sincroniza
 * o contexto de GPS do cliente com as sessões no banco de dados.
 *
 * SERVIDOR APENAS.
 */

import { readCookieFromRequest } from "@/lib/http-cookies";

export interface ResolvedGeoLocation {
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  source: "gps_header" | "gps_cookie" | "cloudflare_edge" | "canonical_fallback";
}

export interface ClientTelemetrySnapshot {
  ip: string;
  userAgent: string;
  deviceName: string;
  deviceType: "desktop" | "mobile" | "tablet";
  geo: ResolvedGeoLocation;
  isDatacenterOrVpn: boolean;
  threatScore: number;
  cfRay: string;
}

/**
 * Valida se uma string é um IP válido (IPv4 ou IPv6)
 */
function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  const trimmed = ip.trim();
  // IPv4 simples
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) {
    const parts = trimmed.split(".").map(Number);
    return parts.every((p) => p >= 0 && p <= 255);
  }
  // IPv6 simples
  if (trimmed.includes(":") && trimmed.length <= 45) {
    return true;
  }
  return false;
}

/**
 * Verifica se o IP é de rede privada (RFC 1918 / Loopback)
 */
function isPrivateOrLoopbackIp(ip: string): boolean {
  const trimmed = ip.trim();
  if (trimmed === "127.0.0.1" || trimmed === "::1" || trimmed === "localhost") return true;
  if (trimmed.startsWith("10.")) return true;
  if (trimmed.startsWith("192.168.")) return true;
  if (trimmed.startsWith("172.")) {
    const second = parseInt(trimmed.split(".")[1] || "0", 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (trimmed.startsWith("fc00:") || trimmed.startsWith("fe80:")) return true;
  return false;
}

/**
 * Extrai o IP real do cliente contornando Proxies, CDNs e Load Balancers
 * Cascata de auditoria:
 * 1. cf-connecting-ip (Cloudflare)
 * 2. true-client-ip (Cloudflare Enterprise / Akamai)
 * 3. x-real-ip (Nginx / Traefik / Caddy)
 * 4. x-forwarded-for (primeiro IP público válido da cadeia)
 * 5. x-client-ip
 * 6. Fallback defensivo para "127.0.0.1"
 */
export function getRealClientIP(req?: Request | null): string {
  if (!req) return "127.0.0.1";
  const headers = req.headers;

  // 1. Cloudflare Connecting IP
  const cfConnectingIp = headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp && isValidIp(cfConnectingIp)) {
    return cfConnectingIp;
  }

  // 2. True Client IP (Enterprise CDN)
  const trueClientIp = headers.get("true-client-ip")?.trim();
  if (trueClientIp && isValidIp(trueClientIp)) {
    return trueClientIp;
  }

  // 3. X-Real-IP (Reverse Proxy Nginx/AWS ALB)
  const xRealIp = headers.get("x-real-ip")?.trim();
  if (xRealIp && isValidIp(xRealIp)) {
    return xRealIp;
  }

  // 4. X-Forwarded-For (Varre a lista de IPs separada por vírgula)
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const rawParts = xForwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
    // Prioriza o primeiro IP público não-privado
    const publicIp = rawParts.find((ip) => isValidIp(ip) && !isPrivateOrLoopbackIp(ip));
    if (publicIp) return publicIp;

    // Se só houver privados (ex: staging local), pega o primeiro válido
    const firstValid = rawParts.find((ip) => isValidIp(ip));
    if (firstValid) return firstValid;
  }

  // 5. X-Client-IP
  const xClientIp = headers.get("x-client-ip")?.trim();
  if (xClientIp && isValidIp(xClientIp)) {
    return xClientIp;
  }

  // 6. Fastly / Akamai
  const fastlyClientIp = headers.get("fastly-client-ip")?.trim();
  if (fastlyClientIp && isValidIp(fastlyClientIp)) {
    return fastlyClientIp;
  }

  return "127.0.0.1";
}

/**
 * Alias canônico para getRealClientIP garantindo conformidade com padrões de rede
 */
export const getClientIP = getRealClientIP;

/**
 * Resolve a localização geográfica real do cliente combinando:
 * 1. Payload GPS direto enviado pelo Frontend (no login/mutação)
 * 2. Header `x-client-geo`
 * 3. Cookie seguro `waesy_client_geo`
 * 4. Headers de borda Cloudflare (`cf-ipcity`, `cf-region`, `cf-region-code`, `cf-ipcountry`)
 * 5. Fallback canônico regional para evitar "Desconhecida, BR"
 */
export function resolveGeoLocation(
  req?: Request | null,
  explicitGpsPayload?: {
    city?: string;
    state?: string;
    lat?: number;
    lng?: number;
  } | null,
): ResolvedGeoLocation {
  // 1. Prioridade Máxima: GPS verificado transmitido no payload
  if (explicitGpsPayload?.city && explicitGpsPayload.city !== "Global" && explicitGpsPayload.city !== "Todas as Regiões") {
    return {
      city: explicitGpsPayload.city.trim(),
      state: (explicitGpsPayload.state || "SC").trim().toUpperCase(),
      country: "BR",
      latitude: explicitGpsPayload.lat,
      longitude: explicitGpsPayload.lng,
      source: "gps_header",
    };
  }

  if (req) {
    // 2. Header customizado x-client-geo
    const headerGeo = req.headers.get("x-client-geo");
    if (headerGeo) {
      try {
        const decoded = JSON.parse(decodeURIComponent(headerGeo));
        if (decoded?.city && decoded.city !== "Global") {
          return {
            city: decoded.city.trim(),
            state: (decoded.state || "SC").trim().toUpperCase(),
            country: "BR",
            latitude: decoded.lat,
            longitude: decoded.lng,
            source: "gps_header",
          };
        }
      } catch {
        // ignora erro de parsing
      }
    }

    // 3. Cookie waesy_client_geo sincronizado pelo Frontend
    const cookieGeo = readCookieFromRequest(req, "waesy_client_geo");
    if (cookieGeo) {
      try {
        const decoded = JSON.parse(decodeURIComponent(cookieGeo));
        if (decoded?.city && decoded.city !== "Global" && decoded.city !== "Todas as Regiões") {
          return {
            city: decoded.city.trim(),
            state: (decoded.state || "SC").trim().toUpperCase(),
            country: "BR",
            latitude: decoded.lat,
            longitude: decoded.lng,
            source: "gps_cookie",
          };
        }
      } catch {
        // ignora
      }
    }

    // 4. Headers de Borda Cloudflare
    const cfCity = req.headers.get("cf-ipcity");
    const cfRegion = req.headers.get("cf-region-code") || req.headers.get("cf-region");
    const cfCountry = req.headers.get("cf-ipcountry") || "BR";

    if (cfCity && cfCity.toLowerCase() !== "unknown" && cfCity.toLowerCase() !== "desconhecida") {
      let cleanCity = cfCity;
      try {
        cleanCity = decodeURIComponent(cfCity);
      } catch {}

      return {
        city: cleanCity.trim(),
        state: (cfRegion || "SC").trim().toUpperCase(),
        country: cfCountry.trim().toUpperCase(),
        source: "cloudflare_edge",
      };
    }
  }

  // 5. Fallback Canônico Regional (Centro Operacional Waesy no Sul/SC em vez de "Desconhecida")
  return {
    city: "São Miguel do Oeste",
    state: "SC",
    country: "BR",
    latitude: -26.7264,
    longitude: -53.5186,
    source: "canonical_fallback",
  };
}

/**
 * Deriva dados detalhados do dispositivo e navegador a partir do User-Agent (Padrão Apple HIG)
 */
export function parseDeviceTelemetry(userAgent: string): {
  name: string;
  type: "desktop" | "mobile" | "tablet";
} {
  const ua = (userAgent || "").toLowerCase();

  let os = "Dispositivo";
  let browser = "Navegador";
  let type: "desktop" | "mobile" | "tablet" = "desktop";

  // Identificação do SO
  if (ua.includes("windows nt 10.0") || ua.includes("windows 10") || ua.includes("windows 11")) {
    os = "Windows 11";
  } else if (ua.includes("windows")) {
    os = "Windows";
  } else if (ua.includes("iphone")) {
    os = "iPhone (iOS)";
    type = "mobile";
  } else if (ua.includes("ipad")) {
    os = "iPad (iPadOS)";
    type = "tablet";
  } else if (ua.includes("macintosh") || ua.includes("mac os")) {
    os = "macOS";
  } else if (ua.includes("android")) {
    os = "Android";
    type = ua.includes("tablet") ? "tablet" : "mobile";
  } else if (ua.includes("linux")) {
    os = "Linux";
  }

  // Identificação do Navegador
  if (ua.includes("edg/")) {
    browser = "Microsoft Edge";
  } else if (ua.includes("chrome/") && !ua.includes("edg/")) {
    browser = "Google Chrome";
  } else if (ua.includes("safari/") && !ua.includes("chrome/")) {
    browser = "Apple Safari";
  } else if (ua.includes("firefox/")) {
    browser = "Mozilla Firefox";
  } else if (ua.includes("opera") || ua.includes("opr/")) {
    browser = "Opera";
  }

  if (ua.includes("mobile") && type === "desktop") {
    type = "mobile";
  }

  return {
    name: `${os} • ${browser}`,
    type,
  };
}

/**
 * Snapshot completo de telemetria da requisição
 */
export function captureRequestTelemetry(
  req?: Request | null,
  clientGeoPayload?: { city?: string; state?: string; lat?: number; lng?: number } | null,
): ClientTelemetrySnapshot {
  const ip = getRealClientIP(req);
  const uaString = req?.headers.get("user-agent") || "Navegador Web";
  const { name: deviceName, type: deviceType } = parseDeviceTelemetry(uaString);
  const geo = resolveGeoLocation(req, clientGeoPayload);

  const cfIpType = req?.headers.get("cf-iptype") || "";
  const isDatacenterOrVpn =
    cfIpType.toLowerCase().includes("datacenter") ||
    cfIpType.toLowerCase().includes("vpn") ||
    cfIpType.toLowerCase().includes("bot");

  const threatScore = parseInt(req?.headers.get("cf-threat-score") || "0", 10) || 0;
  const cfRay = req?.headers.get("cf-ray") || "direct-request";

  return {
    ip,
    userAgent: uaString,
    deviceName,
    deviceType,
    geo,
    isDatacenterOrVpn,
    threatScore,
    cfRay,
  };
}
