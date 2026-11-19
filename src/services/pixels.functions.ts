import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, resolveTenantStoreId } from "@/lib/server-access";
import { logSystemError } from "@/lib/logger";
import { decryptSecret, encryptSecret } from "@/lib/crypto-vault.server";
import { invalidateMicroCache, invalidateMicroCachePrefix } from "@/lib/cache/micro-cache";
import { resolveKanbanStageSynonym } from "@/lib/niches/kanban-niche-taxonomy";
import { slugify } from "@/lib/slug-utils";
import { getActiveIntegrationPayload } from "@/services/integrations.functions";
import {
  selectMatchedPixelsForContext,
  type PixelEnabledEvents,
  type PixelProviderType,
  type PixelRoutingContext,
  type PixelRoutingRules,
  type PublicSourcePixelDTO,
} from "@/lib/pixel-routing";

export type MarketingSourcePlatform =
  | "meta_ads"
  | "google_ads"
  | "tiktok_ads"
  | "web_portal"
  | "whatsapp_organic"
  | "referral"
  | "offline"
  | "custom";

export interface MarketingSourcePixelDTO {
  id: string;
  store_id: string;
  source_id: string;
  name: string;
  provider: PixelProviderType;
  external_pixel_id: string;
  ad_account_id?: string | null;
  page_id?: string | null;
  capi_token_configured: boolean;
  test_event_code?: string | null;
  enabled_events: PixelEnabledEvents;
  routing_rules: PixelRoutingRules;
  is_default: boolean;
  is_active: boolean;
  last_fired_at?: string | null;
  events_24h?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MarketingSourceDTO {
  id: string;
  store_id: string;
  slug: string;
  name: string;
  platform: MarketingSourcePlatform;
  description?: string | null;
  is_active: boolean;
  pixels: MarketingSourcePixelDTO[];
  created_at?: string;
  updated_at?: string;
}

export interface StorePixelConfigDTO {
  id?: string;
  store_id: string;
  meta_pixel_id?: string | null;
  meta_capi_token?: null;
  meta_capi_configured?: boolean;
  meta_test_event_code_configured?: boolean;
  meta_domain_verification?: string | null;
  google_ads_id?: string | null;
  google_ads_conversion_label?: string | null;
  google_analytics_id?: string | null;
  ga4_api_secret_configured?: boolean;
  google_site_verification?: string | null;
  gtm_id?: string | null;
  tiktok_pixel_id?: string | null;
  track_page_view: boolean;
  track_view_content: boolean;
  track_add_to_cart: boolean;
  track_initiate_checkout: boolean;
  track_lead: boolean;
  track_whatsapp_click: boolean;
  updated_at?: string;
}

function normalizeBrazilPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  const national = digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits;
  if (national.length !== 10 && national.length !== 11) return null;
  return `+55${national}`;
}

function hashSha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function persistPixelSecrets(
  supabase: ReturnType<typeof getServerClient>,
  storeId: string,
  publicMetadata: Record<string, string>,
  secretPayload: Record<string, string>,
) {
  if (Object.keys(secretPayload).length === 0) return;
  const { error } = await supabase.from("integration_credentials").upsert(
    {
      store_id: storeId,
      provider: "meta_pixel",
      token_payload: publicMetadata,
      public_metadata: publicMetadata,
      secret_payload_encrypted: encryptSecret(JSON.stringify(secretPayload)),
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id, provider" },
  );
  if (error) throw new Error(`Não foi possível proteger a credencial Meta: ${error.message}`);
}

async function migrateLegacyPixelSecrets(
  supabase: ReturnType<typeof getServerClient>,
  storeId: string,
  config: Record<string, any>,
) {
  const current = await getActiveIntegrationPayload(storeId, "meta_pixel");
  const legacyToken = typeof config.meta_capi_token === "string" ? config.meta_capi_token.trim() : "";
  const legacyTestCode = typeof config.meta_test_event_code === "string" ? config.meta_test_event_code.trim() : "";
  if (!current?.access_token && (legacyToken || legacyTestCode)) {
    await persistPixelSecrets(
      supabase,
      storeId,
      config.meta_pixel_id ? { pixel_id: String(config.meta_pixel_id) } : {},
      {
        ...(legacyToken ? { access_token: legacyToken } : {}),
        ...(legacyTestCode ? { test_event_code: legacyTestCode } : {}),
      },
    );
    await supabase.from("store_pixel_configs").update({ meta_capi_token: null, meta_test_event_code: null, updated_at: new Date().toISOString() }).eq("store_id", storeId);
    return { ...(current || {}), access_token: legacyToken || undefined, test_event_code: legacyTestCode || undefined };
  }
  return current || {};
}

/**
 * Obtém as configurações de pixels e telemetria da loja para o Workspace
 */
export const getStorePixelConfig = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().optional() }).optional())
  .handler(async ({ data }): Promise<StorePixelConfigDTO | null> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Identificador da loja não fornecido.");

    let { data: config, error } = await (supabase.from("store_pixel_configs") as any)
      .select("id, store_id, meta_pixel_id, meta_capi_token, meta_test_event_code, google_ads_id, google_ads_conversion_label, ga4_measurement_id, gtm_id, tiktok_pixel_id, google_site_verification, meta_domain_verification, track_page_views, track_whatsapp_leads, track_catalog_views, track_quotes, track_purchases, updated_at")
      .eq("store_id", targetStoreId)
      .maybeSingle();

    if (error && /column|does not exist|schema/i.test(error.message || "")) {
      ({ data: config, error } = await supabase
        .from("store_pixel_configs")
        .select("id, store_id, meta_pixel_id, meta_capi_token, meta_test_event_code, google_ads_id, google_ads_conversion_label, ga4_measurement_id, track_page_views, track_whatsapp_leads, track_catalog_views, track_quotes, track_purchases, updated_at")
        .eq("store_id", targetStoreId)
        .maybeSingle());
    }

    if (error) {
      await logSystemError({
        operation: "getStorePixelConfig",
        error,
        table_name: "store_pixel_configs",
        contract_name: "getStorePixelConfig",
      });
      throw new Error(`Erro ao buscar configurações de pixel: ${error.message}`);
    }

    const { data: storeRow } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", targetStoreId)
      .maybeSingle()
      .then((res) => res, () => ({ data: null }));
    const storeSettings = (storeRow?.settings as Record<string, any>) || {};

    if (!config) {
      return {
        store_id: targetStoreId,
        meta_pixel_id: storeSettings.meta_pixel_id || null,
        meta_capi_token: null,
        meta_capi_configured: false,
        meta_test_event_code_configured: false,
        meta_domain_verification: storeSettings.meta_domain_verification || null,
        google_ads_id: storeSettings.google_ads_id || null,
        google_ads_conversion_label: storeSettings.google_ads_conversion_label || null,
        google_analytics_id: storeSettings.ga4_measurement_id || null,
        ga4_api_secret_configured: false,
        google_site_verification: storeSettings.google_site_verification || null,
        gtm_id: storeSettings.gtm_id || null,
        tiktok_pixel_id: storeSettings.tiktok_pixel_id || null,
        track_page_view: true,
        track_view_content: true,
        track_add_to_cart: true,
        track_initiate_checkout: true,
        track_lead: true,
        track_whatsapp_click: true,
      };
    }

    const googleAdsId = typeof config.google_ads_id === "string" ? config.google_ads_id : null;
    let publicGoogleAdsId = googleAdsId;
    let legacyGa4SecretPresent = false;
    try {
      const parsed = JSON.parse(googleAdsId || "{}");
      publicGoogleAdsId = parsed.conversion_id || null;
      legacyGa4SecretPresent = Boolean(parsed.api_secret);
    } catch {
      // Existing plain Conversion IDs are already public identifiers.
    }
    const [metaPayload, ga4Payload] = await Promise.all([
      getActiveIntegrationPayload(targetStoreId, "meta_pixel"),
      getActiveIntegrationPayload(targetStoreId, "google_analytics"),
    ]);
    const publicConfig = Object.fromEntries(Object.entries(config as Record<string, any>).filter(([key]) => !["meta_capi_token", "meta_test_event_code"].includes(key)));
    return {
      ...(publicConfig as StorePixelConfigDTO),
      google_analytics_id: config.ga4_measurement_id || storeSettings.ga4_measurement_id || null,
      google_ads_conversion_label: config.google_ads_conversion_label || storeSettings.google_ads_conversion_label || null,
      gtm_id: (config as any).gtm_id || storeSettings.gtm_id || null,
      tiktok_pixel_id: (config as any).tiktok_pixel_id || storeSettings.tiktok_pixel_id || null,
      google_site_verification: (config as any).google_site_verification || storeSettings.google_site_verification || null,
      meta_domain_verification: (config as any).meta_domain_verification || storeSettings.meta_domain_verification || null,
      track_page_view: config.track_page_views ?? true,
      track_view_content: config.track_catalog_views ?? true,
      track_add_to_cart: config.track_purchases ?? true,
      track_initiate_checkout: config.track_purchases ?? true,
      track_lead: config.track_quotes ?? true,
      track_whatsapp_click: config.track_whatsapp_leads ?? true,
      meta_capi_token: null,
      meta_capi_configured: Boolean(metaPayload?.access_token || (config as any).meta_capi_token),
      meta_test_event_code_configured: Boolean(metaPayload?.test_event_code || (config as any).meta_test_event_code),
      ga4_api_secret_configured: Boolean(ga4Payload?.api_secret || legacyGa4SecretPresent),
      google_ads_id: publicGoogleAdsId || storeSettings.google_ads_id || null,
    };
  });

/**
 * Salva ou atualiza a configuração de pixels e CAPI da loja
 */
export const saveStorePixelConfig = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      meta_pixel_id: z.string().optional().nullable(),
      meta_capi_token: z.string().optional().nullable(),
      meta_test_event_code: z.string().optional().nullable(),
      meta_domain_verification: z.string().optional().nullable(),
      google_ads_id: z.string().optional().nullable(),
      google_ads_conversion_label: z.string().optional().nullable(),
      google_analytics_id: z.string().optional().nullable(),
      ga4_api_secret: z.string().optional().nullable(),
      google_site_verification: z.string().optional().nullable(),
      gtm_id: z.string().optional().nullable(),
      tiktok_pixel_id: z.string().optional().nullable(),
      track_page_view: z.boolean().default(true),
      track_view_content: z.boolean().default(true),
      track_add_to_cart: z.boolean().default(true),
      track_initiate_checkout: z.boolean().default(true),
      track_lead: z.boolean().default(true),
      track_whatsapp_click: z.boolean().default(true),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não encontrada.");

    const existing = await supabase
      .from("store_pixel_configs")
      .select("meta_capi_token, meta_test_event_code, google_ads_id, ga4_measurement_id")
      .eq("store_id", targetStoreId)
      .maybeSingle();
    const [existingMetaVault, existingGaVault] = await Promise.all([
      getActiveIntegrationPayload(targetStoreId, "meta_pixel"),
      getActiveIntegrationPayload(targetStoreId, "google_analytics"),
    ]);
    const legacyGoogle = typeof existing.data?.google_ads_id === "string" ? existing.data.google_ads_id : "";
    let legacyGoogleSecret = "";
    try { legacyGoogleSecret = JSON.parse(legacyGoogle || "{}").api_secret || ""; } catch {}
    const googlePayload = typeof data.google_ads_id === "string" ? data.google_ads_id : "";
    let conversionId = googlePayload;
    let apiSecret = typeof data.ga4_api_secret === "string" ? data.ga4_api_secret.trim() : "";
    try {
      const parsed = JSON.parse(googlePayload || "{}");
      conversionId = parsed.conversion_id || "";
      if (!apiSecret) apiSecret = parsed.api_secret || "";
    } catch {}

    const resolvedMetaAccessToken =
      data.meta_capi_token?.trim() ||
      (typeof existingMetaVault?.access_token === "string" ? existingMetaVault.access_token.trim() : "") ||
      (existing.data?.meta_capi_token ? String(existing.data.meta_capi_token) : "");
    const resolvedTestEventCode =
      data.meta_test_event_code?.trim() ||
      (typeof existingMetaVault?.test_event_code === "string" ? existingMetaVault.test_event_code.trim() : "") ||
      (existing.data?.meta_test_event_code ? String(existing.data.meta_test_event_code) : "");

    await persistPixelSecrets(
      supabase,
      targetStoreId,
      data.meta_pixel_id?.trim() ? { pixel_id: data.meta_pixel_id.trim() } : {},
      {
        ...(resolvedMetaAccessToken ? { access_token: resolvedMetaAccessToken } : {}),
        ...(resolvedTestEventCode ? { test_event_code: resolvedTestEventCode } : {}),
      },
    );

    const resolvedGaSecret =
      apiSecret ||
      (typeof existingGaVault?.api_secret === "string" ? existingGaVault.api_secret.trim() : "") ||
      legacyGoogleSecret;
    const resolvedGaMeasurementId =
      data.google_analytics_id?.trim() || existing.data?.ga4_measurement_id || "";

    if (resolvedGaSecret && (resolvedGaMeasurementId || conversionId.trim())) {
      const { error: googleError } = await supabase.from("integration_credentials").upsert(
        {
          store_id: targetStoreId,
          provider: "google_analytics",
          token_payload: resolvedGaMeasurementId ? { measurement_id: resolvedGaMeasurementId } : {},
          public_metadata: resolvedGaMeasurementId ? { measurement_id: resolvedGaMeasurementId } : {},
          secret_payload_encrypted: encryptSecret(JSON.stringify({ api_secret: resolvedGaSecret })),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id, provider" },
      );
      if (googleError) throw new Error(`Não foi possível proteger a credencial GA4: ${googleError.message}`);
    }

    const fullPayload: Record<string, any> = {
      store_id: targetStoreId,
      meta_pixel_id: data.meta_pixel_id?.trim() || null,
      meta_capi_token: null,
      meta_test_event_code: null,
      google_ads_id: conversionId.trim() || null,
      google_ads_conversion_label: data.google_ads_conversion_label?.trim() || null,
      ga4_measurement_id: data.google_analytics_id?.trim() || null,
      gtm_id: data.gtm_id?.trim() || null,
      tiktok_pixel_id: data.tiktok_pixel_id?.trim() || null,
      google_site_verification: data.google_site_verification?.trim() || null,
      meta_domain_verification: data.meta_domain_verification?.trim() || null,
      track_page_views: data.track_page_view,
      track_catalog_views: data.track_view_content,
      track_purchases: data.track_add_to_cart || data.track_initiate_checkout,
      track_quotes: data.track_lead,
      track_whatsapp_leads: data.track_whatsapp_click,
      updated_at: new Date().toISOString(),
    };

    let { data: saved, error } = await (supabase.from("store_pixel_configs") as any)
      .upsert(fullPayload, { onConflict: "store_id" })
      .select()
      .single();

    if (error && /column|does not exist|schema/i.test(error.message || "")) {
      const corePayload = { ...fullPayload };
      delete corePayload.gtm_id;
      delete corePayload.tiktok_pixel_id;
      delete corePayload.google_site_verification;
      delete corePayload.meta_domain_verification;
      ({ data: saved, error } = await supabase
        .from("store_pixel_configs")
        .upsert(corePayload as any, { onConflict: "store_id" })
        .select()
        .single());
    }

    if (error) {
      await logSystemError({
        operation: "saveStorePixelConfig",
        error,
        table_name: "store_pixel_configs",
        contract_name: "saveStorePixelConfig",
      });
      throw new Error(`Erro ao salvar telemetria: ${error.message}`);
    }

    // Espelha identificadores publicos (sem segredos) em stores.settings para SSR/Vitrine imediata
    try {
      const { data: currentStore } = await supabase
        .from("stores")
        .select("settings")
        .eq("id", targetStoreId)
        .maybeSingle();
      const prevSettings = ((currentStore?.settings as Record<string, any>) || {});
      const nextSettings = {
        ...prevSettings,
        meta_pixel_id: fullPayload.meta_pixel_id,
        google_ads_id: fullPayload.google_ads_id,
        google_ads_conversion_label: fullPayload.google_ads_conversion_label,
        ga4_measurement_id: fullPayload.ga4_measurement_id,
        gtm_id: fullPayload.gtm_id,
        tiktok_pixel_id: fullPayload.tiktok_pixel_id,
        google_site_verification: fullPayload.google_site_verification,
        meta_domain_verification: fullPayload.meta_domain_verification,
      };
      await supabase.from("stores").update({ settings: nextSettings }).eq("id", targetStoreId);
    } catch {
      // Nao bloqueia se settings mock nao existir
    }

    invalidateMicroCache("public_pixels:" + targetStoreId);
    invalidateMicroCachePrefix("public_pixels:");
    invalidateMicroCachePrefix("storefront:");

    return { status: "ok" as const, config: saved };
  });

/**
 * Retorna os IDs públicos de pixels para injeção na vitrine pública da loja
 * (NUNCA expõe tokens secretos como o meta_capi_token)
 */
export const getPublicStorePixels = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().min(1) }))
  .handler(async ({ data: { storeId } }) => {
    const supabase = getServerClient();

    let { data, error } = await (supabase.from("store_pixel_configs") as any)
      .select(
        "meta_pixel_id, google_ads_id, google_ads_conversion_label, ga4_measurement_id, gtm_id, tiktok_pixel_id, google_site_verification, meta_domain_verification, track_page_views, track_catalog_views, track_purchases, track_quotes, track_whatsapp_leads"
      )
      .eq("store_id", storeId)
      .maybeSingle();

    if (error && /column|does not exist|schema/i.test(error.message || "")) {
      ({ data, error } = await supabase
        .from("store_pixel_configs")
        .select(
          "meta_pixel_id, google_ads_id, google_ads_conversion_label, ga4_measurement_id, track_page_views, track_catalog_views, track_purchases, track_quotes, track_whatsapp_leads"
        )
        .eq("store_id", storeId)
        .maybeSingle());
    }

    let storeSettings: Record<string, any> = {};
    try {
      const { data: storeRow } = await supabase
        .from("stores")
        .select("settings")
        .eq("id", storeId)
        .maybeSingle();
      storeSettings = (storeRow?.settings as Record<string, any>) || {};
    } catch {}

    if (error && !storeSettings) return null;
    const row = data || {};
    let cleanGoogleAdsId = typeof row.google_ads_id === "string" ? row.google_ads_id : (storeSettings.google_ads_id || null);
    try {
      if (cleanGoogleAdsId && cleanGoogleAdsId.startsWith("{")) {
        cleanGoogleAdsId = JSON.parse(cleanGoogleAdsId).conversion_id || null;
      }
    } catch {}

    let sourcePixels: PublicSourcePixelDTO[] = [];
    try {
      const { data: spRows } = await (supabase.from("marketing_source_pixels") as any)
        .select("id, source_id, name, provider, external_pixel_id, enabled_events, routing_rules, is_default")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (Array.isArray(spRows)) {
        sourcePixels = spRows.map((p: any) => ({
          id: String(p.id),
          source_id: p.source_id ? String(p.source_id) : null,
          name: String(p.name || p.external_pixel_id),
          provider: p.provider as PixelProviderType,
          external_pixel_id: String(p.external_pixel_id),
          enabled_events: (p.enabled_events || {}) as PixelEnabledEvents,
          routing_rules: (p.routing_rules || {}) as PixelRoutingRules,
          is_default: Boolean(p.is_default),
        }));
      }
    } catch {
      // Tolerancia antes de aplicar migration 20270601000000
    }

    return {
      meta_pixel_id: row.meta_pixel_id || storeSettings.meta_pixel_id || null,
      google_ads_id: cleanGoogleAdsId || null,
      google_ads_conversion_label: row.google_ads_conversion_label || storeSettings.google_ads_conversion_label || null,
      google_analytics_id: row.ga4_measurement_id || storeSettings.ga4_measurement_id || null,
      gtm_id: row.gtm_id || storeSettings.gtm_id || null,
      tiktok_pixel_id: row.tiktok_pixel_id || storeSettings.tiktok_pixel_id || null,
      google_site_verification: row.google_site_verification || storeSettings.google_site_verification || null,
      meta_domain_verification: row.meta_domain_verification || storeSettings.meta_domain_verification || null,
      track_page_view: row.track_page_views ?? true,
      track_view_content: row.track_catalog_views ?? true,
      track_add_to_cart: row.track_purchases ?? true,
      track_initiate_checkout: row.track_purchases ?? true,
      track_lead: row.track_quotes ?? true,
      track_whatsapp_click: row.track_whatsapp_leads ?? true,
      source_pixels: sourcePixels,
    };
  });

/**
 * Disparo Server-Side de Eventos de Conversão via Meta Conversions API (CAPI)
 * Permite telemetria 100% resiliente a adblockers e restrições de cookies do iOS
 */
export const dispatchMetaCapiEvent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().min(1),
      eventName: z.enum([
        "Lead",
        "Contact",
        "AddToCart",
        "InitiateCheckout",
        "Purchase",
        "ViewContent",
        "QualifiedLead",
        "Schedule",
        "SubmitApplication",
      ]),
      eventId: z.string().min(1).max(200),
      eventSourceUrl: z.string().optional(),
      testEventCode: z.string().optional(),
      sourcePixelId: z.string().uuid().optional().nullable(),
      campaignId: z.string().optional().nullable(),
      adId: z.string().optional().nullable(),
      formId: z.string().optional().nullable(),
      nicheId: z.string().optional().nullable(),
      landingPath: z.string().optional().nullable(),
      customData: z.record(z.any()).optional(),
      userData: z
        .object({
          email: z.string().optional(),
          phone: z.string().optional(),
          clientIpAddress: z.string().optional(),
          clientUserAgent: z.string().optional(),
          fbp: z.string().optional(),
          fbc: z.string().optional(),
          externalId: z.string().optional(),
        })
        .optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    const tenantStoreId = identity?.store_id || await resolveTenantStoreId();
    if (tenantStoreId && tenantStoreId !== data.storeId) {
      throw new Error("Contexto de loja inválido para o despacho CAPI.");
    }
    if (!tenantStoreId) {
      const publicEvents = new Set(["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Contact", "Lead"]);
      if (!publicEvents.has(data.eventName)) {
        throw new Error("Evento CAPI transacional exige tenant autenticado ou contexto server-side.");
      }
      const { data: publicStore, error: publicStoreError } = await supabase
        .from("stores")
        .select("id, is_active")
        .eq("id", data.storeId)
        .eq("is_active", true)
        .maybeSingle();
      if (publicStoreError || !publicStore) {
        throw new Error("Loja pública não está ativa para telemetria CAPI.");
      }
    }

    const { data: rawConfig, error } = await supabase
      .from("store_pixel_configs")
      .select("meta_pixel_id, meta_capi_token, meta_test_event_code, track_whatsapp_leads, track_catalog_views, track_quotes, track_purchases")
      .eq("store_id", data.storeId)
      .maybeSingle();
    const config = rawConfig
      ? {
          ...rawConfig,
          track_lead: rawConfig.track_quotes,
          track_whatsapp_click: rawConfig.track_whatsapp_leads,
          track_add_to_cart: rawConfig.track_purchases,
          track_initiate_checkout: rawConfig.track_purchases,
          track_view_content: rawConfig.track_catalog_views,
        }
      : null;

    const metaSecrets = config
      ? await migrateLegacyPixelSecrets(supabase, data.storeId, config as Record<string, any>)
      : {};
    const storeFallbackToken = typeof metaSecrets?.access_token === "string" ? metaSecrets.access_token.trim() : "";

    // Busca Multi-Pixel ativo (marketing_source_pixels) e seleciona destinos por roteamento
    type ResolvedCapiTarget = {
      sourcePixelId: string | null;
      externalPixelId: string;
      token: string;
      testEventCode: string;
    };
    const targets: ResolvedCapiTarget[] = [];

    try {
      const { data: multiPixels } = await (supabase.from("marketing_source_pixels") as any)
        .select("id, provider, external_pixel_id, secret_payload_encrypted, test_event_code, enabled_events, routing_rules, is_default, is_active")
        .eq("store_id", data.storeId)
        .eq("provider", "meta_pixel")
        .eq("is_active", true);

      if (Array.isArray(multiPixels) && multiPixels.length > 0) {
        const routingCtx: PixelRoutingContext = {
          sourcePixelId: data.sourcePixelId || null,
          campaignId: data.campaignId || (data.customData?.campaign_id ? String(data.customData.campaign_id) : null),
          adId: data.adId || (data.customData?.ad_id ? String(data.customData.ad_id) : null),
          formId: data.formId || (data.customData?.form_id ? String(data.customData.form_id) : null),
          nicheId: data.nicheId || null,
          landingPath: data.landingPath || data.eventSourceUrl || null,
        };
        const matched = selectMatchedPixelsForContext(multiPixels, routingCtx, data.eventName, "meta_pixel");
        for (const mp of matched) {
          let pixelToken = "";
          let pixelTestCode = String(mp.test_event_code || "").trim();
          if (mp.secret_payload_encrypted) {
            try {
              const dec = JSON.parse(decryptSecret(String(mp.secret_payload_encrypted)));
              if (typeof dec?.access_token === "string") pixelToken = dec.access_token.trim();
              if (typeof dec?.test_event_code === "string" && dec.test_event_code.trim()) {
                pixelTestCode = dec.test_event_code.trim();
              }
            } catch {}
          }
          const resolvedTok = pixelToken || storeFallbackToken;
          if (mp.external_pixel_id && resolvedTok) {
            targets.push({
              sourcePixelId: String(mp.id),
              externalPixelId: String(mp.external_pixel_id),
              token: resolvedTok,
              testEventCode: pixelTestCode,
            });
          }
        }
      }
    } catch {
      // Fallback para store_pixel_configs caso migration ainda nao aplicada
    }

    if (targets.length === 0) {
      if (error || !config || !config.meta_pixel_id) {
        return { sent: false, reason: "CAPI não configurado para esta loja" };
      }
      if (!storeFallbackToken) {
        return { sent: false, reason: "Token CAPI não provisionado no cofre da loja" };
      }
      if (data.eventName === "Lead" && !config.track_lead) return { sent: false, reason: "Evento Lead desativado" };
      if (data.eventName === "Contact" && !config.track_whatsapp_click) return { sent: false, reason: "Evento WhatsApp desativado" };
      if (data.eventName === "AddToCart" && !config.track_add_to_cart) return { sent: false, reason: "Evento AddToCart desativado" };
      if (data.eventName === "InitiateCheckout" && !config.track_initiate_checkout) return { sent: false, reason: "Evento Checkout desativado" };
      if (data.eventName === "ViewContent" && !config.track_view_content) return { sent: false, reason: "Evento ViewContent desativado" };

      targets.push({
        sourcePixelId: null,
        externalPixelId: String(config.meta_pixel_id),
        token: storeFallbackToken,
        testEventCode: typeof metaSecrets.test_event_code === "string" ? metaSecrets.test_event_code.trim() : "",
      });
    }

    // Formata os dados do usuário com Hash SHA-256 (Padrão Meta Conversions API)
    const hashedUserData: Record<string, any> = {};
    if (data.userData?.email) {
      const normalizedEmail = data.userData.email.trim().toLowerCase();
      hashedUserData.em = [hashSha256(normalizedEmail)];
    }
    if (data.userData?.phone) {
      const normalizedPhone = normalizeBrazilPhone(data.userData.phone);
      if (normalizedPhone) hashedUserData.ph = [hashSha256(normalizedPhone)];
    }
    if (data.userData?.externalId) {
      hashedUserData.external_id = [hashSha256(data.userData.externalId.trim().toLowerCase())];
    }
    let req: Request | null = null;
    try {
      const { getRequest } = await import("@tanstack/start-server-core");
      req = getRequest();
    } catch {}
    const requestUrl = req?.url ? new URL(req.url) : null;
    const cookieHeader = req?.headers.get("cookie") || "";
    const readCookie = (name: string) => cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] || null;
    const requestFbp = readCookie("_fbp");
    const requestFbc = readCookie("_fbc") || (requestUrl?.searchParams.get("fbclid") ? `fb.1.${Date.now()}.${requestUrl.searchParams.get("fbclid")}` : null);
    if (requestFbp || data.userData?.fbp) hashedUserData.fbp = (requestFbp || data.userData?.fbp || "").trim();
    if (requestFbc || data.userData?.fbc) hashedUserData.fbc = (requestFbc || data.userData?.fbc || "").trim();
    const { getRealClientIP } = await import("@/lib/network-telemetry.server");
    const resolvedIp = (req ? getRealClientIP(req) : null) || data.userData?.clientIpAddress || null;
    if (resolvedIp) {
      hashedUserData.client_ip_address = resolvedIp;
    }
    const resolvedUa = req?.headers.get("user-agent") || data.userData?.clientUserAgent;
    if (resolvedUa) {
      hashedUserData.client_user_agent = resolvedUa;
    }

    const eventPayload: Record<string, any> = {
      event_name: data.eventName,
      event_id: data.eventId,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: req?.url || data.eventSourceUrl || undefined,
      user_data: hashedUserData,
      custom_data: {
        ...(data.customData || {}),
        lead_event_source: data.eventName === "QualifiedLead" ? "crm_qualification" : (data.customData?.lead_event_source || "waesy_hub"),
      },
    };

    let sentCount = 0;
    let totalEventsReceived = 0;
    const perPixelResults: Array<{ sourcePixelId: string | null; externalPixelId: string; sent: boolean; error?: any }> = [];

    for (const target of targets) {
      const targetPayload: Record<string, any> = {
        data: [eventPayload],
      };
      const effectiveTestCode = (data.testEventCode || target.testEventCode || "").trim();
      if (effectiveTestCode) {
        targetPayload.test_event_code = effectiveTestCode;
      }

      try {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${encodeURIComponent(target.externalPixelId)}/events?access_token=${encodeURIComponent(target.token)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(targetPayload),
          }
        );

        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.warn("[Meta CAPI warning]:", result);
          perPixelResults.push({
            sourcePixelId: target.sourcePixelId,
            externalPixelId: target.externalPixelId,
            sent: false,
            error: result,
          });
        } else {
          sentCount += 1;
          totalEventsReceived += Number(result.events_received || 1);
          perPixelResults.push({
            sourcePixelId: target.sourcePixelId,
            externalPixelId: target.externalPixelId,
            sent: true,
          });
          if (target.sourcePixelId) {
            await (supabase.from("marketing_source_pixels") as any)
              .update({ last_fired_at: new Date().toISOString() })
              .eq("id", target.sourcePixelId)
              .eq("store_id", data.storeId)
              .then(() => null, () => null);
          }
        }
      } catch (fetchErr: any) {
        console.error("[Meta CAPI error]:", fetchErr);
        perPixelResults.push({
          sourcePixelId: target.sourcePixelId,
          externalPixelId: target.externalPixelId,
          sent: false,
          error: fetchErr?.message,
        });
      }
    }

    if (sentCount === 0) {
      return {
        sent: false,
        error: perPixelResults[0]?.error || "CAPI error",
        perPixelResults,
      };
    }

    return {
      sent: true,
      events_received: totalEventsReceived,
      sourcePixelId: perPixelResults.find((p) => p.sent)?.sourcePixelId || null,
      externalPixelId: perPixelResults.find((p) => p.sent)?.externalPixelId || null,
      perPixelResults,
    };
  });

/**
 * Disparo server-side para Google Ads Enhanced Conversions via GA4 Measurement Protocol v2.
 * Usa o google_analytics_id (G-XXXX) e google_ads_id da loja para rastrear conversões.
 */
async function dispatchGoogleAdsConversion(params: {
  storeId: string;
  eventName: string;
  conversionValue: number;
  currency: string;
  clientId?: string;
  userId?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  deviceId?: string;
  transactionId: string;
  supabase: ReturnType<typeof getServerClient>;
}): Promise<{ sent: boolean; error?: string }> {
  const { data: config } = await params.supabase
    .from("store_pixel_configs")
    .select("ga4_measurement_id, google_ads_id, google_ads_conversion_label")
    .eq("store_id", params.storeId)
    .maybeSingle();

  // Requer o GA4 Measurement ID (G-XXXX) e o API Secret do GA4 Data Stream
  const googleSecrets = await getActiveIntegrationPayload(params.storeId, "google_analytics");
  const measurementId = String(googleSecrets?.measurement_id || config?.ga4_measurement_id || "").trim();
  if (!measurementId) {
    return { sent: false, error: "Google Analytics ID não configurado" };
  }

  let apiSecret: string | null = typeof googleSecrets?.api_secret === "string" ? googleSecrets.api_secret.trim() : null;
  if (!apiSecret && typeof config?.google_ads_id === "string" && config.google_ads_id.startsWith("{")) {
    try {
      const parsed = JSON.parse(config.google_ads_id);
      apiSecret = parsed.api_secret || null;
    } catch {}
  }

  if (!apiSecret) {
    return { sent: false, error: "GA4 API Secret não configurado. Adicione em Pixels > Google Ads & GA4." };
  }

  const resolvedClientId =
    params.clientId?.trim() ||
    params.deviceId?.trim() ||
    (params.gclid || params.gbraid || params.wbraid || params.transactionId
      ? `waesy.${String(params.gclid || params.gbraid || params.wbraid || params.transactionId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24)}.${Math.floor(Date.now() / 1000)}`
      : undefined);

  if (!resolvedClientId && !params.userId) {
    return { sent: false, error: "Identificador real do cliente não disponível para Google Ads/GA4" };
  }

  const normalizedGaEvent =
    params.eventName === "Lead" ||
    params.eventName === "QualifiedLead" ||
    params.eventName === "Contact" ||
    params.eventName === "generate_lead"
      ? "generate_lead"
      : params.eventName === "Purchase" || params.eventName === "purchase"
      ? "purchase"
      : "generate_lead";

  const mpPayload = {
    ...(resolvedClientId ? { client_id: resolvedClientId } : {}),
    ...(params.userId ? { user_id: params.userId } : {}),
    events: [
      {
        name: normalizedGaEvent,
        params: {
          currency: params.currency,
          value: params.conversionValue,
          transaction_id: params.transactionId,
          event_id: params.transactionId,
          engagement_time_msec: 1,
          ...(params.gclid ? { gclid: params.gclid } : {}),
          ...(params.gbraid ? { gbraid: params.gbraid } : {}),
          ...(params.wbraid ? { wbraid: params.wbraid } : {}),
          ...(config?.google_ads_conversion_label ? { send_to: `${config.google_ads_id || measurementId}/${config.google_ads_conversion_label}` } : {}),
        },
      },
    ],
  };

  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mpPayload),
      }
    );

    if (res.status === 204 || res.ok) {
      return { sent: true };
    }

    const errorBody = await res.text().catch(() => "");
    return { sent: false, error: `GA4 MP respondeu ${res.status}: ${errorBody}` };
  } catch (err: any) {
    return { sent: false, error: err?.message || "Erro de rede ao enviar para Google Analytics" };
  }
}

/**
 * Disparo e auditoria completa de retorno de conversão para Meta CAPI e Google Ads.
 * Registra o status deterministicamente em `lead_conversion_telemetry`.
 */
export const dispatchLeadConversionWithAudit = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().min(1),
      leadId: z.string().min(1),
      email: z.string().optional(),
      phone: z.string().optional(),
      conversionValue: z.number().optional().default(0),
      channel: z.enum(["meta_capi", "google_ads", "tiktok"]).default("meta_capi"),
      sourceUrl: z.string().optional(),
      clientId: z.string().optional(), // GA4 client_id (gerado pelo gtag)
      eventId: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "content"]);
    if (identity.store_id !== data.storeId) throw new Error("Lead fora do tenant autenticado.");
    const eventId = data.eventId || `lead_${data.leadId}`;

    let dispatchResult: any = { sent: false };

    if (data.channel === "meta_capi") {
      // Dispara via Meta Conversions API (servidor)
      dispatchResult = await dispatchMetaCapiEvent({
        data: {
          storeId: data.storeId,
          eventName: "Lead",
          eventId,
          eventSourceUrl: data.sourceUrl,
          userData: {
            email: data.email,
            phone: data.phone,
          },
          customData: {
            value: data.conversionValue,
            currency: "BRL",
            lead_id: data.leadId,
          },
        },
      });
    } else if (data.channel === "google_ads") {
      // Dispara via Google Ads Enhanced Conversions / GA4 Measurement Protocol v2
      dispatchResult = await dispatchGoogleAdsConversion({
        storeId: data.storeId,
        eventName: "Lead",
        conversionValue: data.conversionValue ?? 0,
        currency: "BRL",
        clientId: data.clientId,
        transactionId: eventId,
        supabase,
      });
    } else if (data.channel === "tiktok") {
      // TikTok Events API — implementação futura (registra como dispatched para auditoria)
      dispatchResult = { sent: false, reason: "TikTok Events API será implementado na próxima fase." };
    }

    // Registra imutavelmente na tabela de telemetria
    const { data: telemetryRow, error } = await supabase
      .from("lead_conversion_telemetry")
      .insert({
        store_id: data.storeId,
        event_name: "Lead",
        event_id: eventId,
        channel: data.channel,
        status: dispatchResult.sent ? "delivered" : "failed",
        response_data: dispatchResult,
      })
      .select("id, event_id, status, dispatched_at")
      .single();

    if (error) {
      await logSystemError({
        operation: "dispatchLeadConversionWithAudit",
        error,
        table_name: "lead_conversion_telemetry",
        contract_name: "dispatchLeadConversionWithAudit",
      });
    }

    return {
      success: true,
      eventId,
      channel: data.channel,
      status: dispatchResult.sent ? "delivered" : "failed",
      telemetryId: telemetryRow?.id || null,
    };
  });

/**
 * Disparo Unificado Closed-Loop de Qualificação de Lead para Meta CAPI e Google Ads
 * Executado quando um lead avança para estágios de qualificação ou conversão no CRM.
 */
export const dispatchClosedLoopLeadQualification = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().min(1),
      leadId: z.string().min(1),
      stage: z.string(),
      stagePurpose: z.enum(["inbox", "in_progress", "review", "won", "lost", "archived"]).optional().nullable(),
      email: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      conversionValue: z.number().optional().default(0),
      clientIpAddress: z.string().optional().nullable(),
      clientUserAgent: z.string().optional().nullable(),
      fbp: z.string().optional().nullable(),
      fbc: z.string().optional().nullable(),
      gclid: z.string().optional().nullable(),
      gbraid: z.string().optional().nullable(),
      wbraid: z.string().optional().nullable(),
      ctwaClid: z.string().optional().nullable(),
      deviceId: z.string().optional().nullable(),
      profileId: z.string().optional().nullable(),
      sourceUrl: z.string().optional().nullable(),
      eventId: z.string().optional().nullable(),
      sourcePixelId: z.string().uuid().optional().nullable(),
      campaignId: z.string().optional().nullable(),
      adId: z.string().optional().nullable(),
      formId: z.string().optional().nullable(),
      nicheId: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "content"]);
    if (identity.store_id !== data.storeId) throw new Error("Lead fora do tenant autenticado.");

    const stageResolution = resolveKanbanStageSynonym(data.stage);
    const effectivePurpose = data.stagePurpose || stageResolution.purpose;
    const isWon =
      effectivePurpose === "won" ||
      ["won", "converted"].includes(stageResolution.canonicalBucket);
    const isQualified =
      effectivePurpose === "review" ||
      effectivePurpose === "in_progress" ||
      ["contacted", "qualified", "proposal", "negotiation"].includes(stageResolution.canonicalBucket);

    const hasPurchaseValue = (data.conversionValue || 0) > 0;
    const metaEventName = isWon && hasPurchaseValue ? "Purchase" : (isWon || isQualified ? "QualifiedLead" : "Lead");
    const gaEventName = isWon && hasPurchaseValue ? "purchase" : "generate_lead";
    const eventId = data.eventId || `lead_${data.leadId}_${stageResolution.matchedStageKey}`;

    const results: { meta?: any; google?: any } = {};
    const supabase = getServerClient();

    // 1. Disparo Meta CAPI (Multi-Pixel com roteamento por campanha/anuncio/formulario/nicho)
    try {
      results.meta = await dispatchMetaCapiEvent({
        data: {
          storeId: data.storeId,
          eventName: metaEventName,
          eventId,
          eventSourceUrl: data.sourceUrl || undefined,
          sourcePixelId: data.sourcePixelId || null,
          campaignId: data.campaignId || null,
          adId: data.adId || null,
          formId: data.formId || null,
          nicheId: data.nicheId || null,
          userData: {
            email: data.email || undefined,
            phone: data.phone || undefined,
            clientIpAddress: data.clientIpAddress || undefined,
            clientUserAgent: data.clientUserAgent || undefined,
            fbp: data.fbp || undefined,
            fbc: data.fbc || undefined,
            externalId: data.profileId || data.leadId,
          },
          customData: {
            crm_stage: stageResolution.matchedStageKey,
            crm_purpose: effectivePurpose,
            lead_id: data.leadId,
            ...(data.campaignId ? { campaign_id: data.campaignId } : {}),
            ...(data.adId ? { ad_id: data.adId } : {}),
            ...(data.formId ? { form_id: data.formId } : {}),
            value: data.conversionValue || 0,
            currency: "BRL",
            lead_event_source: "crm_pipeline",
          },
        },
      });
    } catch (err: any) {
      results.meta = { sent: false, error: err?.message };
    }

    // 2. Disparo Google Ads Enhanced Conversions / GA4 Measurement Protocol
    try {
      results.google = await dispatchGoogleAdsConversion({
        storeId: data.storeId,
        eventName: gaEventName,
        conversionValue: data.conversionValue || 0,
        currency: "BRL",
        clientId: data.fbp || undefined,
        deviceId: data.deviceId || undefined,
        gclid: data.gclid || undefined,
        gbraid: data.gbraid || undefined,
        wbraid: data.wbraid || undefined,
        transactionId: eventId,
        userId: data.profileId || data.leadId,
        supabase,
      });
    } catch (err: any) {
      results.google = { sent: false, error: err?.message };
    }

    // Registra log auditavel na tabela lead_conversion_telemetry (tolerante a schema antigo)
    const auditLogs: Array<{ channel: string; result: any; eventName: string }> = [
      { channel: "meta_capi", result: results.meta, eventName: metaEventName },
      { channel: "google_ads", result: results.google, eventName: gaEventName },
    ];
    for (const entry of auditLogs) {
      if (!entry.result) continue;
      if (entry.result.reason === "CAPI não configurado para esta loja" || entry.result.error === "Google Analytics ID não configurado") {
        continue;
      }
      try {
        const telemetryRow: Record<string, any> = {
          store_id: data.storeId,
          lead_id: data.leadId,
          event_name: entry.eventName,
          event_id: `${eventId}_${entry.channel}`,
          event_source: "crm_kanban",
          channel: entry.channel,
          status: entry.result.sent ? "delivered" : "failed",
          response_data: entry.result,
          ...(entry.channel === "meta_capi" && entry.result.sourcePixelId
            ? { source_pixel_id: entry.result.sourcePixelId }
            : {}),
          ...(entry.channel === "meta_capi" && entry.result.externalPixelId
            ? { external_pixel_id: entry.result.externalPixelId }
            : {}),
        };
        const insTelemetry = await (supabase.from("lead_conversion_telemetry") as any).insert(telemetryRow);
        if (insTelemetry?.error && /source_pixel_id|external_pixel_id|column/i.test(insTelemetry.error.message || "")) {
          delete telemetryRow.source_pixel_id;
          delete telemetryRow.external_pixel_id;
          await (supabase.from("lead_conversion_telemetry") as any).insert(telemetryRow);
        }
      } catch {
        // Nao interrompe o fluxo de movimentacao do Kanban por erro de auditoria
      }
    }

    const delivered = Boolean(results.meta?.sent || results.google?.sent);
    return {
      success: delivered,
      stage: stageResolution.matchedStageKey,
      metaEvent: metaEventName,
      gaEvent: gaEventName,
      results,
      eventId,
    };
  });

/**
 * Testa o pipeline completo de Pixels (Meta CAPI e Google Ads / GA4 MP)
 * usando segredos ja armazenados no cofre ou recem-digitados.
 */
export const testStorePixelPipeline = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      channel: z.enum(["meta_capi", "google_ads", "both"]).default("both"),
      testEventCode: z.string().optional().nullable(),
      sourcePixelId: z.string().uuid().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const storeId = data.storeId || identity.store_id;
    if (!storeId) throw new Error("Loja não encontrada.");

    const testEventId = `diag_${storeId.slice(0, 8)}_${Date.now()}`;
    const out: { meta?: any; google?: any } = {};

    if (data.channel === "meta_capi" || data.channel === "both") {
      out.meta = await dispatchMetaCapiEvent({
        data: {
          storeId,
          eventName: "Lead",
          eventId: `${testEventId}_meta`,
          testEventCode: data.testEventCode?.trim() || undefined,
          sourcePixelId: data.sourcePixelId || null,
          customData: { test_event: true, source: "workspace_pixel_diagnostic" },
          userData: { externalId: identity.id, email: identity.email || undefined },
        },
      });
    }

    if (data.channel === "google_ads" || data.channel === "both") {
      out.google = await dispatchGoogleAdsConversion({
        storeId,
        eventName: "generate_lead",
        conversionValue: 1,
        currency: "BRL",
        deviceId: `diag_${identity.id}`,
        userId: identity.id,
        transactionId: `${testEventId}_ga`,
        supabase,
      });
    }

    return {
      ok: Boolean(out.meta?.sent || out.google?.sent),
      meta: out.meta || null,
      google: out.google || null,
    };
  });

export const recordStorefrontAttributionVisit = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      landingUrl: z.string().optional().nullable(),
      sourceUrl: z.string().optional().nullable(),
      referrer: z.string().optional().nullable(),
      entityType: z.string().optional().nullable(),
      entityId: z.string().optional().nullable(),
      entityTitle: z.string().optional().nullable(),
      utmSource: z.string().optional().nullable(),
      utmMedium: z.string().optional().nullable(),
      utmCampaign: z.string().optional().nullable(),
      utmContent: z.string().optional().nullable(),
      utmTerm: z.string().optional().nullable(),
      fbclid: z.string().optional().nullable(),
      fbp: z.string().optional().nullable(),
      fbc: z.string().optional().nullable(),
      gclid: z.string().optional().nullable(),
      gbraid: z.string().optional().nullable(),
      wbraid: z.string().optional().nullable(),
      ttclid: z.string().optional().nullable(),
      ctwaClid: z.string().optional().nullable(),
      adId: z.string().optional().nullable(),
      adsetId: z.string().optional().nullable(),
      campaignId: z.string().optional().nullable(),
      creativeId: z.string().optional().nullable(),
      formId: z.string().optional().nullable(),
      deviceId: z.string().optional().nullable(),
      visitorId: z.string().optional().nullable(),
      clientCity: z.string().optional().nullable(),
      clientState: z.string().optional().nullable(),
      gpsLatitude: z.number().optional().nullable(),
      gpsLongitude: z.number().optional().nullable(),
      gpsSource: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    let userPhone: string | null = null;
    let userEmail: string | null = null;
    if (identity?.id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", identity.id)
        .maybeSingle();
      userPhone = prof?.phone || null;
      userEmail = identity.email || null;
    }

    let ipAddress: string | null = null;
    let geoCity: string | null = data.clientCity || null;
    let geoState: string | null = data.clientState || null;
    let geoCountry: string | null = "BR";
    let gpsLat: number | null = typeof data.gpsLatitude === "number" ? data.gpsLatitude : null;
    let gpsLng: number | null = typeof data.gpsLongitude === "number" ? data.gpsLongitude : null;
    let gpsSource: string | null = data.gpsSource || null;

    try {
      const { getRequest } = await import("@tanstack/start-server-core");
      const { captureRequestTelemetry } = await import("@/lib/network-telemetry.server");
      const req = getRequest();
      const net = captureRequestTelemetry(req, {
        city: data.clientCity || undefined,
        state: data.clientState || undefined,
        lat: gpsLat ?? undefined,
        lng: gpsLng ?? undefined,
      });
      ipAddress = net.ip || null;
      geoCity = data.clientCity || net.geo.city || null;
      geoState = data.clientState || net.geo.state || null;
      geoCountry = net.geo.country || "BR";
      if (gpsLat === null && typeof net.geo.latitude === "number") gpsLat = net.geo.latitude;
      if (gpsLng === null && typeof net.geo.longitude === "number") gpsLng = net.geo.longitude;
      if (!gpsSource) gpsSource = net.geo.source || null;
    } catch {
      // Ambiente de teste sem request HTTP ativo
    }

    const { recordAttributionTouchpoint } = await import("@/services/omnichannel-attribution.server");
    const touchpointId = await recordAttributionTouchpoint(supabase, {
      storeId: data.storeId,
      deviceId: data.deviceId || null,
      visitorId: data.visitorId || null,
      profileId: identity?.id || null,
      phone: userPhone,
      email: userEmail,
      ctwaClid: data.ctwaClid || null,
      fbclid: data.fbclid || null,
      fbp: data.fbp || null,
      fbc: data.fbc || null,
      gclid: data.gclid || data.gbraid || data.wbraid || null,
      ttclid: data.ttclid || null,
      utmSource: data.utmSource || null,
      utmMedium: data.utmMedium || null,
      utmCampaign: data.utmCampaign || null,
      utmContent: data.utmContent || null,
      utmTerm: data.utmTerm || null,
      adId: data.adId || null,
      adsetId: data.adsetId || null,
      campaignId: data.campaignId || null,
      creativeId: data.creativeId || null,
      formId: data.formId || null,
      sourceUrl: data.sourceUrl || null,
      landingUrl: data.landingUrl || null,
      referrer: data.referrer || null,
      entityType: data.entityType || null,
      entityId: data.entityId || null,
      entityTitle: data.entityTitle || null,
      capturedVia: "storefront_visit",
      ipAddress,
      geoCity,
      geoState,
      geoCountry,
      gpsLatitude: gpsLat,
      gpsLongitude: gpsLng,
      gpsSource,
      metadata: {
        ...(data.gbraid ? { gbraid: data.gbraid } : {}),
        ...(data.wbraid ? { wbraid: data.wbraid } : {}),
      },
    });

    return { ok: true, touchpointId };
  });

export const getStoreAttributionOverview = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        storeId: z.string().uuid().optional(),
        days: z.number().int().min(1).max(365).optional().default(30),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data?.storeId || identity.store_id || (await resolveTenantStoreId());
    if (!storeId) throw new Error("Identificador da loja não fornecido.");
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"], storeId);
    const supabase = getServerClient();

    const sinceIso = new Date(Date.now() - (data?.days || 30) * 86400_000).toISOString();

    const [tpRes, telemetryRes, threadsRes] = await Promise.all([
      (supabase.from("ad_attribution_touchpoints") as any)
        .select("id, phone_e164, phone_digits, email, lead_code, ad_platform, utm_source, utm_medium, utm_campaign, ad_id, campaign_id, form_id, source_pixel_id, ad_headline, entity_type, entity_title, ctwa_clid, fbclid, gclid, captured_via, lead_id, thread_id, metadata, created_at")
        .eq("store_id", storeId)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("lead_conversion_telemetry")
        .select("id, event_name, event_id, event_source, channel, lead_id, thread_id, source_pixel_id, external_pixel_id, status, response_data, dispatched_at")
        .eq("store_id", storeId)
        .gte("dispatched_at", sinceIso)
        .order("dispatched_at", { ascending: false })
        .limit(100)
        .then(async (res: any) =>
          res?.error && /source_pixel_id|external_pixel_id|column/i.test(res.error.message || "")
            ? supabase
                .from("lead_conversion_telemetry")
                .select("id, event_name, event_id, event_source, channel, lead_id, thread_id, status, response_data, dispatched_at")
                .eq("store_id", storeId)
                .gte("dispatched_at", sinceIso)
                .order("dispatched_at", { ascending: false })
                .limit(100)
            : res,
        ),
      supabase
        .from("chat_threads")
        .select("id, guest_name, group_subject, primary_phone_e164, lead_id, attribution, updated_at")
        .eq("store_id", storeId)
        .not("attribution", "eq", "{}")
        .gte("updated_at", sinceIso)
        .order("updated_at", { ascending: false })
        .limit(30),
    ]);

    const touchpoints = (tpRes?.data as any[]) || [];
    const telemetryLogs = (telemetryRes?.data as any[]) || [];
    const attributedThreads = (threadsRes?.data as any[]) || [];

    const touchpointsByContact = new Map<string, number>();
    const campaignsAgg = new Map<string, { campaign: string; touchpoints: number; ctwa: number; leads: Set<string> }>();
    const pixelsAgg = new Map<string, { pixelId: string; delivered: number; failed: number }>();

    for (const tp of touchpoints) {
      const contactKey = tp.lead_id || tp.phone_digits || tp.thread_id || tp.email || tp.id;
      touchpointsByContact.set(String(contactKey), (touchpointsByContact.get(String(contactKey)) || 0) + 1);
      const campName = String(tp.utm_campaign || tp.campaign_id || tp.ad_headline || "").trim();
      if (campName) {
        const entry = campaignsAgg.get(campName) || { campaign: campName, touchpoints: 0, ctwa: 0, leads: new Set<string>() };
        entry.touchpoints += 1;
        if (tp.ctwa_clid) entry.ctwa += 1;
        if (tp.lead_id || tp.phone_digits) entry.leads.add(String(tp.lead_id || tp.phone_digits));
        campaignsAgg.set(campName, entry);
      }
    }
    for (const log of telemetryLogs) {
      const px = String(log.external_pixel_id || log.source_pixel_id || "").trim();
      if (!px) continue;
      const entry = pixelsAgg.get(px) || { pixelId: px, delivered: 0, failed: 0 };
      if (log.status === "delivered" || log.status === "dispatched") entry.delivered += 1;
      else if (log.status === "failed") entry.failed += 1;
      pixelsAgg.set(px, entry);
    }

    const multiTouchContactsCount = Array.from(touchpointsByContact.values()).filter((c) => c > 1).length;
    const avgTouchpointsPerContact =
      touchpointsByContact.size > 0
        ? Number((touchpoints.length / touchpointsByContact.size).toFixed(2))
        : 0;

    return {
      touchpoints,
      telemetryLogs,
      attributedThreads,
      summary: {
        totalTouchpoints: touchpoints.length,
        uniqueContactsCount: touchpointsByContact.size,
        multiTouchContactsCount,
        avgTouchpointsPerContact,
        metaAdsCount: touchpoints.filter((t) => t.ad_platform === "meta_ads" || t.ctwa_clid || t.fbclid).length,
        googleAdsCount: touchpoints.filter((t) => t.ad_platform === "google_ads" || t.gclid).length,
        formSubmissionsCount: touchpoints.filter((t) => String(t.captured_via || "").includes("form")).length,
        whatsappClicksCount: touchpoints.filter((t) => String(t.captured_via || "").includes("whatsapp")).length,
        ctwaCount: touchpoints.filter((t) => Boolean(t.ctwa_clid)).length,
        capiSuccessCount: telemetryLogs.filter((l) => l.status === "delivered" || l.status === "dispatched").length,
        capiErrorCount: telemetryLogs.filter((l) => l.status === "failed").length,
      },
      topCampaigns: Array.from(campaignsAgg.values())
        .map((c) => ({ campaign: c.campaign, touchpoints: c.touchpoints, ctwa: c.ctwa, uniqueContacts: c.leads.size }))
        .sort((a, b) => b.touchpoints - a.touchpoints)
        .slice(0, 10),
      pixelBreakdown: Array.from(pixelsAgg.values()).slice(0, 10),
    };
  });

// ── Fontes de Aquisição & Multi-Pixel CRUD (EARS-04) ─────────────────────────
function slugifySourceName(name: string): string {
  return slugify(name).slice(0, 60) || "fonte";
}

export const listMarketingSourcesAndPixels = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }): Promise<{ sources: MarketingSourceDTO[]; migrationReady: boolean }> => {
    const identity = await getServerIdentity();
    const storeId = data?.storeId || identity.store_id || (await resolveTenantStoreId());
    if (!storeId) throw new Error("Identificador da loja não fornecido.");
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"], storeId);
    const supabase = getServerClient();

    try {
      const [srcRes, pxRes, telRes] = await Promise.all([
        (supabase.from("marketing_sources") as any)
          .select("id, store_id, slug, name, platform, description, is_active, metadata, created_at, updated_at")
          .eq("store_id", storeId)
          .order("created_at", { ascending: true }),
        (supabase.from("marketing_source_pixels") as any)
          .select("id, store_id, source_id, name, provider, external_pixel_id, ad_account_id, page_id, capi_token_configured, test_event_code, enabled_events, routing_rules, is_default, is_active, last_fired_at, metadata, created_at, updated_at")
          .eq("store_id", storeId)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: true }),
        supabase
          .from("lead_conversion_telemetry")
          .select("source_pixel_id")
          .eq("store_id", storeId)
          .gte("dispatched_at", new Date(Date.now() - 86400_000).toISOString())
          .limit(300),
      ]);

      if (srcRes.error && /relation|does not exist|schema/i.test(srcRes.error.message || "")) {
        return { sources: [], migrationReady: false };
      }

      const countsByPixel = new Map<string, number>();
      for (const t of (telRes.data || []) as any[]) {
        if (t?.source_pixel_id) {
          countsByPixel.set(String(t.source_pixel_id), (countsByPixel.get(String(t.source_pixel_id)) || 0) + 1);
        }
      }

      const pixelsBySource = new Map<string, MarketingSourcePixelDTO[]>();
      for (const p of (pxRes.data || []) as any[]) {
        const dto: MarketingSourcePixelDTO = {
          id: String(p.id),
          store_id: String(p.store_id),
          source_id: String(p.source_id),
          name: String(p.name),
          provider: p.provider as PixelProviderType,
          external_pixel_id: String(p.external_pixel_id),
          ad_account_id: p.ad_account_id || null,
          page_id: p.page_id || null,
          capi_token_configured: Boolean(p.capi_token_configured),
          test_event_code: p.test_event_code || null,
          enabled_events: (p.enabled_events || {}) as PixelEnabledEvents,
          routing_rules: (p.routing_rules || {}) as PixelRoutingRules,
          is_default: Boolean(p.is_default),
          is_active: p.is_active !== false,
          last_fired_at: p.last_fired_at || null,
          events_24h: countsByPixel.get(String(p.id)) || 0,
          created_at: p.created_at,
          updated_at: p.updated_at,
        };
        const list = pixelsBySource.get(dto.source_id) || [];
        list.push(dto);
        pixelsBySource.set(dto.source_id, list);
      }

      const sources: MarketingSourceDTO[] = ((srcRes.data || []) as any[]).map((s) => ({
        id: String(s.id),
        store_id: String(s.store_id),
        slug: String(s.slug),
        name: String(s.name),
        platform: s.platform as MarketingSourcePlatform,
        description: s.description || null,
        is_active: s.is_active !== false,
        pixels: pixelsBySource.get(String(s.id)) || [],
        created_at: s.created_at,
        updated_at: s.updated_at,
      }));

      return { sources, migrationReady: true };
    } catch {
      return { sources: [], migrationReady: false };
    }
  });

export const upsertMarketingSource = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional().nullable(),
      storeId: z.string().uuid().optional(),
      name: z.string().trim().min(2).max(120),
      slug: z.string().trim().max(80).optional().nullable(),
      platform: z
        .enum(["meta_ads", "google_ads", "tiktok_ads", "web_portal", "whatsapp_organic", "referral", "offline", "custom"])
        .default("meta_ads"),
      description: z.string().trim().max(400).optional().nullable(),
      isActive: z.boolean().optional().default(true),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data.storeId || identity.store_id;
    if (!storeId) throw new Error("Identificador da loja não fornecido.");
    assertStoreAccess(identity, ["owner", "admin", "manager"], storeId);

    const supabase = getServerClient();
    const nowIso = new Date().toISOString();
    const slug = data.slug?.trim() ? slugifySourceName(data.slug) : slugifySourceName(data.name);
    const payload = {
      store_id: storeId,
      slug,
      name: data.name.trim(),
      platform: data.platform,
      description: data.description?.trim() || null,
      is_active: data.isActive ?? true,
      updated_at: nowIso,
    };

    if (data.id) {
      const { data: updated, error } = await (supabase.from("marketing_sources") as any)
        .update(payload)
        .eq("id", data.id)
        .eq("store_id", storeId)
        .select("*")
        .single();
      if (error) throw new Error(`Falha ao atualizar fonte de marketing: ${error.message}`);
      invalidateMicroCachePrefix(`pixels:public:${storeId}`);
      return updated;
    }

    const { data: created, error } = await (supabase.from("marketing_sources") as any)
      .upsert(payload, { onConflict: "store_id,slug" })
      .select("*")
      .single();
    if (error) throw new Error(`Falha ao criar fonte de marketing: ${error.message}`);
    invalidateMicroCachePrefix(`pixels:public:${storeId}`);
    return created;
  });

export const deleteMarketingSource = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), storeId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data.storeId || identity.store_id;
    if (!storeId) throw new Error("Identificador da loja não fornecido.");
    assertStoreAccess(identity, ["owner", "admin", "manager"], storeId);
    const { error } = await (getServerClient().from("marketing_sources") as any)
      .delete()
      .eq("id", data.id)
      .eq("store_id", storeId);
    if (error) throw new Error(`Falha ao excluir fonte: ${error.message}`);
    invalidateMicroCachePrefix(`pixels:public:${storeId}`);
    return { deleted: true, id: data.id };
  });

export const upsertMarketingSourcePixel = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional().nullable(),
      storeId: z.string().uuid().optional(),
      sourceId: z.string().uuid(),
      name: z.string().trim().min(2).max(120),
      provider: z.enum(["meta_pixel", "google_ads", "ga4", "tiktok_pixel", "custom_capi"]).default("meta_pixel"),
      externalPixelId: z.string().trim().min(3).max(160),
      adAccountId: z.string().trim().max(80).optional().nullable(),
      pageId: z.string().trim().max(80).optional().nullable(),
      capiAccessToken: z.string().trim().max(800).optional().nullable(),
      testEventCode: z.string().trim().max(80).optional().nullable(),
      enabledEvents: z.record(z.boolean()).optional(),
      routingRules: z
        .object({
          campaign_ids: z.array(z.string().trim().min(1)).optional(),
          ad_ids: z.array(z.string().trim().min(1)).optional(),
          form_ids: z.array(z.string().trim().min(1)).optional(),
          niche_ids: z.array(z.string().trim().min(1)).optional(),
          landing_paths: z.array(z.string().trim().min(1)).optional(),
        })
        .optional(),
      isDefault: z.boolean().optional().default(false),
      isActive: z.boolean().optional().default(true),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data.storeId || identity.store_id;
    if (!storeId) throw new Error("Identificador da loja não fornecido.");
    assertStoreAccess(identity, ["owner", "admin", "manager"], storeId);

    const supabase = getServerClient();
    const nowIso = new Date().toISOString();

    if (data.isDefault) {
      await (supabase.from("marketing_source_pixels") as any)
        .update({ is_default: false, updated_at: nowIso })
        .eq("store_id", storeId)
        .eq("provider", data.provider);
    }

    const tokenClean = data.capiAccessToken?.trim() || "";
    const testCodeClean = data.testEventCode?.trim() || null;

    const patch: Record<string, any> = {
      store_id: storeId,
      source_id: data.sourceId,
      name: data.name.trim(),
      provider: data.provider,
      external_pixel_id: data.externalPixelId.trim(),
      ad_account_id: data.adAccountId?.trim() || null,
      page_id: data.pageId?.trim() || null,
      ...(testCodeClean !== undefined ? { test_event_code: testCodeClean } : {}),
      ...(data.enabledEvents ? { enabled_events: data.enabledEvents } : {}),
      ...(data.routingRules ? { routing_rules: data.routingRules } : {}),
      is_default: Boolean(data.isDefault),
      is_active: data.isActive ?? true,
      updated_at: nowIso,
    };

    if (tokenClean) {
      patch.secret_payload_encrypted = encryptSecret(
        JSON.stringify({
          access_token: tokenClean,
          ...(testCodeClean ? { test_event_code: testCodeClean } : {}),
        }),
      );
      patch.capi_token_configured = true;
    }

    let saved: any = null;
    if (data.id) {
      const { data: updated, error } = await (supabase.from("marketing_source_pixels") as any)
        .update(patch)
        .eq("id", data.id)
        .eq("store_id", storeId)
        .select("id, store_id, source_id, name, provider, external_pixel_id, ad_account_id, page_id, capi_token_configured, test_event_code, enabled_events, routing_rules, is_default, is_active, last_fired_at, created_at, updated_at")
        .single();
      if (error) throw new Error(`Falha ao atualizar pixel: ${error.message}`);
      saved = updated;
    } else {
      const { data: created, error } = await (supabase.from("marketing_source_pixels") as any)
        .insert(patch)
        .select("id, store_id, source_id, name, provider, external_pixel_id, ad_account_id, page_id, capi_token_configured, test_event_code, enabled_events, routing_rules, is_default, is_active, last_fired_at, created_at, updated_at")
        .single();
      if (error) throw new Error(`Falha ao adicionar pixel: ${error.message}`);
      saved = created;
    }

    invalidateMicroCachePrefix(`pixels:public:${storeId}`);
    return saved as MarketingSourcePixelDTO;
  });

export const deleteMarketingSourcePixel = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), storeId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data.storeId || identity.store_id;
    if (!storeId) throw new Error("Identificador da loja não fornecido.");
    assertStoreAccess(identity, ["owner", "admin", "manager"], storeId);
    const { error } = await (getServerClient().from("marketing_source_pixels") as any)
      .delete()
      .eq("id", data.id)
      .eq("store_id", storeId);
    if (error) throw new Error(`Falha ao excluir pixel: ${error.message}`);
    invalidateMicroCachePrefix(`pixels:public:${storeId}`);
    return { deleted: true, id: data.id };
  });


