/**
 * branded-app-links.ts — Construtor Canônico de Links do App Oficial da Empresa (/app/:slug)
 * Desacopla integralmente o App Pro da Empresa (Waesy Pro / Branded App) das rotas genéricas
 * do Marketplace (/conta). Seguro para uso no cliente, SSR e Server Functions.
 */

export interface StoreBrandedAppHostInput {
  slug?: string | null;
  customDomain?: string | null;
  customDomainStatus?: string | null;
  fallbackOrigin?: string | null;
}

export function normalizeClientAccessCode(raw?: string | null): string {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/^#/, "")
    .replace(/[^A-Z0-9-]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("CLI-")) return cleaned;
  return `CLI-${cleaned}`;
}

export function resolveBrandedAppOrigin(input: StoreBrandedAppHostInput): string {
  const rawDomain = String(input.customDomain || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
  const domainStatus = String(input.customDomainStatus || "").trim().toLowerCase();

  // Só usa domínio próprio quando verificado/ativo ou legado ativo; evita quebrar links em pending_dns
  const isPendingOrBlocked =
    domainStatus === "pending_dns" ||
    domainStatus === "failed" ||
    domainStatus === "inactive" ||
    domainStatus === "disabled";

  if (rawDomain && !rawDomain.includes(" ") && !isPendingOrBlocked) {
    return `https://${rawDomain}`;
  }

  const fallback = String(input.fallbackOrigin || "https://waesy.com.br")
    .trim()
    .replace(/\/+$/, "");
  return fallback || "https://waesy.com.br";
}

export function buildBrandedAppBaseUrl(input: StoreBrandedAppHostInput): string {
  const slug = String(input.slug || "").trim().replace(/^@/, "");
  if (!slug) return "";
  return `${resolveBrandedAppOrigin(input)}/app/${encodeURIComponent(slug)}`;
}

export function buildBrandedClientPortalUrl(
  input: StoreBrandedAppHostInput & {
    magicToken?: string | null;
    clientCode?: string | null;
    tab?: string | null;
  },
): string {
  const base = buildBrandedAppBaseUrl(input);
  if (!base) return "";

  const params = new URLSearchParams();
  params.set("tab", String(input.tab || "minha_area").trim() || "minha_area");

  const token = String(input.magicToken || "").trim();
  if (token) {
    params.set("token", token);
  } else {
    const cleanCode = normalizeClientAccessCode(input.clientCode);
    if (cleanCode) {
      params.set("codigo", cleanCode);
    }
  }

  return `${base}?${params.toString()}`;
}
