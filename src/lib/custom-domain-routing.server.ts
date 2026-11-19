/**
 * custom-domain-routing.server.ts — Resolução Edge/SSR Segura de Domínios Próprios
 * SERVIDOR APENAS. Nunca importar em código de cliente.
 */

import { getServerClient } from "./supabase";
import {
  buildCustomDomainLookupVariants,
  isTenantCustomDomainCandidate,
  normalizeIncomingHost,
  resolveCustomDomainRewritePath,
  type CustomDomainTarget,
} from "./custom-domain-routing";

interface CachedDomainEntry {
  target: CustomDomainTarget | null;
  expiresAt: number;
}

const DOMAIN_CACHE_TTL_MS = 30_000;
const domainCache = new Map<string, CachedDomainEntry>();

export async function lookupStoreByCustomDomainHost(
  rawHost?: string | null,
): Promise<CustomDomainTarget | null> {
  if (!isTenantCustomDomainCandidate(rawHost)) {
    return null;
  }

  const normalizedHost = normalizeIncomingHost(rawHost);
  const now = Date.now();
  const cached = domainCache.get(normalizedHost);
  if (cached && cached.expiresAt > now) {
    return cached.target;
  }

  const variants = buildCustomDomainLookupVariants(normalizedHost);
  if (variants.length === 0) return null;

  try {
    const db = getServerClient();

    // 1. Prioriza store_pwa_configs com domínio conectado
    const { data: pwaRows } = await db
      .from("store_pwa_configs")
      .select("store_id, custom_domain, is_app_enabled, stores!inner(id, slug, is_active, settings)")
      .in("custom_domain", variants)
      .limit(1);

    const pwaMatch = Array.isArray(pwaRows) ? pwaRows[0] : pwaRows;
    if (pwaMatch?.store_id && (pwaMatch as any)?.stores?.slug) {
      const storeRec = (pwaMatch as any).stores;
      if (storeRec.is_active !== false) {
        const target: CustomDomainTarget = {
          storeId: String(pwaMatch.store_id),
          slug: String(storeRec.slug),
          isAppEnabled: pwaMatch.is_app_enabled !== false,
          customDomain: String(pwaMatch.custom_domain || normalizedHost),
          customDomainStatus: storeRec?.settings?.custom_domain_status || null,
        };
        domainCache.set(normalizedHost, { target, expiresAt: now + DOMAIN_CACHE_TTL_MS });
        return target;
      }
    }

    // 2. Fallback para stores.custom_domain direto
    const { data: storeRows } = await db
      .from("stores")
      .select("id, slug, custom_domain, is_active, settings")
      .in("custom_domain", variants)
      .eq("is_active", true)
      .limit(1);

    const storeMatch = Array.isArray(storeRows) ? storeRows[0] : storeRows;
    if (storeMatch?.id && storeMatch?.slug) {
      const { data: pwaRow } = await db
        .from("store_pwa_configs")
        .select("is_app_enabled")
        .eq("store_id", storeMatch.id)
        .maybeSingle();

      const target: CustomDomainTarget = {
        storeId: String(storeMatch.id),
        slug: String(storeMatch.slug),
        isAppEnabled: pwaRow?.is_app_enabled !== false,
        customDomain: String(storeMatch.custom_domain || normalizedHost),
        customDomainStatus: (storeMatch.settings as any)?.custom_domain_status || null,
      };
      domainCache.set(normalizedHost, { target, expiresAt: now + DOMAIN_CACHE_TTL_MS });
      return target;
    }

    domainCache.set(normalizedHost, { target: null, expiresAt: now + DOMAIN_CACHE_TTL_MS });
    return null;
  } catch {
    return null;
  }
}

export async function resolveCustomDomainAppRequest(
  request: Request,
  enrichedHeaders: Headers,
): Promise<Request | null> {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const rawHost = forwardedHost || request.headers.get("host") || url.host;

  if (!isTenantCustomDomainCandidate(rawHost)) {
    return null;
  }

  const target = await lookupStoreByCustomDomainHost(rawHost);
  if (!target || !target.isAppEnabled) {
    return null;
  }

  const rewrite = resolveCustomDomainRewritePath(url.pathname, target.slug);
  enrichedHeaders.set("x-waesy-custom-domain-store-id", target.storeId);
  enrichedHeaders.set("x-waesy-custom-domain-slug", target.slug);
  enrichedHeaders.set("x-waesy-custom-domain-host", normalizeIncomingHost(rawHost));

  if (!rewrite) {
    return new Request(request.url, {
      method: request.method,
      headers: enrichedHeaders,
      body: request.body,
    });
  }

  const rewrittenUrl = new URL(request.url);
  rewrittenUrl.pathname = rewrite.pathname;
  if (rewrite.pathname === "/api/pwa/manifest.json") {
    rewrittenUrl.searchParams.set("storeId", target.storeId);
    rewrittenUrl.searchParams.set("slug", target.slug);
  } else if (rewrite.tabQuery && !rewrittenUrl.searchParams.get("tab")) {
    rewrittenUrl.searchParams.set("tab", rewrite.tabQuery);
  }

  return new Request(rewrittenUrl.toString(), {
    method: request.method,
    headers: enrichedHeaders,
    body: request.body,
  });
}
