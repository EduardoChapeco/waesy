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

  // 2. Sincronização canônica e fallback com integration_credentials
  const { data: credentials, error } = await supabase
    .from("integration_credentials")
    .select("provider, token_payload")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .in("provider", ["meta_pixel", "google_analytics", "google_ads", "tiktok_pixel"]);

  if (error || !credentials) return results;

  for (const c of credentials) {
    if (c.provider === "meta_pixel" && c.token_payload?.pixel_id) {
      if (!results.some((r) => r.provider === "meta_pixel")) {
        results.push({ provider: "meta_pixel", pixelId: c.token_payload.pixel_id });
      }
    }
    if (c.provider === "google_analytics" && c.token_payload?.measurement_id) {
      if (!results.some((r) => r.provider === "google_analytics")) {
        results.push({ provider: "google_analytics", measurementId: c.token_payload.measurement_id });
      }
    }
    if (c.provider === "google_ads" && c.token_payload?.conversion_id) {
      if (!results.some((r) => r.provider === "google_ads")) {
        results.push({ provider: "google_ads", conversionId: c.token_payload.conversion_id });
      }
    }
    if (c.provider === "tiktok_pixel" && c.token_payload?.pixel_id) {
      if (!results.some((r) => r.provider === "tiktok_pixel")) {
        results.push({ provider: "tiktok_pixel", pixelId: c.token_payload.pixel_id });
      }
    }
  }

  return results;
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

// ============================================================================
// TESTES DE CONEXÃO REAL & DISPAROS ATIVOS (ZERO MOCKS)
// ============================================================================

/**
 * Valida a conexão ativa com a WhatsApp Cloud API da Meta.
 */
export const testWhatsAppCloudConnection = createServerFn({ method: "POST" })
  .validator(
    z.object({
      phoneNumberId: z.string().min(5, "Phone Number ID é obrigatório"),
      accessToken: z.string().min(10, "Access Token é obrigatório"),
      recipientPhone: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    try {
      // 1. Validação da conta e número na Meta Graph API
      const metaUrl = `https://graph.facebook.com/v19.0/${data.phoneNumberId}?fields=id,verified_name,display_phone_number,quality_rating`;
      const verifyRes = await fetch(metaUrl, {
        headers: {
          Authorization: `Bearer ${data.accessToken}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!verifyRes.ok) {
        const errJson = await verifyRes.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${verifyRes.status}`;
        return {
          success: false,
          message: `Falha na autenticação da Meta: ${errMsg}`,
        };
      }

      const metaData = await verifyRes.json();

      // 2. Se telefone de destinatário fornecido, tenta disparo de mensagem de teste
      let messageSent = false;
      if (data.recipientPhone) {
        const cleanPhone = data.recipientPhone.replace(/\D/g, "");
        const sendUrl = `https://graph.facebook.com/v19.0/${data.phoneNumberId}/messages`;
        const sendRes = await fetch(sendUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "text",
            text: {
              body: "🔔 [Waesy Platform] Conexão com o WhatsApp Cloud API verificada com sucesso!",
            },
          }),
          signal: AbortSignal.timeout(10000),
        });

        messageSent = sendRes.ok;
      }

      return {
        success: true,
        message: `WhatsApp conectado com sucesso! Número verificado: ${metaData.display_phone_number || metaData.id} (${metaData.verified_name || "Conta Comercial"}).`,
        details: {
          verifiedName: metaData.verified_name,
          displayPhoneNumber: metaData.display_phone_number,
          qualityRating: metaData.quality_rating,
          testMessageSent: messageSent,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Erro de comunicação com a Meta Graph API: ${err?.message || "Timeout"}`,
      };
    }
  });

/**
 * Valida o token e ambiente da API do Melhor Envio.
 */
export const testMelhorEnvioConnection = createServerFn({ method: "POST" })
  .validator(
    z.object({
      apiToken: z.string().min(10, "Token de API do Melhor Envio é obrigatório"),
      environment: z.enum(["sandbox", "production"]).default("production"),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const baseUrl =
      data.environment === "sandbox"
        ? "https://sandbox.melhorenvio.com.br/api/v2/me"
        : "https://melhorenvio.com.br/api/v2/me";

    try {
      const res = await fetch(baseUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${data.apiToken.replace(/^Bearer\s+/i, "")}`,
          "User-Agent": "Waesy Platform (contato@waesy.com)",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return {
          success: false,
          message: `Token inválido ou expirado (Melhor Envio HTTP ${res.status}).`,
        };
      }

      const me = await res.json();
      return {
        success: true,
        message: `Melhor Envio conectado! Conta: ${me.firstname || ""} ${me.lastname || ""} (${me.email || "OK"}).`,
        details: {
          name: `${me.firstname || ""} ${me.lastname || ""}`.trim(),
          email: me.email,
          balance: me.balance,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Erro ao conectar ao Melhor Envio: ${err?.message || "Timeout de rede"}`,
      };
    }
  });

/**
 * Valida credenciais de ERPs parceiros (Bling v3 ou Tiny v2).
 */
export const testErpConnection = createServerFn({ method: "POST" })
  .validator(
    z.object({
      provider: z.enum(["bling", "tiny"]),
      apiKey: z.string().min(5, "Chave de API / Token é obrigatório"),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    try {
      if (data.provider === "bling") {
        const res = await fetch("https://api.bling.com.br/v3/situacoes/modulos", {
          headers: {
            Authorization: `Bearer ${data.apiKey}`,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (res.status === 401 || res.status === 403) {
          return { success: false, message: "Token de API do Bling v3 inválido ou sem permissões suficientes." };
        }

        return {
          success: res.ok,
          message: res.ok ? "Conexão com Bling ERP v3 validada com sucesso!" : `Bling retornou status ${res.status}.`,
        };
      } else {
        // Tiny ERP v2
        const res = await fetch("https://api.tiny.com.br/api2/info.php", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: data.apiKey, formato: "json" }),
          signal: AbortSignal.timeout(10000),
        });

        const json = await res.json().catch(() => ({}));
        const status = json?.retorno?.status;
        if (status === "Erro") {
          const errDesc = json?.retorno?.erros?.[0]?.erro || "Token inválido";
          return { success: false, message: `Tiny ERP rejeitou a credencial: ${errDesc}` };
        }

        return { success: true, message: "Conexão com Tiny ERP validada com sucesso!" };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Erro ao conectar com ${data.provider.toUpperCase()}: ${err?.message || "Timeout"}`,
      };
    }
  });

/**
 * Dispara uma notificação ativa para cliente ou lojista via WhatsApp Cloud API.
 */
export async function sendWhatsAppNotification(params: {
  storeId: string;
  recipientPhone: string;
  messageText: string;
}): Promise<{ sent: boolean; reason?: string }> {
  try {
    const creds = await getActiveIntegrationPayload(params.storeId, "whatsapp_cloud_api");
    if (!creds || !creds.phone_number_id || !creds.access_token) {
      return { sent: false, reason: "WhatsApp Cloud API não configurada para esta loja." };
    }

    const cleanPhone = params.recipientPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return { sent: false, reason: "Número de telefone destinatário inválido." };
    }

    const sendUrl = `https://graph.facebook.com/v19.0/${creds.phone_number_id}/messages`;
    const res = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: params.messageText },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { sent: false, reason: errJson?.error?.message || `HTTP ${res.status}` };
    }

    return { sent: true };
  } catch (err: any) {
    console.warn("[whatsapp-notification] Falha ao enviar notificação WhatsApp:", err?.message);
    return { sent: false, reason: err?.message || "Erro desconhecido" };
  }
}

/**
 * Valida a conexão ativa com Gateways de Pagamento (Asaas, Mercado Pago, Stripe, Pagar.me).
 * Executa chamadas HTTP reais diretamente nas APIs oficiais dos provedores (Zero Mocks).
 */
export const testPaymentGatewayConnection = createServerFn({ method: "POST" })
  .validator(
    z.object({
      provider: z.enum(["asaas", "mercadopago", "stripe", "pagar_me"]),
      apiKey: z.string().min(5, "Chave de API / Token do Gateway é obrigatório"),
      environment: z.enum(["sandbox", "production"]).default("production"),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    try {
      if (data.provider === "asaas") {
        const baseUrl = data.environment === "sandbox"
          ? "https://sandbox.asaas.com/api/v3/myAccount"
          : "https://api.asaas.com/v3/myAccount";

        const res = await fetch(baseUrl, {
          method: "GET",
          headers: {
            "access_token": data.apiKey.trim(),
            "Content-Type": "application/json",
            "User-Agent": "Waesy Platform (contato@waesy.com)",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData?.errors?.[0]?.description || `HTTP ${res.status}`;
          return {
            success: false,
            message: `Falha na autenticação do Asaas (${data.environment}): ${errMsg}`,
          };
        }

        const account = await res.json();
        return {
          success: true,
          message: `Conexão com Asaas validada com sucesso! Conta: ${account.name || account.tradingName || "Conta Comercial"} (${account.email || "Ativa"}).`,
          details: {
            name: account.name || account.tradingName,
            email: account.email,
            cpfCnpj: account.cpfCnpj,
            environment: data.environment,
          },
        };
      }

      if (data.provider === "mercadopago") {
        const res = await fetch("https://api.mercadopago.com/users/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${data.apiKey.trim()}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return {
            success: false,
            message: `Mercado Pago rejeitou o Access Token: ${errData?.message || `HTTP ${res.status}`}`,
          };
        }

        const mpUser = await res.json();
        return {
          success: true,
          message: `Conexão Mercado Pago validada com sucesso! Vendedor: ${mpUser.nickname || mpUser.first_name || "Conta"} (${mpUser.site_id || "MLB"}).`,
          details: {
            nickname: mpUser.nickname,
            email: mpUser.email,
            country: mpUser.site_id,
          },
        };
      }

      if (data.provider === "stripe") {
        const res = await fetch("https://api.stripe.com/v1/account", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${data.apiKey.trim()}`,
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return {
            success: false,
            message: `Stripe rejeitou a chave secreta: ${errData?.error?.message || `HTTP ${res.status}`}`,
          };
        }

        const stripeAccount = await res.json();
        return {
          success: true,
          message: `Conexão Stripe validada com sucesso! Conta ID: ${stripeAccount.id} (${stripeAccount.country || "Global"}).`,
          details: {
            accountId: stripeAccount.id,
            country: stripeAccount.country,
            chargesEnabled: stripeAccount.charges_enabled,
          },
        };
      }

      if (data.provider === "pagar_me") {
        // Pagar.me v5 utiliza Basic Auth com a Secret Key como usuário e senha em branco
        const basicAuth = Buffer.from(`${data.apiKey.trim()}:`).toString("base64");
        const res = await fetch("https://api.pagar.me/core/v5/orders?page=1&size=1", {
          method: "GET",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            message: "Chave de API do Pagar.me inválida ou não autorizada.",
          };
        }

        return {
          success: true,
          message: "Conexão com Pagar.me validada com sucesso!",
          details: {
            status: res.status,
            authenticated: true,
          },
        };
      }

      return {
        success: false,
        message: "Provedor de pagamento não suportado para teste automático.",
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Erro de comunicação com o gateway ${data.provider}: ${err?.message || "Timeout de conexão"}`,
      };
    }
  });

