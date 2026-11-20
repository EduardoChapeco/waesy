/**
 * Zero-Trust SSRF & Operator Base URL Guard
 *
 * Enforces strict HTTPS-only outbound connections to external travel operators (InfoTravel / GDS),
 * blocking embedded credentials, non-standard ports, loopback, RFC1918 private networks,
 * Carrier-Grade NAT, link-local / cloud metadata endpoints (169.254.169.254), and IPv6 private ranges.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "instance-data",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".corp",
  ".home",
  ".lan",
];

function isBlockedIpv4(host: string): boolean {
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) return false;

  const octets = [
    Number(ipv4Match[1]),
    Number(ipv4Match[2]),
    Number(ipv4Match[3]),
    Number(ipv4Match[4]),
  ];

  if (octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) {
    return true;
  }

  const [a, b, c] = octets;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 10.0.0.0/8 (RFC1918 private)
  if (a === 10) return true;
  // 100.64.0.0/10 (Carrier-grade NAT / Alibaba Cloud metadata 100.100.100.200)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link-local / AWS/GCP/Azure Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (RFC1918 private)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.0.0/24 & 192.0.2.0/24 (IETF / TEST-NET-1)
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  // 192.168.0.0/16 (RFC1918 private)
  if (a === 192 && b === 168) return true;
  // 198.18.0.0/15 (Benchmarking) & 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved / Broadcast)
  if (a >= 224) return true;

  // Block raw IPv4 literals in general for operator endpoints (operators must use TLS domain names)
  return true;
}

function isBlockedIpv6(host: string): boolean {
  const normalized = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!normalized.includes(":")) return false;
  // Any IPv6 literal is blocked for external travel operator base URLs
  return true;
}

function isNonStandardIpEncoding(host: string): boolean {
  // Block integer IP (e.g. 2130706433), hex IP (0x7f000001), or octal IP (0177.0.0.1)
  if (/^\d+$/.test(host)) return true;
  if (/^0x[0-9a-f]+$/i.test(host)) return true;
  if (/^0\d+\./.test(host)) return true;
  return false;
}

export function assertSafeOperatorBaseUrl(rawUrl: string): string {
  const trimmed = String(rawUrl ?? "").trim();
  if (!trimmed) {
    throw new Error("SSRF_GUARD: URL base da operadora não informada.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("SSRF_GUARD: URL base da operadora inválida.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("SSRF_GUARD: Apenas conexões seguras HTTPS são permitidas para operadoras.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("SSRF_GUARD: Credenciais embutidas na URL da operadora são proibidas.");
  }

  if (parsed.port !== "" && parsed.port !== "443") {
    throw new Error("SSRF_GUARD: Portas não-padrão são proibidas na URL da operadora.");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new Error(`SSRF_GUARD: Host local ou interno bloqueado (${hostname}).`);
  }

  if (
    isBlockedIpv4(hostname) ||
    isBlockedIpv6(hostname) ||
    isNonStandardIpEncoding(hostname)
  ) {
    throw new Error(`SSRF_GUARD: Endereço IP literal ou rede privada bloqueada (${hostname}).`);
  }

  if (!hostname.includes(".") || hostname.endsWith(".")) {
    throw new Error(`SSRF_GUARD: Domínio da operadora inválido (${hostname}).`);
  }

  // Strip query string and fragment, normalize trailing slash
  const cleanPathname = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${cleanPathname}`;
}

/**
 * Sanitizes free-text user input before interpolating into PostgREST .or() or .ilike() filters.
 * Strips commas, parentheses, dots, wildcards, quotes, and control characters to prevent filter injection.
 */
export function sanitizePostgrestFilterValue(input: string, maxLength = 80): string {
  return String(input ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/--+/g, " ")
    .replace(/[,().*%'"\\;[\]{}|^~<>?`!@#$&=+]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
