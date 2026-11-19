/**
 * custom-domain-routing.ts — Helpers puros de normalização e guarda de domínios próprios
 * Seguro para execução em Edge Workers, SSR e testes unitários sem estado.
 */

import { resolveBrandContextFromHost } from "./multi-brand-engine";
import { resolveSubsystemFromHost } from "./vertical-subsystems";

export interface CustomDomainTarget {
  storeId: string;
  slug: string;
  isAppEnabled: boolean;
  customDomain: string;
  customDomainStatus?: string | null;
}

const RESERVED_EXACT_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "waesy.com.br",
  "www.waesy.com.br",
  "waesy.app",
  "www.waesy.app",
  "usewaesy.com",
  "www.usewaesy.com",
  "cname.waesy.app",
]);

/**
 * Normaliza header Host removendo porta, espaços, protocolo e barras.
 */
export function normalizeIncomingHost(rawHost?: string | null): string {
  if (!rawHost) return "";
  let clean = String(rawHost).trim().toLowerCase();
  if (!clean) return "";
  clean = clean.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  // Trata IPv6 com colchetes ou hostname:porta
  if (clean.startsWith("[")) {
    const endBracket = clean.indexOf("]");
    if (endBracket >= 0) {
      clean = clean.slice(0, endBracket + 1);
    }
  } else {
    clean = clean.replace(/:\d+$/, "");
  }
  return clean.replace(/\.$/, "");
}

/**
 * Determina se o host deve ser tratado como candidato a domínio próprio de lojista/empresa.
 * Nunca captura localhost, *.waesy.com.br, *.waesy.app, *.usewaesy.com, *.pages.dev, *.workers.dev
 * nem domínios SaaS oficiais do ecossistema Waesy.
 */
export function isTenantCustomDomainCandidate(rawHost?: string | null): boolean {
  const host = normalizeIncomingHost(rawHost);
  if (!host || !host.includes(".")) return false;
  if (RESERVED_EXACT_HOSTS.has(host)) return false;

  if (
    host.endsWith(".waesy.com.br") ||
    host.endsWith(".waesy.app") ||
    host.endsWith(".usewaesy.com") ||
    host.endsWith(".pages.dev") ||
    host.endsWith(".workers.dev") ||
    host.endsWith(".localhost")
  ) {
    return false;
  }

  const brand = resolveBrandContextFromHost(host);
  if (brand && brand.id !== "waesy") {
    return false;
  }

  const sub = resolveSubsystemFromHost(host);
  if (sub && sub.id !== "waesy") {
    return false;
  }

  return true;
}

/**
 * Retorna variantes válidas para comparação no banco (ex: app.loja.com.br <-> www.app.loja.com.br ou loja.com.br <-> www.loja.com.br).
 */
export function buildCustomDomainLookupVariants(rawHost?: string | null): string[] {
  const host = normalizeIncomingHost(rawHost);
  if (!host) return [];
  const noWww = host.startsWith("www.") ? host.slice(4) : host;
  return Array.from(new Set([host, noWww, `www.${noWww}`]));
}

const RESERVED_CUSTOM_DOMAIN_PATHS = [
  "/api/",
  "/_server",
  "/assets/",
  "/icons/",
  "/app/",
  "/checkout",
  "/pedido/",
  "/proposta/",
  "/assinar/",
  "/voucher/",
  "/viajante/",
  "/manifest.json",
  "/sw.js",
  "/robots.txt",
  "/sitemap",
  "/workspace",
  "/painel",
  "/admin-master",
];

const CUSTOM_DOMAIN_TAB_PATHS: Record<string, string> = {
  "/catalogo": "catalogo",
  "/produtos": "catalogo",
  "/pacotes": "catalogo",
  "/cardapio": "catalogo",
  "/eventos": "catalogo",
  "/servicos": "catalogo",
  "/cotar": "cotar",
  "/corporativo": "corporativo",
  "/formularios": "formularios",
  "/minha-area": "minha_area",
  "/minhas-viagens": "minha_area",
  "/portal": "minha_area",
  "/empresa": "empresa",
  "/sobre": "empresa",
};

/**
 * Determina o rewrite interno de pathname quando uma requisição entra via Domínio Próprio verificado.
 */
export function resolveCustomDomainRewritePath(
  pathname: string,
  targetSlug: string,
): { pathname: string; tabQuery?: string } | null {
  const cleanPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  const lower = cleanPath.toLowerCase();

  if (lower === "/manifest.json" || lower === "/manifest.webmanifest") {
    return { pathname: "/api/pwa/manifest.json" };
  }

  if (RESERVED_CUSTOM_DOMAIN_PATHS.some((prefix) => lower.startsWith(prefix))) {
    return null;
  }

  if (lower === "/" || lower === "") {
    return { pathname: `/app/${encodeURIComponent(targetSlug)}` };
  }

  const mappedTab = CUSTOM_DOMAIN_TAB_PATHS[lower];
  if (mappedTab) {
    return {
      pathname: `/app/${encodeURIComponent(targetSlug)}`,
      tabQuery: mappedTab,
    };
  }

  return null;
}
