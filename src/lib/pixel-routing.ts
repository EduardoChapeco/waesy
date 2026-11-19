export type PixelProviderType =
  | "meta_pixel"
  | "google_ads"
  | "ga4"
  | "tiktok_pixel"
  | "custom_capi";

export interface PixelRoutingRules {
  campaign_ids?: string[];
  ad_ids?: string[];
  form_ids?: string[];
  niche_ids?: string[];
  landing_paths?: string[];
}

export interface PixelEnabledEvents {
  page_view?: boolean;
  view_content?: boolean;
  lead?: boolean;
  qualified_lead?: boolean;
  contact?: boolean;
  purchase?: boolean;
}

export interface PublicSourcePixelDTO {
  id: string;
  source_id?: string | null;
  name: string;
  provider: PixelProviderType;
  external_pixel_id: string;
  enabled_events?: PixelEnabledEvents | null;
  routing_rules?: PixelRoutingRules | null;
  is_default?: boolean;
}

export interface PixelRoutingContext {
  sourcePixelId?: string | null;
  campaignId?: string | null;
  adId?: string | null;
  formId?: string | null;
  nicheId?: string | null;
  landingPath?: string | null;
}

function normalizeEventKey(eventName: string): keyof PixelEnabledEvents {
  const lower = eventName.trim().toLowerCase();
  if (lower === "pageview" || lower === "page_view") return "page_view";
  if (lower === "viewcontent" || lower === "view_content" || lower === "view_item") return "view_content";
  if (lower === "qualifiedlead" || lower === "qualified_lead") return "qualified_lead";
  if (lower === "contact") return "contact";
  if (lower === "purchase") return "purchase";
  return "lead";
}

function listIncludes(arr: unknown, candidate?: string | null): boolean {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  if (!candidate) return false;
  const target = candidate.trim().toLowerCase();
  return arr.some((item) => String(item || "").trim().toLowerCase() === target);
}

function hasAnyRoutingConstraint(rules?: PixelRoutingRules | null): boolean {
  if (!rules || typeof rules !== "object") return false;
  return Boolean(
    (Array.isArray(rules.campaign_ids) && rules.campaign_ids.length > 0) ||
      (Array.isArray(rules.ad_ids) && rules.ad_ids.length > 0) ||
      (Array.isArray(rules.form_ids) && rules.form_ids.length > 0) ||
      (Array.isArray(rules.niche_ids) && rules.niche_ids.length > 0) ||
      (Array.isArray(rules.landing_paths) && rules.landing_paths.length > 0),
  );
}

export function matchesPixelRoutingRules(
  pixel: {
    id?: string;
    enabled_events?: PixelEnabledEvents | null;
    routing_rules?: PixelRoutingRules | null;
    is_default?: boolean;
  },
  context: PixelRoutingContext,
  eventName: string,
): { matched: boolean; score: number } {
  const eventKey = normalizeEventKey(eventName);
  const eventsMap = pixel.enabled_events || {};
  if (eventsMap[eventKey] === false) {
    return { matched: false, score: 0 };
  }

  if (context.sourcePixelId && pixel.id === context.sourcePixelId) {
    return { matched: true, score: 100 };
  }

  const rules = pixel.routing_rules || {};
  const constrained = hasAnyRoutingConstraint(rules);
  if (!constrained) {
    return { matched: Boolean(pixel.is_default), score: pixel.is_default ? 10 : 0 };
  }

  let score = 0;
  if (listIncludes(rules.ad_ids, context.adId)) score += 50;
  if (listIncludes(rules.campaign_ids, context.campaignId)) score += 40;
  if (listIncludes(rules.form_ids, context.formId)) score += 35;
  if (listIncludes(rules.niche_ids, context.nicheId)) score += 25;
  if (
    Array.isArray(rules.landing_paths) &&
    rules.landing_paths.length > 0 &&
    context.landingPath
  ) {
    const pathLower = context.landingPath.toLowerCase();
    if (rules.landing_paths.some((p) => p && pathLower.includes(String(p).trim().toLowerCase()))) {
      score += 20;
    }
  }

  return { matched: score > 0, score };
}

/**
 * Seleciona os Pixels exatos para disparo/injeção com base nas regras de roteamento
 * de campanha/anúncio/formulário/nicho/rota e fallback para Pixels padrão da loja.
 */
export function selectMatchedPixelsForContext<
  T extends {
    id: string;
    provider?: string | null;
    external_pixel_id: string;
    enabled_events?: PixelEnabledEvents | null;
    routing_rules?: PixelRoutingRules | null;
    is_default?: boolean;
  },
>(
  pixels: T[],
  context: PixelRoutingContext,
  eventName: string,
  providerFilter?: PixelProviderType,
): T[] {
  const scoped = providerFilter
    ? pixels.filter((p) => p.provider === providerFilter)
    : pixels;
  if (scoped.length === 0) return [];

  const scored = scoped
    .map((px) => ({ px, res: matchesPixelRoutingRules(px, context, eventName) }))
    .filter((entry) => entry.res.matched)
    .sort((a, b) => b.res.score - a.res.score);

  const explicitMatches = scored.filter((s) => s.res.score >= 20).map((s) => s.px);
  if (explicitMatches.length > 0) {
    return explicitMatches;
  }

  if (scored.length > 0) {
    return scored.map((s) => s.px);
  }

  // Fallback seguro para o primeiro pixel com o evento habilitado se nenhum for marcado default
  const eventKey = normalizeEventKey(eventName);
  return scoped.filter(
    (px) => !hasAnyRoutingConstraint(px.routing_rules) && px.enabled_events?.[eventKey] !== false,
  );
}
