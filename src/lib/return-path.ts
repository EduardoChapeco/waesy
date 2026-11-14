import { WAESY_CANONICAL_ORIGIN } from "@/lib/seo/universal-seo-head";

export function normalizeInternalReturnPath(
 value: string | null | undefined,
 fallback: string,
): string {
 if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
 return fallback;
 }

 return value;
}

const LEGACY_INVALID_ORIGINS = new Set(["waesy.pages.dev", "www.waesy.pages.dev"]);

export function isAllowedOAuthOrigin(rawOrigin: string | null | undefined): boolean {
  if (!rawOrigin) return false;
  try {
    const parsed = new URL(rawOrigin);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    if (LEGACY_INVALID_ORIGINS.has(host)) return false;
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (host === "waesy.com.br" || host.endsWith(".waesy.com.br")) return true;
    if (host === "usewaesy.pages.dev" || host.endsWith(".usewaesy.pages.dev")) return true;
    if (host === "usewaesy.com" || host.endsWith(".usewaesy.com")) return true;
    return false;
  } catch {
    return false;
  }
}

export function resolveCanonicalOAuthOrigin(options: {
  clientOrigin?: string | null;
  requestOrigin?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  envSiteUrl?: string | null;
}): string {
  const candidates: Array<string | null | undefined> = [
    options.clientOrigin,
    options.requestOrigin,
    options.forwardedHost
      ? `${options.forwardedProto === "http" ? "http" : "https"}://${options.forwardedHost}`
      : null,
    options.envSiteUrl,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const normalized = new URL(candidate).origin;
      if (isAllowedOAuthOrigin(normalized)) {
        return normalized;
      }
    } catch {
      // ignore invalid URL candidates
    }
  }

  return WAESY_CANONICAL_ORIGIN;
}
