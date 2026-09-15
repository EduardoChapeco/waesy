import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { logAuditAction } from "./audit.functions";

/**
 * SERVER ONLY Helper: Retrieves the secure token payload for a given integration.
 * NEVER return this directly to the client. Use this inside other BFF functions
 * (like checkout.functions.ts) to communicate with external APIs.
 */
export async function getActiveIntegrationPayload(storeId: string, provider: string) {
 const supabase = getServerClient();
 const { data, error } = await supabase
 .from("integration_credentials")
 .select("token_payload")
 .eq("store_id", storeId)
 .eq("provider", provider)
 .eq("is_active", true)
 .single();

 if (error || !data) return null;
 return data.token_payload as Record<string, string>;
}

/**
 * Lists the active integration credentials for the store.
 * We do not return the actual sensitive token_payload to the client,
 * only the provider name and its active status.
 */
export const listIntegrationSettings = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);

 const { data: credentials, error } = await supabase
 .from("integration_credentials")
 .select("id, provider, is_active, updated_at")
 .eq("store_id", identity.store_id)
 .order("provider", { ascending: true });

 if (error || !credentials) return [];

 return credentials;
});

/**
 * Returns active public pixels/analytics IDs without exposing secret tokens.
 */
export const getPublicPixels = createServerFn({ method: "GET" }).handler(async () => {
  const { resolveTenantStoreId } = await import("@/lib/tenant.server");
  const storeId = await resolveTenantStoreId();
  if (!storeId) return [];

  const supabase = getServerClient();

  // 1. Prioridade: Tabela moderna e centralizada store_pixel_configs
  const { data: pixelConfig } = await supabase
    .from("store_pixel_configs")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

  const results: Array<{
    provider: "meta_pixel" | "google_analytics" | "google_ads" | "tiktok_pixel";
    pixelId?: string | null;
    measurementId?: string | null;
    conversionId?: string | null;
  }> = [];

  if (pixelConfig) {
    if (pixelConfig.meta_pixel_id) {
      results.push({
        provider: "meta_pixel",
        pixelId: pixelConfig.meta_pixel_id,
      });
    }
    if (pixelConfig.google_analytics_id) {
      results.push({
        provider: "google_analytics",
        measurementId: pixelConfig.google_analytics_id,
      });
    }
    if (pixelConfig.google_ads_id) {
      results.push({
        provider: "google_ads",
        conversionId: pixelConfig.google_ads_id,
      });
    }
    if (pixelConfig.tiktok_pixel_id) {
      results.push({
        provider: "tiktok_pixel",
        pixelId: pixelConfig.tiktok_pixel_id,
      });
    }

    if (results.length > 0) {
      return results;
    }
  }

  // 2. Fallback de compatibilidade legada: integration_credentials
  const { data: credentials, error } = await supabase
    .from("integration_credentials")
    .select("provider, token_payload")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .in("provider", ["meta_pixel", "google_analytics"]);

  if (error || !credentials) return [];

  return credentials.map((c) => ({
    provider: c.provider as any,
    pixelId: c.provider === "meta_pixel" ? c.token_payload?.pixel_id : null,
    measurementId: c.provider === "google_analytics" ? c.token_payload?.measurement_id : null,
  }));
});

/**
 * Saves or updates a credential.
 * The payload is securely stored in JSONB and will only be read by the server
 * when calling the external API.
 */
export const saveIntegrationCredential = createServerFn({ method: "POST" })
 .validator(
 z.object({
 provider: z.string().min(2),
 tokenPayload: z.record(z.any()),
 isActive: z.boolean().default(true),
 }),
 )
 .handler(async ({ data: { provider, tokenPayload, isActive } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);

 if (isActive) {
 const hasKeys = Object.keys(tokenPayload).length > 0;
 const allValid = Object.values(tokenPayload).every(
 (val) => typeof val === "string" && val.trim() !== "",
 );
 if (!hasKeys || !allValid) {
 throw new Error("Integração não pode ser ativada sem as chaves de API/Tokens válidos.");
 }
 }

 const { data: record, error } = await supabase
 .from("integration_credentials")
 .upsert(
 {
 store_id: identity.store_id,
 provider,
 token_payload: tokenPayload,
 is_active: isActive,
 updated_at: new Date().toISOString(),
 },
 { onConflict: "store_id, provider" },
 )
 .select("id")
 .single();

 if (error) {
 throw new Error("Erro ao salvar credencial: " + error.message);
 }

 // Audit Log (do NOT log the tokenPayload for security reasons)
 await logAuditAction(
 identity,
 "UPDATED_INTEGRATION_CREDENTIAL",
 "integration_credentials",
 record.id,
 {
 provider,
 isActive,
 },
 );

 return { status: "success", recordId: record.id };
 });

/**
 * Removes a credential entirely.
 */
export const deleteIntegrationCredential = createServerFn({ method: "POST" })
 .validator(
 z.object({
 provider: z.string().min(2),
 }),
 )
 .handler(async ({ data: { provider } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);

 const { error } = await supabase
 .from("integration_credentials")
 .delete()
 .eq("store_id", identity.store_id)
 .eq("provider", provider);

 if (error) throw new Error("Erro ao remover integração: " + error.message);

 await logAuditAction(
 identity,
 "DELETED_INTEGRATION_CREDENTIAL",
 "integration_credentials",
 null,
 {
 provider,
 },
 );

 return { status: "success" };
 });

import { getPublicApiGovernanceSettings } from "./public-apis.functions";

/**
 * Retorna a configuração pública do provedor de mapas (OpenStreetMap, Mapbox, Google Maps).
 * Padrão: OpenStreetMap ativo como open source fallback, a menos que o admin tenha configurado
 * e ativado outro provedor ou desativado o serviço de mapas.
 */
export const getPublicMapConfig = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();

  // 1. Verificar Governança Global das APIs Públicas (Admin Master)
  try {
    const gov = await getPublicApiGovernanceSettings();
    if (gov && !gov.isMapServiceActive) {
      return {
        isActive: false,
        provider: "none",
        message: "Serviço de mapas desativado nas configurações do sistema.",
      };
    }

    if (gov && gov.defaultMapProvider) {
      return {
        isActive: true,
        provider: gov.defaultMapProvider,
        apiKey: null,
        customTileUrl: null,
        message: null,
      };
    }
  } catch (err) {
    console.warn("[map-config] Falha ao consultar governança global, usando fallback defensivo:", err);
  }

  // 2. Fallback de credenciais legadas
  try {
    const { data: record } = await supabase
      .from("integration_credentials")
      .select("is_active, token_payload")
      .eq("provider", "map_service")
      .maybeSingle();

    if (record) {
      if (!record.is_active) {
        return {
          isActive: false,
          provider: "none",
          message: "Serviço de mapas desativado nas configurações do sistema.",
        };
      }
      const payload = (record.token_payload as any) || {};
      return {
        isActive: true,
        provider: payload.provider || "osm_standard",
        apiKey: payload.api_key || null,
        customTileUrl: payload.custom_tile_url || null,
        message: null,
      };
    }
  } catch {
    // Ignora erro
  }

  // 3. Fallback padrão canônico: OpenStreetMap ativo e limpo (sem watermarks)
  return {
    isActive: true,
    provider: "osm_standard",
    apiKey: null,
    customTileUrl: null,
    message: null,
  };
});
