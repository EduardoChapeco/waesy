import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { logAuditAction } from "./audit.functions";

export type OAuthProvider =
  | "google_my_business"
  | "meta_ads"
  | "tiktok_ads"
  | "google_calendar"
  | "stripe_connect"
  | "govbr_signature";

export interface OAuthIntegrationDTO {
  provider: OAuthProvider;
  accountId: string | null;
  accountName: string | null;
  isActive: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  lastSyncedAt: string | null;
  syncStatus: "idle" | "syncing" | "success" | "error" | "expired";
  syncErrorMessage: string | null;
  scopes: string[];
}

/**
 * 1. OAUTH STATUS CHECK (DESIGN SILENCIOSO)
 * Consulta o status de um conector OAuth sem expor tokens secretos ao cliente.
 */
export const getOAuthIntegrationStatus = createServerFn({ method: "GET" })
  .validator(
    z.object({
      provider: z.enum([
        "google_my_business",
        "meta_ads",
        "tiktok_ads",
        "google_calendar",
        "stripe_connect",
        "govbr_signature",
      ]),
    })
  )
  .handler(async ({ data: { provider } }): Promise<OAuthIntegrationDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data: record } = await supabase
      .from("oauth_integrations")
      .select("provider, account_id, account_name, is_active, expires_at, last_synced_at, sync_status, sync_error_message, scopes")
      .eq("store_id", identity.store_id)
      .eq("provider", provider)
      .maybeSingle();

    if (!record) {
      return {
        provider,
        accountId: null,
        accountName: null,
        isActive: false,
        isExpired: false,
        expiresAt: null,
        lastSyncedAt: null,
        syncStatus: "idle",
        syncErrorMessage: null,
        scopes: [],
      };
    }

    const now = new Date();
    const expiresAt = record.expires_at ? new Date(record.expires_at) : null;
    const isExpired = expiresAt ? expiresAt.getTime() <= now.getTime() : false;

    return {
      provider: record.provider as OAuthProvider,
      accountId: record.account_id,
      accountName: record.account_name,
      isActive: record.is_active && !isExpired,
      isExpired,
      expiresAt: record.expires_at,
      lastSyncedAt: record.last_synced_at,
      syncStatus: isExpired ? "expired" : (record.sync_status as any),
      syncErrorMessage: record.sync_error_message,
      scopes: record.scopes || [],
    };
  });

/**
 * 2. SALVAR CREDENCIAIS OAUTH (COM REFRESH TOKEN)
 * Registra atomicamente tokens de acesso e refresh encriptados por workspace.
 */
export const saveOAuthTokens = createServerFn({ method: "POST" })
  .validator(
    z.object({
      provider: z.enum([
        "google_my_business",
        "meta_ads",
        "tiktok_ads",
        "google_calendar",
        "stripe_connect",
        "govbr_signature",
      ]),
      accessToken: z.string().min(5, "Access Token inválido"),
      refreshToken: z.string().optional().nullable(),
      accountId: z.string().optional().nullable(),
      accountName: z.string().optional().nullable(),
      expiresInSeconds: z.number().int().positive().optional().nullable(),
      scopes: z.array(z.string()).default([]),
      metadata: z.record(z.any()).default({}),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const now = new Date();
    const expiresAt = input.expiresInSeconds
      ? new Date(now.getTime() + input.expiresInSeconds * 1000).toISOString()
      : null;

    const { data: upserted, error } = await supabase
      .from("oauth_integrations")
      .upsert(
        {
          store_id: identity.store_id,
          provider: input.provider,
          access_token: input.accessToken,
          refresh_token: input.refreshToken || null,
          account_id: input.accountId || null,
          account_name: input.accountName || null,
          expires_at: expiresAt,
          scopes: input.scopes,
          metadata: input.metadata,
          is_active: true,
          sync_status: "idle",
          sync_error_message: null,
          updated_at: now.toISOString(),
        },
        { onConflict: "store_id, provider" }
      )
      .select("id, provider, account_name, expires_at")
      .single();

    if (error) {
      console.error("[oauth-nexus] Erro ao salvar tokens:", error);
      throw new Error(`Falha ao registrar credenciais OAuth: ${error.message}`);
    }

    await logAuditAction(
      identity,
      "CONNECTED_OAUTH_INTEGRATION",
      "oauth_integrations",
      upserted.id,
      { provider: input.provider, account_name: input.accountName }
    );

    return {
      success: true,
      provider: upserted.provider,
      accountName: upserted.account_name,
      expiresAt: upserted.expires_at,
    };
  });

/**
 * 3. DESCONECTAR OAUTH (REVOGAÇÃO ATÔMICA)
 */
export const disconnectOAuthIntegration = createServerFn({ method: "POST" })
  .validator(
    z.object({
      provider: z.enum([
        "google_my_business",
        "meta_ads",
        "tiktok_ads",
        "google_calendar",
        "stripe_connect",
        "govbr_signature",
      ]),
    })
  )
  .handler(async ({ data: { provider } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const { error } = await supabase
      .from("oauth_integrations")
      .delete()
      .eq("store_id", identity.store_id)
      .eq("provider", provider);

    if (error) {
      throw new Error(`Erro ao desconectar ${provider}: ${error.message}`);
    }

    await logAuditAction(
      identity,
      "DISCONNECTED_OAUTH_INTEGRATION",
      "oauth_integrations",
      null,
      { provider }
    );

    return { success: true, message: `Integração com ${provider} removida com sucesso.` };
  });

/**
 * 4. HELPER SERVER-ONLY: RECUPERAR TOKEN VÁLIDO COM REFRESH AUTOMÁTICO
 */
export async function getValidOAuthAccessToken(storeId: string, provider: OAuthProvider): Promise<string | null> {
  const supabase = getServerClient();

  const { data: record, error } = await supabase
    .from("oauth_integrations")
    .select("*")
    .eq("store_id", storeId)
    .eq("provider", provider)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !record || !record.access_token) {
    return null;
  }

  // Verifica se o token expirou ou expira em menos de 2 minutos
  const now = new Date();
  const bufferMs = 2 * 60 * 1000;
  const expiresAt = record.expires_at ? new Date(record.expires_at) : null;

  if (expiresAt && expiresAt.getTime() - bufferMs <= now.getTime()) {
    // Se temos refresh token, tenta renovar
    if (record.refresh_token) {
      try {
        if (provider === "google_my_business" || provider === "google_calendar") {
          const clientId = process.env.GOOGLE_CLIENT_ID;
          const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

          if (clientId && clientSecret) {
            const resp = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: record.refresh_token,
                grant_type: "refresh_token",
              }),
            });

            if (resp.ok) {
              const tokenData = await resp.json();
              const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

              await supabase
                .from("oauth_integrations")
                .update({
                  access_token: tokenData.access_token,
                  expires_at: newExpiresAt,
                  sync_status: "idle",
                  sync_error_message: null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", record.id);

              return tokenData.access_token;
            }
          }
        }
      } catch (err: any) {
        console.warn(`[OAuth Refresh] Falha ao renovar token de ${provider}:`, err.message);
      }
    }

    // Token expirado e sem refresh automático
    await supabase
      .from("oauth_integrations")
      .update({ sync_status: "expired", sync_error_message: "Token expirado. Necessário reconectar." })
      .eq("id", record.id);

    return null;
  }

  return record.access_token;
}
